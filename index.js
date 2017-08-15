/**
 The MIT License (MIT)

 Copyright (c) 2015 ISBX

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

'uses strict';

var express = require('express')
  , stylus = require('stylus')
  , nib = require('nib')
  , glob = require('glob')
  , _ = require('lodash')
  , inflection = require('inflection')
  , fs = require('fs')
  , path = require('path')
  , setup = require('./server/setup')
  , relationalUpsert = require('./server/relational-upsert')
  , settingsEditor = require('./server/settings-editor')
  , customSort = require('./server/sort')
  , aws = require('./server/aws.js')
  , package = require('./package.json');
  ;


var environment = process.env.NODE_ENV || 'development'
  , srcDir = '/client'
  , app = express()
  , options = {}
  , config
  ;

module.exports = cms;

// load all loopback model JSON files
function loadLoopbackModels(loopbackModelsPath) {
  var models = {};
  var readDirRecursive = function(_path) {
    var files = fs.readdirSync(_path);
    for (var i in files) {
      var file = files[i];
      var filePath = path.resolve(_path,file);
      var stats = fs.statSync(filePath);
      if( stats.isDirectory() ) {
        readDirRecursive(filePath);
      } else {
        if (file.indexOf(".json") > -1) {
          var modelString = fs.readFileSync(filePath);
          try {
            var model = JSON.parse(modelString);
            if (!model.plural) {
              //add plural version if not exists
              model.plural = inflection.pluralize(model.name);
            }
            if (model.name) {
              models[model.name] = model;
            }
          } catch (e) {
            console.log("ERROR: parsing " + filePath);
          }
        }
      }
    }
  };

  readDirRecursive(loopbackModelsPath);

  //Add Base User, Role and RoleMappings
  var roleField = {
    "property": "role",
    "sourceModel": "User",
    "sourceKey": "id",
    "label": "Role",
    "type": "reference",
    "roles": ["SuperAdmin"],
    "options": {
      "model": "Role",
      "key": "id",
      "relationship": "Roles",
      "searchField": "description",
      "placeholder": "Select Roles",
      "multiple": true,
      "allowInsert": false,
      "matchTemplate": "{{ $item.description }}",
      "choiceTemplate": "{{ item.description }}",
      "junctionMeta": {
        "principalType": "USER"
      }
    }
  };

  models.User = {
    name: "User",
    plural: "Users",
    display: ["id", "email", "username", "password", roleField],
    properties: {
      id: { display: { label: "User ID", readonly: true } },
      email: { display: { label: "E-mail" } },
      username: { display: { label: "Username" } },
      password: { display: { label: "Password", type: "password" } }
    }
  };
  models.Role = {name: "Role", plural: "Roles"};
  models.RoleMapping = {name: "RoleMapping", plural: "RoleMappings"};

  //Expose inherited properties
  for(var i in models) {
    if( models[i].base && models[models[i].base] ) {
      models[i].properties = _.merge( models[ models[i].base ].properties, models[i].properties  );
    }
  }

  return models;
}

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

function overlayJade() {
  return function overlay(req, res, next) {
    if (req.path.match(/\.html$/)) {
      var jadePath = req.path.replace(/\.html$/, '.jade');
      fs.exists(__dirname + srcDir + jadePath, function(exists) {
        if (exists) {
          res.render(jadePath.slice(1));
        } else {
          next();
        }
      });
    } else {
      next();
    }
  };
}

function renderIndex(req, res) {
  var files = {};
  if (req.path.match(/\.html$/)) {
    res.status(404).send('Not found');
    return;
  }

  files.css = ['/css/main.css'];
  if (config.public.css) files.css.push(config.public.css);
  files.javascript = [app.mountpath + '/dev-templates.js'];
  glob(__dirname + srcDir + '/**/*.js', function(err, scripts) {
    //implement custom modules on the server-side rather than client-side
    files.javascript = _.map(config.public.modules, function(file) {
      if (file.charAt(0) == '/') {
        return app.mountpath + file;
      } else {
        return app.mountpath + '/' + file;
      }
    }).concat(files.javascript);

    if (environment.indexOf('development') > -1) {
      files.javascript = _.map(_.filter(scripts, function(file) {
        return !file.match(/\.spec\.js$/);
      }), function(file) {
        return file.replace(__dirname + srcDir, app.mountpath);
      }).concat(files.javascript);
    } else {
      files.javascript.unshift(app.mountpath + '/dist/app.js');
    }

    var buildConfig = require('./build.config.js');
    files.css = _.map(buildConfig.vendor_files.css.concat(files.css), function(file) {
      if (file.charAt(0) == '/') {
        return app.mountpath + file;
      } else {
         return app.mountpath + '/' + file;
      }
    });
    if (environment.indexOf('development') > -1) {
      files.javascript = _.map(buildConfig.vendor_files.js, function(file) {
        if (file.charAt(0) == '/') {
          return app.mountpath + file;
        } else {
          return app.mountpath + '/' + file;
        }
      }).concat(files.javascript);
    } else {
      files.javascript.unshift(app.mountpath + '/dist/vendor.js');
    }
    files.javascript.unshift(app.mountpath + '/config.js');
    res.render(__dirname + srcDir + '/index.jade', { version: package.version, files: files, config: config });
  });
}

