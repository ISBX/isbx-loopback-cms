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

var app;
var cmsConfig;
var inflection = require('inflection');

var RELATIONSHIP_SINGLE = "RELATIONSHIP_SINGLE";
var RELATIONSHIP_MANY = "RELATIONSHIP_MANY";

/**
 * Performs a recursive upsert into the data source via loopback API calls
 * - Upsert relationship data models first
 * - Upsert main model data last
 * @param data
 *  - data represents a hierarchical structure based on loopback's model relationships (i.e. filter[include])
 *  - data must contain __model and __id properties defining the main model's name and PK (see GeneralModelService.js save())
 * @param callback
 *  The callback with [error, result] params
 */
function upsert(data, context, callback) {
  var model = app.models[data.__model];
  if (!model) {
    var message = "model not found in post body __model = '"+data.__model+"'";
    console.error("ERROR: " + message);
    callback({ error: message });
    return;
  }
  
  //Get all relationship keys by checking for nested objects
  var keys = Object.keys(data);
  var relationshipKeys = [];
  var relationshipManyToManyKeys = [];
  for (var i in keys) {
    var relationshipKey = keys[i];
    var relationshipData = data[relationshipKey];
    if (!relationshipData || typeof relationshipData !== 'object') continue;
    if (relationshipData instanceof Array) {
      //Store Many-to-Many relationship keys separately so we can process them last
      relationshipManyToManyKeys.push(relationshipKey);
    } else {
      //Store One-to-Many relationship keys separately so we can process them first
      relationshipKeys.push(relationshipKey);
    }
  }
  
  start(model, data, relationshipKeys, relationshipManyToManyKeys, context, function(error, result) {
    callback(error, result);
  });
  
}

/**
 * Start the recursive upsert
 * @param model
 * @param data
 * @param callback
 */
function start(model, data, relationshipKeys, relationshipManyToManyKeys, context, callback) {
  var index = 0;
  next(RELATIONSHIP_SINGLE, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, function(error, count) {
    if (error) return callback(error);
    //After inserting all one-to-many relationships, perform the primary model upsert
    model.upsert(data, function(error, result) {
      if (error) {
        console.error(error);
        callback(error);
      } else {
        //make sure data contains the primary key ID value
        var modelId = result[model.getIdName()];
        data[model.getIdName()] = modelId;
        
        //After upserting main model data, process all many-to-many relationship data last 
        index = 0;
        next(RELATIONSHIP_MANY, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, function(error, count) {
          callback(error, result); //finished upserting all relationship data and model data 
        });
      }
    });
  });
}

/**
 * Handle recursing through the relationshipKeys
 * @param processRelationshipType
 *  The type of relationship to process
 * @param model
 * @param data
 * @param index
 * @param callback
 */
