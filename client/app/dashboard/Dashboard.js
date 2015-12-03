angular.module('dashboard.Dashboard', [
  'dashboard.Config',
  'dashboard.Profile',
  'dashboard.Dashboard.Model',
  'ui.router'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard', {
      url: '/dashboard',
      controller: 'DashboardCtrl',
      templateUrl: 'app/dashboard/Dashboard.html',
      data: {
        pageTitle: 'Dashboard'
      }
    }).state('portal', {
      url: '/portal',
      controller: 'DashboardCtrl',
      templateUrl: 'app/dashboard/Dashboard.html',
      data: {
        pageTitle: 'Dashboard'
      }
    });
})

.controller('DashboardCtrl', function DashboardCtrl($scope, $rootScope, $state, $stateParams, $location, $cookies, $modal, Config) {

  function init() {
    $scope.nav = $scope.restrictMenuItems(Config.serverParams.nav);

    $scope.locationPath = $location.path();
    $scope.username = $cookies.username;
    $scope.email = $cookies.email;
    $scope.userId = $cookies.userId;
    try {
      $scope.userInfo = JSON.parse($cookies.session);
      $scope.userInfo.user.roles = JSON.parse($cookies.roles);
    } catch(e) {
      //Fail elegantly 
      console.error("Unable to parse $cookies.session");
    }
    console.log('$scope.userInfo', $scope.userInfo)
    $scope.title = Config.serverParams.title || 'Content Management System';
    
    //When navigating to the dashboard state redirect to the default nav
    if ($state.current.name == "dashboard") {
      //Navigate to default page defined in Config JSON
      if (Config.serverParams.defaultNav) {
        var defaultNav = Config.serverParams.defaultNav;
        if (defaultNav.state) {
          $state.go(defaultNav.state, defaultNav.params);
          return;
        } else if (defaultNav.params && !defaultNav.params.action) {
          //defaultNav.params.action not specified so find defaultSubNav
          var nav = _.find($scope.nav, {path: defaultNav.params.model});
          if (nav) {
            var subnav = nav.subnav[nav.defaultSubNavIndex];
            if (subnav) {
              defaultNav.params.action = subnav.label;
              defaultNav.route = subnav.route;
            }
          }
        }
        $state.go("dashboard.model.action." + defaultNav.route, defaultNav.params);
      }
    }

    $scope.$watch(function() {
      return $location.path();
    }, function(){
      $scope.locationPath = $location.path();
    })

    $scope.$on('modelEditSaved', function() {
      if ($scope.modalInstance) $scope.modalInstance.close();
    });
  }

  /*
   * Check if any of the given roles has access to the menu item
   */
  $scope.hasAccess = function(roles, menu) {
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

  /*
   * Only return menu items that the current user has access to
   */
  $scope.restrictMenuItems = function(menus) {
    var roles = JSON.parse($cookies.roles);
    for (var idx in menus) {
      var menu = menus[idx];

      if ($scope.hasAccess(roles, menu)) {
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
                  if ($scope.hasAccess(roles, subnav) && !subnav.hidden) {
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

  $scope.toggleSideMenu = function() {
    var $dashboard = $(".dashboard");
    if ($dashboard.hasClass("show-side-menu")) {
      $dashboard.removeClass("show-side-menu");
    } else {
      $dashboard.addClass("show-side-menu");
    }
  };

  $scope.hideSideMenu = function() {
    $(".dashboard").removeClass("show-side-menu");
  };
  
  $scope.editProfile = function($event) {
    if ($event) $event.preventDefault();
    $scope.action = {
        options: {
          model: Config.serverParams.profileModel,
          key: Config.serverParams.profileKey,
          id: $cookies.userId,
          hideDelete: true
        }
    };
    $scope.modalInstance = $modal.open({
      templateUrl: 'app/dashboard/profile/Profile.html',
      controller: 'ProfileCtrl',
      size: "lg",
      scope: $scope
    });
  };

  $scope.logout = function($event) {
    $rootScope.logOut();
    $event.preventDefault();
  };
  
  init();
})

;