/**
 * Loopback doesn't have User-RoleMapping-Role relationships setup be default
 * The CMS needs these relationships to setup role permissions and role access
 * @param loopbackApplication
 * @param config
 */
function setupAuthModelRoleRelationship(loopbackApplication, config) {

  var authModelName = config["public"].authModel;
  if (!authModelName) authModelName = "User"; //if no authModel specified, use default "User" model
  authModelName = inflection.singularize(authModelName);

  //create relationships in built-in models
  var RoleMapping = loopbackApplication.models.RoleMapping; //built-in loopback Model
  var Role = loopbackApplication.models.Role; //built-in loopback Model
  var User = loopbackApplication.models[authModelName]; //ISBX projects uses "Account" model that overrides the User base model
  if (!User) User = loopbackApplication.models.User; //default base to base User class
  if (RoleMapping) {
    RoleMapping.belongsTo(Role, {foreignKey: 'roleId', as: "Role"});
    RoleMapping.belongsTo(Role, {foreignKey: 'roleId', as: "role"}); //issue with hasManyThrough looks for lowercase account
    RoleMapping.belongsTo(User, {foreignKey: 'principalId', as: User.modelName});
    RoleMapping.belongsTo(User, {foreignKey: 'principalId', as: User.modelName.toLowerCase()}); //issue with hasManyThrough looks for lowercase account
  }
  if (Role) {
    Role.hasMany(RoleMapping, {foreignKey: 'roleId', as: 'RoleMappings'});
  }
  if (User) {
    User.hasMany(RoleMapping, {foreignKey: 'principalId', as: "RoleMappings"});
    User.hasMany(Role, {through: RoleMapping, foreignKey: 'principalId', as : "Roles"});
  }
  if (Role) Role.hasMany(User, {through: RoleMapping, as: inflection.pluralize(User.modelName)});

  //Need the below for relational-upsert.js
  User.settings.relations.RoleMappings = {
    model: "RoleMapping",
    type: "hasMany",
    foreignKey: "principalId"
  };
  User.settings.relations.Roles = {
    model: "Role",
    type: "hasMany",
    through: "RoleMapping",
    foreignKey: "principalId"
  };

}

/**
 * Starts the CMS and attaches to current Express Server
 * @param loopbackApplication
 * @param options
 * @returns {___anonymous_app}
 */
