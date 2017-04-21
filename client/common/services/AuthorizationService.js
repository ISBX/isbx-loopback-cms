angular.module('dashboard.services.Authorization', [
  'dashboard.Config',
  'dashboard.Utils',
  'dashboard.services.Dashboard'
])

.service('AuthorizationService', function($cookies, Config, DashboardService) {
  var self = this;
  
  this.isAuthorized = function(toState, toParams) {
    if(_.startsWith(toState.name, 'public')) return true;//always allow public routes
    var nav = DashboardService.getNavigation();
    var state = toState.name;
    //dashboard.model.action.route
    var path = toParams.model; // model = config.nav[].path
    var label = toParams.action;// action = config.nav[].label
    var roles = angular.fromJson($cookies.roles);
    
    if(!_.isEmpty(path) && !_.isEmpty(label)) { //check subnavs
      var found = _.find(nav, { path: path });
      if(found) {
        if(!DashboardService.hasAccess(roles, found)) return false;
        if(_.isArray(found.subnav)) {
          var subnav = _.find(found.subnav, { label: label });
          if(subnav) return DashboardService.hasAccess(roles, subnav);
        }
      }
    } else { // check top nav using state
      var found = _.find(nav, { state: state });
      if(found) return DashboardService.hasAccess(roles, found);
    }

    var ctrlRoles = toState.data['roles'];
    if(!_.isEmpty(ctrlRoles) && _.isArray(ctrlRoles)) {
      return DashboardService.hasAccess(roles, { roles: ctrlRoles });
    }

    return true;//no restrictions found, allow access for backwards compatibility
  };
});