function next(processRelationshipType, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, callback) {
  
  var length = processRelationshipType == RELATIONSHIP_SINGLE ? relationshipKeys.length : relationshipManyToManyKeys.length;
  if (index >= length) {
    //Finished processing all relationship data for the given type
    callback(null, index);
    return;
  }

  var relationshipKey;
  if (processRelationshipType == RELATIONSHIP_SINGLE) {
    relationshipKey = relationshipKeys[index];
  } else {
    relationshipKey = relationshipManyToManyKeys[index];
  }
  var relationshipData = data[relationshipKey];
  var relationSettings = model.settings.relations[relationshipKey];
  if (!relationSettings) {
    console.warn("WARNING: no relationship found for relationshipKey = " + relationshipKey);
    index++;
    next(processRelationshipType, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, callback);
    return;
  }
  var relationshipModel = app.models[relationSettings.model];
  if (!relationshipModel) {
    console.warn("WARNING: cannot resolve relationship model = " + relationSettings.model);
    index++;
    next(processRelationshipType, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, callback);
    return;
  }
  if (processRelationshipType == RELATIONSHIP_SINGLE) {
    //upsert the one-to-many relationship model data before upserting main model data 
    function executeUpsert() {
      relationshipModel.upsert(relationshipData, function(error, result) {
        if (error) {
          console.error(error);
          callback(error);
        } else {
          var id = result[relationshipModel.getIdName()];
          //assign the FK ID back to main model
          data[relationSettings.foreignKey] = id;
          delete data[relationshipKey]; //make sure to remove relationship data from the main model (otherwise upsert won't work for the relationshipKey)
          index++;
          next(RELATIONSHIP_SINGLE, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, callback);
        }
      });
    }
    var id = relationshipModel.getIdName();
    var ctx = {
      accessToken: context.accessToken,
      model: relationSettings.model,
      property: relationshipData[id] ? 'updateAttributes' : 'create',
      modelId: relationshipData[id] || null,
      remotingContext: context.remotingContext
    };
    if (cmsConfig.public.isUnsafeUpsert) {
      executeUpsert();
    } else {
      app.models.ACL.checkAccessForContext(ctx, function(err, acl) {
        if (err) return callback(err);
        if (acl.permission === 'DENY') {
          if (!relationshipModel.settings.strictRelationalUpsert) return callback();
          var error = new Error('Forbidden.');
          error.status = 403;
          return callback(error);
        }
        executeUpsert();
      });
    }
  } else if (processRelationshipType == RELATIONSHIP_MANY) {
    //relationshipData is an Array of hasMany values (a many-to-many relationship)
    function executeUpsertManyToMany() {
      upsertManyToMany(model, data, relationshipKey, relationshipData, relationSettings, function(error, result) {
        if (error) {
          console.error(error);
          callback(error);
        } else {
          delete data[relationshipKey]; //make sure to remove relationship data from the main model (otherwise upsert won't work for the relationshipKey)
          index++;
          next(RELATIONSHIP_MANY, model, data, index, relationshipKeys, relationshipManyToManyKeys, context, callback);
        }
      });
    }

    var id = relationshipModel.getIdName();
    var ctx = {
      accessToken: context.accessToken,
      model: relationSettings.model,
      property: relationshipData[id] ? 'updateAttributes' : 'create',
      modelId: relationshipData[id] || null,
      remotingContext: context.remotingContext
    };
    if (cmsConfig.public.isUnsafeUpsert) {
      executeUpsertManyToMany();
    } else {
      app.models.ACL.checkAccessForContext(ctx, function(err, acl) {
        if (err) return callback(err);
        if (acl.permission === 'DENY') {
          if (!relationshipModel.settings.strictRelationalUpsert) return callback();
          var error = new Error('Forbidden.');
          error.status = 403;
          return callback(error);
        }
        executeUpsertManyToMany();
      });
    }
  }
}

/**
 * In the situation where a model contains an array of relationship data this method
 * will first remove all related records and insert new records. This is used in a
 * many-to-many relationship situation. 
 * @param model
 *  The looback.io PersistedModel object
 * @param data
 *  The JSON object containing the data to update
 * @param relationshipKey
 *  The relationshipKey as defined in the Model JSON 'relations' object
 * @param relationshipData
 *  An Array of data to be inserted into the relationship junction table
 * @param relationSettings
 *  The relation settings from the Model JSON
 * @param callback
 */
