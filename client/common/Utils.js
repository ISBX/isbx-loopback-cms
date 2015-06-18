angular.module('dashboard.Utils', [
  'dashboard.Config'
])

.service('Utils', function(Config, $http, $q) {
  
  var apiRequests = {}; //stores active http requests using method+path as key
  
  /**
   * Allows for cancelling prior API calls matching the method + path
   */
  this.apiCancel = function(method, path) {
    var canceller = apiRequests[method+":"+path];
    if (canceller && canceller.resolve) {
      canceller.resolve();
    }
    delete apiRequests[method+":"+path];
  };
  
  /**
   * Implements an http call and returns promise
   */
  this.apiHelper = function(method, path, data, params) {
    var deferred = $q.defer();
    params = params || {};
    params.method = method;
    if (path[0] == "/") {
      params.url = path;
    } else {
      params.url = Config.apiBaseUrl + path;
    }

    if (method == 'POST' || method == 'PUT') {
      params.data = data;
    } else {
      params.params = data;
    }
    
    apiRequests[method+":"+path] = deferred;
    params.timeout = deferred.promise; 
    $http(params)
      .success(function(response) {
        deferred.resolve(response);
      })
      .error(function(response) {
        deferred.reject(response);
      });

    return deferred.promise; 
  };
});
