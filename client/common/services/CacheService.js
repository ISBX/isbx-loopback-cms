angular.module('dashboard.services.Cache', [
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies'
])

.service('CacheService', function() {
  var memoryStorage = MemoryStorage();

  this.KEY_DELIMITER = '-';

  this.get = function(key) {
    if (memoryStorage.getItem(key)) return memoryStorage.getItem(key);
    if (!localStorage.getItem(key)) return null;
    try {
      var cached = JSON.parse(localStorage.getItem(key));
      return cached;
    } catch(e) {
      return null;
    }
  };

  this.set = function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch(e) {
      this.remove(key);
      if (e.code === 22) { // check for quota exceeded error code when in safari private browsing to not store wrong format of value in memoryStorage
        memoryStorage.setItem(key, value);
      }
    }
  };

  this.remove = function(key) {
    if (localStorage && localStorage.length > 0) {
      localStorage.removeItem(key);
    } else {
      memoryStorage.removeItem(key);
    }
  };

  this.getKeyForAction = function(action, params) {
    var key = action.options.model + this.KEY_DELIMITER + action.route;
    if (action.options.api) key = action.options.api;
    if (params) key += this.KEY_DELIMITER + JSON.stringify(params);
    return key;
  };

  this.clear = function(model) {
    var key = model;
    var regex = new RegExp('^' + key);
    var storage = localStorage && localStorage.length > 0 ? localStorage : memoryStorage;
    for (var k in storage) {
      if (regex.test(k)) {
        this.remove(k);
      }
    }
  };

  this.reset = function() {
    localStorage.clear();
    memoryStorage.clear();
    this.set('lastActive', new Date()); //for session tracking
  };
})

;
