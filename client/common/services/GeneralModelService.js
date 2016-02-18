angular.module('dashboard.services.GeneralModel', [
  'dashboard.services.FileUpload',
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies'
])

.service('GeneralModelService', function($cookies, $http, $q, Config, Utils, FileUploadService) {

  var self = this;

  /**
   * Returns a list of models given filter params (see loopback.io filters)
   */
  this.list = function(apiPath, params) {
    var apiPath = apiPath + (apiPath.indexOf('?')>-1 ? '&' : '?') + 'access_token=' + $cookies.accessToken;
    Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath, params);
  };
  
  /**
   * Returns the total number of records for a given model
   */
  this.count = function(apiPath, params) {
    if( apiPath.indexOf('?')>-1 ) apiPath = apiPath.substr(0,apiPath.indexOf('?'));
    var keys = Object.keys(params);
    for (var i in keys) {
      var key = keys[i];
      if (key.indexOf("filter[where]") > -1) {
        newKey = key.replace("filter[where]", "where"); //count REST API uses where instead of filter[where]
        params[newKey] = params[key]; 
      } else if (key == "filter") {
        //TODO: parse through the filter JSON string looking for the where clause
      }
    }
    apiPath = apiPath + '/count?access_token=' + $cookies.accessToken;
    Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath, params);
  };

  /**
   * Get the model data for a particular ID
   */
  this.get = function(apiPath, id, params) {
    if(apiPath.indexOf("{id}")>-1) {
      apiPath = apiPath.split('?');
      apiPath = apiPath[0].replace("{id}",id) + '?access_token=' + $cookies.accessToken + (apiPath[1] ? '&' + apiPath[1] : '');
    } else {
      apiPath = apiPath + '/' + id + '?access_token=' + $cookies.accessToken;
    }
    console.log(apiPath)
    //Below Utils.apiCancel() call appears to break when getting user profile
    //Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath, params);
  };

  /**
   * For loopback.io hasMany relationship (see ModelFieldReference directive)
   */
  this.getMany = function(sourceModel, sourceId, relationship) {
    var path = sourceModel + '/' + sourceId + '/' + relationship;
    var apiPath = path + '?access_token=' + $cookies.accessToken;
    Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath);
  };


  this.sort = function(model, key, sortField, sortData) {
    var path = Config.serverParams.cmsBaseUrl + '/model/sort';
    var params = {
        model: model,
        key: key,
        sortField: sortField,
        sortData: sortData
    };
    return Utils.apiHelper('POST', path, params);
  };
  
  /**
   * Removes a record 
   */
  this.remove = function(model, id) {
    var path = model;
    if (id) {
      path = path + '/' + id;
    }
    path += '?access_token=' + $cookies.accessToken;
    return Utils.apiHelper('DELETE', path, {});

  };

  /**
   * Helper POST method
   */
  this.post = function(path, params) {
    var apiPath = path + '?access_token=' + $cookies.accessToken;
    return Utils.apiHelper('POST', apiPath, params);
  };


  /**
   * Upserts a record and its relationship data if provided
   * The CMS exposes the /model/save API that can take in model data
   * in hierarchical format
   */
  this.save = function(model, id, params) {
    var path = Config.serverParams.cmsBaseUrl + '/model/save';
    params.__model = model;
    params.__id = id;
    params.__accessToken = $cookies.accessToken;
    return Utils.apiHelper('PUT', path, params);
  };

  /**
   * Previously this was inside ModelEdit.js. It has been abstracted out and placed
   * in GeneralModelService so that projects that want to implement their own model edit UI
   * can call this method to perform file uploads and recursive model saves
   * @param model
   * @param id
   * @param data
   * @returns {promise.promise|Function|deferred.promise|{then, catch, finally}|*|r.promise}
   */
  this.saveWithFiles = function(model, id, data) {
    var modelDef = Config.serverParams.models[model];
    var deferred = $q.defer();

    var uploadImages = function(callback) {
      if (data.__ModelFieldImageData) {
        deferred.notify({message: "Uploading image file(s)", progress: 0});

        //First Upload Images and set Image Meta Data
        FileUploadService.uploadImages(data.__ModelFieldImageData)
          .then(function(result) {
            self.assignImageFileMetaData(modelDef, data, result);
            deferred.notify({message: "Saving...", progress: 0});
            callback();
          }, function(error) {
            console.log(error);
            deferred.reject(error);
          }, function(progress) {
            deferred.notify({progress: progress});
          });
      } else {
        callback();
      }
    };

    var uploadFiles = function(callback) {
      //Uploading Non-Image Files (Look for fields with file type to upload in data)
      var index = 0;
      var keys = Object.keys(data);
      var nextFile = function() {
        if (index >= keys.length) {
          callback();
          return;
        }
        var key = keys[index];
        var field = data[key];
        if (field && typeof field === 'object' && field.file) {
          //Found file so upload it
          deferred.notify({message: "Uploading file: " + field.file.name});
          FileUploadService.uploadFile(field.file, field.path)
            .then(function(result) {
              data[key] = result.fileUrl;
              index++;
              nextFile();
            }, function(error) {
              if (typeof error === "object" && error.error) {
                deferred.reject("The file being uploaded is not an accepted file type for this patient form. Please contact a system administrator for assistance.");
              } else {
                deferred.reject(error);
              }
            }, function(progress) {
              deferred.notify({progress: progress});
            });
        } else {
          index++;
          nextFile();
        }
      };
      nextFile();
    };

    uploadImages(function() {
      uploadFiles(function() {
        //Loop through fields and check for forced default fields
        self.checkDefaultValues(modelDef, data);
        self.save(model, id, data).then(
          function(result) {
            deferred.resolve(result);
          },
          function(error) {
            deferred.reject(error);
          });
      });
    });

    return deferred.promise;
  };

  /**
   * Assigns Meta Data returned from FileUploadService.uploadImages
   * @param modelDef
   * @param data
   * @param results
   */
  this.assignImageFileMetaData = function(modelDef, data, result) {
    //console.log("finished uploading");
    //console.log(JSON.stringify(result, null, '  '));

    //Loop through results and get URLs into scope.data
    var keys = Object.keys(result);
    for (var i in keys) {
      var fieldKey = keys[i]; //key represents the model field (column) name

      //Check the fieldKey properties
      var property = modelDef.properties[fieldKey]; //see model json properties
      var options = property.display.options;
      if (!options || !options.model || !options.relationship) {
        //store URL directly in model field value
        data[fieldKey] = result[fieldKey]; //response[key] is the image url
      } else {
        //Create a nested object in scope.data to mimic the relationship data structure for filter[include] in loopback.io
        if (!data[options.relationship]) data[options.relationship] = {};
        var mediaRelationshipModel = data[options.relationship];
        if (data[fieldKey]) mediaRelationshipModel[options.key] = data[fieldKey]; //assign the ID value if editing (i.e. mediaId)
        mediaRelationshipModel[options.urlKey] = result[fieldKey][options.urlKey];

        //Add export images
        var exportKeys = Object.keys(options.export);
        for (var j in exportKeys) {
          var exportKey = exportKeys[j];
          mediaRelationshipModel[exportKey] = result[fieldKey][exportKey];
        }

        //Add filename
        if (data.__ModelFieldImageData[fieldKey] && data.__ModelFieldImageData[fieldKey][options.urlKey]) {
          var fileInfo = data.__ModelFieldImageData[fieldKey][options.urlKey];
          var file = fileInfo ? fileInfo.file : {}; //First Image in __ModelFieldImageData will have { path, file } subsequent exports will just be the file
          mediaRelationshipModel.filename = file.name;
        } else {
          mediaRelationshipModel.filename = "unknown";
        }
        //Add any specified meta data field
        if (options.meta) {
          var metaKeys = Object.keys(options.meta);
          for (var k in metaKeys) {
            var metaKey = metaKeys[k];
            mediaRelationshipModel[metaKey] = options.meta[metaKey];
          }
        }
      }

    }

    //Finally delete the __ModelFieldImageData
    delete data.__ModelFieldImageData;
  };

  /**
   * Loop through fields and check for forced default fields
   * Called by ModelEdit.js and saveWithFiles()
   * @param modelDef
   * @param data
   */
  this.checkDefaultValues = function(modelDef, data) {
    var keys = Object.keys(modelDef.properties);
    for (var i in keys) {
      var key = keys[i];
      var property = modelDef.properties[key];
      if ((property && property.display) && (!data[key] || property.display.forceDefaultOnSave)) {
        if (typeof property["default"] !== 'undefined') data[key] = property["default"];
        if (typeof property.display.evalDefault !=='undefined')data[key] = eval(property.display.evalDefault);
      }
    }

  };

});

