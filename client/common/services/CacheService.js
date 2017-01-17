angular.module('dashboard.services.Cache', [
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies'
])

.service('CacheService', function() {

  this.KEY_DELIMITER = '-';

  this.get = function(key) {
    if(!localStorage.getItem(key)) return null;
    try {
        var cached = JSON.parse(localStorage.getItem(key));
        return cached;
    }
    catch (e) {
        return null;
    }
  };

  this.set = function(key,value) {
    try{
        localStorage.setItem(key,JSON.stringify(value));
    } catch(e) {
        this.remove(key);
    }
  };

  this.remove = function(key) {
    localStorage.removeItem(key);
  };

  this.getKeyForAction = function(action,params) {
    var key = action.options.model + this.KEY_DELIMITER + action.route;
    if (action.options.api) key = action.options.api;
    if(params) key += this.KEY_DELIMITER + JSON.stringify(params);
    return key;
  }

  this.clear = function(model) {
    var key = model;
    var regex = new RegExp('^'+key)
    for(var k in localStorage)
    {
        if(regex.test(k))
        {
            this.remove(k);
        }
    }
  };

  this.reset = function()
  {
    localStorage.clear();
    localStorage['lastActive'] = new Date(); //for session tracking
  }
})

;
