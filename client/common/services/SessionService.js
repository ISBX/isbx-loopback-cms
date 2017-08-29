angular.module('dashboard.services.Session', [
  'dashboard.Utils',
  'dashboard.services.User',
  'ngCookies'
])

.service('SessionService', function($cookies, $cookieStore, $q, UserService, Config, Utils, DashboardService) {
  "ngInject";

  var self = this;
  
  var session = null;
  function init() {
    var sessionStr = $cookies.get('session');
    if (sessionStr) {
      session = JSON.parse(sessionStr);
    }
  }

  this.logIn = function(email, password, options) {
    var authModel = "Users";
    if (config.authModel) authModel = config.authModel;
    return Utils.apiHelper('POST', authModel + '/login?include=user', { email: email, password: password,  options: options})
    .then(function(userInfo) {
      return self.setSession(userInfo);
    })
    ["catch"](function() {
      $cookies.put('session', null);
      return $q.reject(arguments);
    });
  };

  this.logOut = function() {
  	var authModel = "Users";
  	if (config.authModel) authModel = config.authModel;
		var accessToken = $cookies.get('accessToken');
		$cookieStore.remove('username');
		$cookieStore.remove('userId');
		$cookieStore.remove('accessToken');
		$cookieStore.remove('roles');
		$cookieStore.remove('session');
    $cookieStore.remove('lastActive');
	  return Utils.apiHelper('POST', authModel + '/logout?access_token=' + accessToken);
  };

  this.setSession = function(userInfo) {
    var authModel = "Users";
    if (config.authModel) authModel = config.authModel;
    return Utils.apiHelper('GET', authModel + '/' + userInfo.userId + '/Roles?access_token=' + userInfo.id)
      .then(function(roles) {
        $cookies.put('lastActive', new Date());//initiallize after successful login
        session = userInfo;
        $cookies.put('username', userInfo.user.username);
        $cookies.put('userId', userInfo.userId);
        $cookies.put('accessToken', userInfo.id);
        $cookies.put('session', JSON.stringify(session));
        $cookies.put('roles', JSON.stringify(roles));
        return userInfo;
      })["catch"](function() {
      $cookies.put('session', null);
      return $q.reject(arguments);
    });
  };

  this.getAuthToken = function() {
    return session && session.id;
  };

  /**
	 * Stores a key/value pair in session object
   * @param key
   * @param value
   */
  this.put = function(key, value) {
    var session = JSON.parse($cookies.get('session'));
    session[key] = value;
    $cookies.put('session', JSON.stringify(session));
  };

  this.get = function(key) {
    var session = JSON.parse($cookies.get('session'));
    return session[key];
  };

  this.isAuthorized = function(toState, toParams) {
    if(_.startsWith(toState.name, 'public')) return true;//always allow public routes
    var nav = DashboardService.getNavigation();
    var state = toState.name;
    //dashboard.model.action.route
    var path = toParams.model; // model = config.nav[].path
    var label = toParams.action;// action = config.nav[].label
    var roles = angular.fromJson($cookies.get('roles'));
    var found;

    if(!_.isEmpty(path)) { //check subnavs
      found = _.find(nav, { path: path });
      if(found) {
        if(!DashboardService.hasAccess(roles, found)) return false;
        if(_.isArray(found.subnav) && !_.isEmpty(label)) {
          var subnav = _.find(found.subnav, { label: label });
          if(subnav) return DashboardService.hasAccess(roles, subnav);
        }
      }
    } else { // check top nav using state
      found = _.find(nav, { state: state });
      if(found) return DashboardService.hasAccess(roles, found);
    }

    var ctrlRoles = toState.data['roles'];
    if(!_.isEmpty(ctrlRoles) && _.isArray(ctrlRoles)) {
      return DashboardService.hasAccess(roles, { roles: ctrlRoles });
    }

    return true;//no restrictions found, allow access for backwards compatibility
  };

  init();
})

;
