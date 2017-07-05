angular.module('dashboard.Utils', [
  'dashboard.Config'
])

.service('Utils', function(Config, $http, $q) {
  "ngInject";

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
      if (Config.apiBaseUrl && Config.apiBaseUrl[Config.apiBaseUrl.length-1] != '/' && path[path.length-1] != '/') {
        Config.apiBaseUrl += '/';
      }
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
      .then(function(response) {
        deferred.resolve(response.data);
      }, function(response) {
        deferred.reject(response.data);
      });

    return deferred.promise; 
  };
});

//JQuery >= 2.2 deprecated this function
$.swap = function (elem, options, callback, args) {
  var ret, name, old = {};

  // Remember the old values, and insert the new ones
  for (name in options) {
    old[name] = elem.style[name];
    elem.style[name] = options[name];
  }

  ret = callback.apply(elem, args || []);

  // Revert the old values
  for (name in options) {
    elem.style[name] = old[name];
  }

  return ret;
};