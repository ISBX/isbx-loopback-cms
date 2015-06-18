angular.module('dashboard.services.GeneralModel', [
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies'
])

.service('GeneralModelService', function($cookies, $http, Config, Utils) {

  /**
   * Returns a list of models given filter params (see loopback.io filters)
   */
  this.list = function(model, params) {
    var apiPath = model + '?access_token=' + $cookies.accessToken;
    Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath, params);
  };
  
  /**
   * Returns the total number of records for a given model
   */
  this.count = function(model, params) {
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
    var apiPath = model + '/count?access_token=' + $cookies.accessToken;
    Utils.apiCancel('GET', apiPath); //cancels any prior calls to method + path
    return Utils.apiHelper('GET', apiPath, params);
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
   * Get the model data for a particular ID
   */
  this.get = function(model, id, params) {
    var apiPath = model + '/' + id + '?access_token=' + $cookies.accessToken;
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
  
  /**
   * Helper POST method
   */
  this.post = function(path, params) {
    var apiPath = path + '?access_token=' + $cookies.accessToken;
    return Utils.apiHelper('POST', apiPath, params);
  };
    

});

