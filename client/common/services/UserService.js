angular.module('dashboard.services.User', [
  'dashboard.Config',
  'dashboard.Utils'
])

.service('UserService', function(Config, Utils, $http, $q, $rootScope) {
  
  this.register = function(email, password) {
	  var authModel = "Users";
	  if (config.authModel) authModel = config.authModel; 
	  return Utils.apiHelper('POST', authModel, { email: email, password: password });
  };
  
  this.resetPassword = function(email, password) {
    var authModel = "Users";
    if (config.authModel) authModel = config.authModel; 
    return Utils.apiHelper('POST', authModel + "/reset", { email: email });
  };
});