function cms(loopbackApplication, options) {
  var configPath = path.resolve(options.configPath) || __dirname + '/config.json';
  config = options.config ? options.config : require(configPath); //use config if passed in otherwise fall back to configPath
  setupAuthModelRoleRelationship(loopbackApplication, config);

  loopbackApplication.on('started', function() {
    //Perform this after application starts so that all models are loaded
    setup.setupDefaultAdmin(loopbackApplication, config);
  });

  //force browser cache refresh on custom UI modules after deployment (when service restarts)
  if (config.public.customModules) {
    var version = Math.ceil((new Date).getTime()/300000)*300000; //unique code within 5min window (for multi-web server instances)
    for (var i in config.public.customModules) {
      var customModule = config.public.customModules[i];
      if (!customModule.files) continue;
      for (var k in customModule.files) {
        var file = customModule.files[k];
        customModule.files[k] = file + '?v=' + version; //force browser to refresh local cache after deploying updates
      }
    }
  }

  //for CMS custom services provide context to loopbackApplication
  relationalUpsert.setLoopBack(loopbackApplication);
  customSort.setLoopBack(loopbackApplication);
  aws.setConfig(config.private);

  config.public.models = loadLoopbackModels(options.modelPath);

  app.set('views', __dirname + srcDir);
  app.set('view engine', 'jade');

  app.use(stylus.middleware({
    src: __dirname + srcDir,
    compile: compile
  }));

  // overlay client on top of public
  app.use(overlayJade());
  app.locals.pretty = true;

  app.use('/dist', express.static(__dirname + '/dist'));
  app.use('/vendor', express.static(__dirname + '/vendor'));

  app.get('/dev-templates.js', function(req, res) {
    res.setHeader('content-type', 'text/javascript');
    res.send('angular.module(\'templates-app\', []);angular.module(\'templates-common\', []);');
  });

  app.use(express.static(__dirname + srcDir));
  var appDir = path.dirname(require.main.filename); //Get the application root path
  if (config.private && config.private.src) {
    //Allows for custom static files outside the node module /client folder
    app.use(express.static(appDir + "/.." + config.private.src));
  }

  app.get('/config.js', function(req, res) {
    var localConfig = config;
    var stringsPath = path.dirname(configPath) + '/strings.json';
    fs.exists(stringsPath, function(exists) {
      if (exists) localConfig.public.strings = require(stringsPath);
      localConfig.public.apiBaseUrl = options.basePath;
      localConfig.public.cmsBaseUrl = app.mountpath;
      res.setHeader('content-type', 'text/javascript');
      res.send('window.config = ' + JSON.stringify(localConfig.public) + ';');
    });
  });

  if (config.allowUnsafeUpsert) {
    console.warn('Warning (isbx-loopback-cms): /model/save end point is running in compatibility mode, please update your ACL rules asap then set config.allowUnsafeUpsert to false.');
  } else if (typeof config.allowUnsafeUpsert === 'undefined' || config.allowUnsafeUpsert === null ) {
    console.warn('Warning (isbx-loopback-cms): /model/save end point is running in secure mode. This can potentially break your application if have not updated your ACL rules. For backwards compatibility, you may set config.allowUnsafeUpsert to true in your CMS Config if you are not ready to update your ACL rules yet.');
  }

  function validateToken(request, callback) {
    var AccessToken = loopbackApplication.models.AccessToken;
    var tokenString = request.body.__accessToken || request.query.access_token;
    AccessToken.findById(tokenString, function(err, token) {
      if (err || !token) { return callback(err); }
      token.validate(function(err, isValid) {
        return callback(err, isValid, token);
      });
    });
  }

  /**
   * Save a model hierarchy; req.body contains a model and its relationship data
   */
  app.put('/model/save', function(req, res) {
    var ACL = loopbackApplication.models.ACL;

    validateToken(req, function(err, isValid, token) {
      if (err) { return res.status(500).send(err); }
      if (!isValid) { return res.status(403).send('Forbidden'); }

      var data = req.body;
      var context = {
        accessToken: token,
        model: data.__model,
        property: data.__id ? 'updateAttributes' : 'create',
        modelId: data.__id || null
      };

      function upsertData() {
        relationalUpsert.upsert(data, function(error, response) {
          if (error) {
            res.status(500).send(error);
          } else {
            res.send(response);
          }
        });
      }

      if (config.public.isUnsafeUpsert) {
        upsertData();
      } else {
        ACL.checkAccessForContext(context, function(err, acl) {
          if (err) { return res.status(500).send(err); }
          if (acl.permission === 'DENY') { return res.status(403).send('Forbidden'); }
          upsertData();
        });
      }
    });
  });


  /**
   * get an array from req.body containing an updated sort order for a set of models
   * req.body = {
   *  model: "Name of the Model",
   *  key: "The Primary Key for the Model",
   *  sortField: "The field in the Model used for sorting (integer field)",
   *  sortData: [Array of ids (PK)]
   * }
   */
  app.post('/model/sort', function(req, res) {
    //TODO: validate ACL
    validateToken(req, function(err, isValid) {
      if (err) { return res.status(500).send(err); }
      if (!isValid) { return res.status(403).send('Forbidden'); }

      var model = req.body["model"];
      var key = req.body["key"];
      var sortField = req.body["sortField"];
      var sortData = req.body["sortData"];
      customSort.sort(model, key, sortField, sortData, function(error, response) {
        if (error) {
          res.status(500).send(error);
        } else {
          res.send(response);
        }
      });
    });
  });

  /**
   * Generate AWS S3 Policy and Credentials
   */
  app.get('/aws/s3/credentials', function(req, res) {
    //TODO: validate ACL
    validateToken(req, function(err, isValid) {
      if (err) { return res.status(500).send(err); }
      if (!isValid) { return res.status(403).send('Forbidden'); }

      aws.getS3Credentials(req.query["path"], req.query["fileType"], function(error, credentials) {
        if (error) {
          res.status(500).send(error);
        }
        res.send(credentials);
      });
    });
  });

  /**
   * API to save config.json navigation
   */
  app.post('/settings/config/nav', function(req, res) {
    //TODO: validate ACL
    validateToken(req, function(err, isValid) {
      if (err) { return res.status(500).send(err); }
      if (!isValid) { return res.status(403).send('Forbidden'); }

      var nav = req.body;
      settingsEditor.setNav(configPath, nav);
      res.send(true);
    });
  });

  app.get('*', renderIndex);

  return app;
}
