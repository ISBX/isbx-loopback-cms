angular.module('dashboard.services.Dashboard', [
  'dashboard.Config',
  'dashboard.Utils'
])

.service('DashboardService', function($cookies, Config) {
  "ngInject";

  var self = this;
  var _roles = [];
  var _nav = [];

  /**
   * Filters the Config.serverParams.nav for accessible navigation sections based on the users role
   */
  this.getNavigation = function() {
    var roles = angular.fromJson($cookies.get('roles'));
    if(_.isEmpty(_nav) || !_.isEqual(_roles, roles)) {
      //make a copy of the nav as not to modify the original object
      _roles = roles;
      var nav = angular.copy(Config.serverParams.nav);
      _nav = self.restrictMenuItems(nav);
    }
    return _nav;
  };

  /**
   * Get the default navigation parameters based on the users role
   * @param navList
   * @param defaultNav
   * @returns {*}
   */
  this.getDefaultNav = function(navList, defaultNav) {
    if (defaultNav.state) {
      return defaultNav;
    } else if (defaultNav.params && !defaultNav.params.action) {
      //defaultNav.params.action not specified so find defaultSubNav
      var nav = _.find(navList, {path: defaultNav.params.model});
      if (nav) {
        if (nav.hidden) {
          //default navigation is hidden so find one that is not hidden
          for (var i = 0; i < navList.length; i++) {
            nav = navList[i];
            defaultNav = { params: { model: nav.path}};
            if (!nav.hidden) break;
          }
          if (nav.hidden) return null; //do not load any navigation items if no nav is visible
        }
        var subnav = nav.subnav[nav.defaultSubNavIndex];
        if (subnav) {
          if (!defaultNav.params) defaultNav.params = {};
          defaultNav.params.action = subnav.label;
          defaultNav.route = subnav.route;
        } else {
          console.error('No defaultSubNavIndex defined in nav', nav);
        }
      }
    }
    return defaultNav;
  };

  /*
   * Only return menu items that the current user has access to
   */
  this.restrictMenuItems = function(menus) {
    for (var idx in menus) {
      var menu = menus[idx];

      if (self.hasAccess(_roles, menu)) {
        if (menu.hasOwnProperty('subnav') &&
          menu.subnav.length > 0) {
          var subItems = this.restrictMenuItems(menu.subnav);
          if (subItems) {
            menu.subnav = subItems;
            //check if defaultSubNavIndex is hidden and if so find one to display
            if (menu.defaultSubNavIndex !== null && menu.defaultSubNavIndex !== undefined) {
              if (menu.subnav[menu.defaultSubNavIndex] && menu.subnav[menu.defaultSubNavIndex].hidden) {
                //Find item the user does have access
                for (var subNavIndex in menu.subnav) {
                  var subnav = menu.subnav[subNavIndex];
                  if (self.hasAccess(_roles, subnav) && !subnav.hidden) {
                    menu.defaultSubNavIndex = parseInt(subNavIndex);
                    break;
                  }
                }
              }
            }
          }
        }
      } else {
        //user does not have access
        menu.hidden = true;
      }
    }
    return menus;
  };

  /*
   * Check if any of the given roles has access to the menu item
   */
  this.hasAccess = function(roles, menu) {
    // if menu item has no roles property, menu item is unrestricted
    if (!menu.hasOwnProperty('roles') ||
      !(menu.roles instanceof Array))
      return true;

    for (var idx in roles) {
      if (menu.roles.indexOf(roles[idx].name) > -1)
        return true;
    }

    // made it here, user has no access
    return false;
  };

});
