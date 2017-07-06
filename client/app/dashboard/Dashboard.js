angular.module('dashboard.Dashboard', [
  'dashboard.Config',
  'dashboard.Profile',
  'dashboard.Dashboard.Model',
  'dashboard.services.Dashboard',
  'ui.router'
])

.config(function config($stateProvider) {
  "ngInject";

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

.controller('DashboardCtrl', function DashboardCtrl($scope, $rootScope, $state, $stateParams, $location, $cookies, $modal, Config, DashboardService) {
  "ngInject";

  var self = this;

  this.init = function() {

    //scope functions
    $scope.toggleSideMenu = self.toggleSideMenu;
    $scope.hideSideMenu = self.hideSideMenu;
    $scope.editProfile = self.editProfile;
    $scope.logout = self.logout;

    //scope properties
    $scope.locationPath = $location.path();
    $scope.username = $cookies.get('username');
    $scope.email = $cookies.get('email');
    $scope.userId = $cookies.get('userId');
    try {
      $scope.userInfo = JSON.parse($cookies.get('session'));
      $scope.userInfo.user.roles = JSON.parse($cookies.get('roles'));
    } catch(e) {
      //Fail elegantly 
      console.error("Unable to parse $cookies.get(session)", e);
    }
    console.log('DashboardCtrl: $scope.userInfo', $scope.userInfo);
    $scope.title = Config.serverParams.title || 'Content Management System';
    $scope.nav = DashboardService.getNavigation();

    //When navigating to the dashboard state redirect to the default nav
    if ($state.current.name == "dashboard") {
      //Navigate to default page defined in Config JSON
      if (Config.serverParams.defaultNav) {
        var defaultNav = DashboardService.getDefaultNav($scope.nav, angular.copy(Config.serverParams.defaultNav));
        if (defaultNav.state) {
          $state.go(defaultNav.state, defaultNav.params);
        } else {
          $state.go("dashboard.model.action." + defaultNav.route, defaultNav.params);
        }
      }
    }

    $scope.$watch(function() {
      return $location.path();
    }, function(){
      $scope.locationPath = $location.path();
    });

    $scope.$on('modelEditSaved', function() {
      if ($scope.modalInstance) $scope.modalInstance.close();
    });
  };

  /**
   * For responsive mobile implementation
   */
  this.toggleSideMenu = function() {
    var $dashboard = $(".dashboard");
    if ($dashboard.hasClass("show-side-menu")) {
      $dashboard.removeClass("show-side-menu");
    } else {
      $dashboard.addClass("show-side-menu");
    }
  };

  /**
   * For responsive mobile implementation
   */
  this.hideSideMenu = function() {
    $(".dashboard").removeClass("show-side-menu");
  };

  /**
   * Launches a modal dialog for editing the user's profile
   */
  this.editProfile = function($event) {
    if ($event) $event.preventDefault();
    $scope.action = {
        options: {
          model: Config.serverParams.profileModel,
          key: Config.serverParams.profileKey,
          id: $cookies.get('userId'),
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

  /**
   * Log out
   * @param $event
   */
  this.logout = function($event) {
    $rootScope.logOut();
    if ($event) $event.preventDefault();
  };
  
  self.init();
})

;
