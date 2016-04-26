angular.module('dashboard.services.Session', [
  'dashboard.Utils',
  'dashboard.services.User',
  'ngCookies'
])

.service('SessionService', function($cookies, $cookieStore, $http, $q, UserService, Config, Utils) {
  var session = null;
  function init() {
    var sessionStr = $cookies.session;
    if (sessionStr) {
      session = JSON.parse(sessionStr);
    }
  }

  this.logIn = function(email, password) {
	  var authModel = "Users";
	  if (config.authModel) authModel = config.authModel;
       return Utils.apiHelper('POST', authModel + '/login?include=user', { email: email, password: password })
	      .then(function(userInfo) {
	        return Utils.apiHelper('GET', 'Roles?access_token=' + userInfo.id)
	          .then(function(roles) {
	            return Utils.apiHelper('GET', 'RoleMappings?filter[where][principalId]='+userInfo.userId+'&access_token=' + userInfo.id)
	              .then(function(roleMappings) {
	                  session = userInfo;
	                  $cookies.username = userInfo.user.username;
	                  $cookies.userId = userInfo.userId;
	                  $cookies.accessToken = userInfo.id;
	                  $cookies.session = JSON.stringify(session);
	                  //get role name and description
	                  for (var i in roleMappings) {
	                    var roleMap = roleMappings[i];
	                    var role = _.find(roles, {id: roleMap.roleId});
	                    if (role) {
	                      roleMap.name = role.name;
	                      roleMap.description = role.description;
	                    }
	                  }
	                  $cookies.roles = JSON.stringify(roleMappings);
	                  return userInfo;

	              })["catch"](function() {
	                  $cookies.session = null;
	                  return $q.reject(arguments);
	                });

	          })["catch"](function() {
	              $cookies.session = null;
	              return $q.reject(arguments);
	            });
	        })
	      ["catch"](function() {
	          $cookies.session = null;
	          return $q.reject(arguments);
	        });
  };

  this.logOut = function() {
  	var authModel = "Users";
  	if (config.authModel) authModel = config.authModel;
	  var accessToken = $cookies.accessToken;
	  $cookieStore.remove('username');
	  $cookieStore.remove('userId');
	  $cookieStore.remove('accessToken');
	  $cookieStore.remove('roles');
	  $cookieStore.remove('session');
	  session = null;
	  return Utils.apiHelper('POST', authModel + '/logout?access_token=' + accessToken);
  };

  this.getAuthToken = function() {
    return session && session.id;
  };

  init();
});