function upsertManyToMany(model, data, relationshipKey, relationshipData, relationSettings, callback) {
  if (!relationSettings.through) {
    var message = "upsertManyToMany cannot proceed as no relations." + relationshipKey + ".through exists in " + model.name + " JSON definition";
    console.error("ERROR: " + message);
    //callback({ error: message });
    callback();
    return;
  }
  
  var junctionSettings = model.settings.relations[relationSettings.through];
  if (!junctionSettings) junctionSettings = model.settings.relations[inflection.pluralize(relationSettings.through)];
  if (!junctionSettings) {
    var message = "upsertManyToMany cannot proceed as no model.settings.relations." + relationSettings.through + " or "+ inflection.pluralize(relationSettings.through) +" exists in " + model.name + " JSON definition";
    console.error("ERROR: " + message);
    //callback({ error: message });
    callback();
    return;
  }
  
  //Get the field key for the many-to-many relationship so we know what to insert into the Junction Table
  var junctionModel = app.models[junctionSettings.model];
  var junctionRelations = junctionModel.settings.relations;
  var junctionRelationIdKey = null;
  var keys = Object.keys(junctionRelations);
  for (var i in keys) {
    var key = keys[i];
    var junctionRelationshipSettings = junctionRelations[key];
    if (junctionRelationshipSettings.model == relationSettings.model) {
      junctionRelationIdKey = junctionRelationshipSettings.foreignKey;
      break;
    }
  }
  
  if (!junctionRelationIdKey) {
    var message = "upsertManyToMany cannot proceed as no relation named '" + relationSettings.model + "' exists in " + junctionSettings.model + " JSON definition";
    console.error("ERROR: " + message);
    callback({ error: message });
    return;
  }
  
  //Get Junction Table's Primary Model ID Field Key
  var modelIdKey = model.getIdName();
  var junctionModelIdKey = junctionSettings.foreignKey;
  var modelId = data[modelIdKey];
  
  if (!modelId) {
    var message = "upsertManyToMany cannot proceed as no data[modelIdKey] found for modelIdKey = '" + modelIdKey + "'";
    console.error("ERROR: " + message);
    callback({ error: message });
    return;
  }
  
  //Get Relation Mode's Primary Model ID Field Key
  var relatedModel = app.models[relationSettings.model];
  var relationIdKey = relatedModel.getIdName();
  
  //FIRST Delete Any existing Primary Model's records from junction table
  var where = {};
  where[junctionModelIdKey] = modelId;
  for (var i in relationshipData) {
    var junctionData = relationshipData[i];
    if (junctionData && junctionData[relationIdKey]) {
      //delete only the junction table records matching the junction meta (this is import as not to delete records
      //that should not be deleted (i.e. when 2 ModelFieldReference fields exists with different junctionMeta values)
      if (junctionData.junctionMeta) {
        var keys = Object.keys(junctionData.junctionMeta);
        for (var i in keys) {
          var key = keys[i];
          if (typeof where[key] !== 'undefined' && where[key] != junctionData.junctionMeta[key]) {
            if (typeof where[key] === 'string' || typeof where[key] === 'number') {
              where[key] = {inq: [where[key]]};
            }
            where[key]['inq'].push(junctionData.junctionMeta[key]);
          } else {
            where[key] = junctionData.junctionMeta[key]; //meta data for junction table
          }
        }
      }
    }
  }

  junctionModel.destroyAll(where, function(error) {
    //WARNING: Ignore errors here in case of referential integrity issues (however, may cause duplicates if no unique indexes are defined in junction table)
    //SECOND Start inserting new records
    var index = 0;
    nextManyToMany(junctionModel, junctionModelIdKey, junctionRelationIdKey, relationIdKey, modelId, relationshipData, index, callback);

  });
  
  
}

/**
 * The recursive function to process through the array of relationship data
 * @param junctionModel
 * @param junctionModelIdKey
 * @param junctionRelationIdKey
 * @param relationIdKey
 * @param modelId
 * @param relationshipData
 * @param index
 * @param callback
 */
function nextManyToMany(junctionModel, junctionModelIdKey, junctionRelationIdKey, relationIdKey, modelId, relationshipData, index, callback) {
  if (index >= relationshipData.length) {
    callback(null, relationshipData.length);
    return;
  }
  
  var data = relationshipData[index];
  if (data && data[relationIdKey]) {
    var junctionData = {};
    junctionData[junctionModelIdKey] = modelId;
    junctionData[junctionRelationIdKey] = data[relationIdKey];
    if (data.junctionMeta) {
      var keys = Object.keys(data.junctionMeta);
      for (var i in keys) {
        var key = keys[i];
        junctionData[key] = data.junctionMeta[key]; //meta data for junction table
      }
    }
    junctionModel.upsert(junctionData, function(error, result) {
      //WARNING: Ignoring errors in case insert duplicate record
      index++;
      nextManyToMany(junctionModel, junctionModelIdKey, junctionRelationIdKey, relationIdKey, modelId, relationshipData, index, callback);
    });
  } else {
    console.warn("WARNING: cannot resolve data[relationIdKey] where relationIdKey = " + junctionRelationIdKey);
    index++;
    nextManyToMany(junctionModel, junctionModelIdKey, junctionRelationIdKey, relationIdKey, modelId, relationshipData, index, callback);

  }
}

module.exports = {
  setLoopBack: function(loopback) {
    app = loopback;
  },
  setConfig: function(config) {
    cmsConfig = config;
  }
};

module.exports.upsert = upsert;
