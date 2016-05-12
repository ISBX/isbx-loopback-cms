angular.module('dashboard', [
  'dashboard.Dashboard',
  'dashboard.Login',
  'dashboard.Register',

  'dashboard.directives',
  'dashboard.filters',

  'dashboard.services.Cache',
  'dashboard.services.Session',

  'templates-app',
  'templates-common',
  'ui.router',
  'oc.lazyLoad'
])

.config(function myAppConfig($locationProvider, $stateProvider, $urlRouterProvider, $compileProvider) {
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(http|https|ftp|mailto|tel|file|blo‌​b|data):/);
  $urlRouterProvider.otherwise('/login');
  $locationProvider.html5Mode(true);

  $stateProvider
    .state('public', {
      abstract: true,
      template: '<ui-view />'
    });

  $urlRouterProvider.deferIntercept(); // defer routing until custom modules are loaded
})

.run(function run($ocLazyLoad, $rootScope, $urlRouter, Config, SessionService) {
  //  SessionService.tryGetCurrentUser();
  var modulesLoaded = false;
  if (Config.serverParams.customModules) {
    $ocLazyLoad.load(Config.serverParams.customModules)
      .then(function() {
        modulesLoaded = true;
        $rootScope.$broadcast('modulesLoaded');
      }, function(error){console.log(error)});
  } else {
    modulesLoaded = true;
  }

  $rootScope.$on('$locationChangeSuccess', function(e) {
    if (modulesLoaded) {
      $urlRouter.sync();
    } else {
      var listener = $rootScope.$on('modulesLoaded', function() {
        $urlRouter.sync();
        listener();
      });
    }
  });
})

.controller('AppCtrl', function AppCtrl ($scope, $location, $state, $rootScope, $timeout, $interval, $document, SessionService, CacheService, Config) {
  $rootScope.$state = $state;
  $scope.warningTimeout = Config.serverParams.sessionTimeout / 3;
  $scope.modalInstance = null;
  if (Config.serverParams.gaTrackingId) ga('create', Config.serverParams.gaTrackingId, 'auto');

  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    var toStateName = toState.name;
    toStateName = toStateName.substr(toStateName, toStateName.indexOf('.'));

    if (!SessionService.getAuthToken() && toStateName != 'public') {
      if (Config.serverParams.loginState) {
        $state.go(Config.serverParams.loginState); //custom login controller
      } else if (toStateName != 'public') {
        $state.go('public.login');
      }
      event.preventDefault();
    }
    //Handle Idle Timer for SessionTimeout
    if (Config.serverParams.sessionTimeout && location.host() != 'localhost') {
      setSessionTimeout();
      $document.on("click keydown keyup scroll DOMMouseScroll mousedown mousemove mousewheel touchstart touchmove", function() {
        if(!$scope.modalInstance) {
          //Keep session alive by resetting session timeout on move detection
          $interval.cancel($rootScope.timeoutId);
          setSessionTimeout();
        } else {
          persistSession();
        }
      });
    }
  });

  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if (angular.isDefined(toState.data.pageTitle)) {
      $scope.pageTitle = toState.data.pageTitle;
    }
  });

  $rootScope.logOut = function() {
    CacheService.reset(); //clear out caching
    SessionService.logOut()
      .then(function (result) {
        if (Config.serverParams.loginState) {
          $state.go(Config.serverParams.loginState); //custom login controller
        } else {
          $state.go('public.login');
        }
      })
      .catch(function(error) {
        $state.go('public.login');
      });
  };

  localStorage['lastActive'] = new Date();
  var lastPersistDate = new Date();
  function persistSession() {
    $timeout.cancel($rootScope.persistId);
    if ($state.current.name.indexOf('public') > -1) {
      return; //don't timeout if on the public website
    }
    lastPersistDate = new Date();
    //limit the amount of time localStorage is written to
    if (new Date() - lastPersistDate > 5000) {
      if (checkTimeout()) {
        localStorage['lastActive'] = new Date();
      }
    } else {
      $rootScope.persistId = $timeout(function() {
        if (checkTimeout()) {
          localStorage['lastActive'] = new Date();
        }
      }, 5000);
    }
  }

  function millisToMinutesAndSeconds(millis) {
    var minutes = parseInt((millis/(1000*60))%60);
    var minutesSuffix = minutes > 1 ? 's' : '';
    var seconds = parseInt((millis/1000)%60);
    var secondsSuffix = seconds > 1 ? 's' : '';
    var countdownStr = '';
    if (minutes > 0 && seconds == 0) {
      countdownStr = minutes + ' minute' + minutesSuffix;
    } else if (minutes > 0 && seconds < 60) {
      countdownStr = minutes + ' minute' + minutesSuffix + ' and ' + seconds + ' second' + secondsSuffix;
    } else {
      countdownStr = seconds + ' second' + secondsSuffix;
    }
    return countdownStr;
  }

  function checkTimeout() {
    $timeout.cancel($rootScope.timeoutId);
    if (!localStorage['lastActive']) {
      console.error('Session Timedout on another window/tab');
      $state.go('public.login');
      return false;
    }
    var lastActiveDate = new Date(localStorage['lastActive']);
    var interval = new Date() - lastActiveDate;
    if (interval > Config.serverParams.sessionTimeout) {
      $rootScope.logOut();
      return false;
    } else {
      $rootScope.timeoutId = $timeout(checkTimeout, 5000); //Wait another 5 sec to check again
      return true;
    }

  };

  function timeoutWarningMessage() {
    $scope.alertMessage = 'You will be logged out in ' + millisToMinutesAndSeconds($scope.warningTimeout) + ' for being idle. To avoid being automatically logged out, please click the OK button.';
    if ($scope.warningTimeout > 0) {
      $scope.warningTimeout -= 1000;
    } else {
      $scope.alertMessage = 'Logging Out...';
    }
  }

  function sessionTimeoutWarning() {
    $rootScope.timeoutId = $interval($rootScope.logOut, $scope.warningTimeout, 1);
    if (SessionService.getAuthToken()) {
      $scope.alertTitle = 'Session Timeout Warning';
      $interval(timeoutWarningMessage, 1000);
      $scope.allowAlertOkay = true;
      $scope.allowAlertClose = false;
      $scope.okayAlert = function() {
        $interval.cancel($rootScope.timeoutId);
        setSessionTimeout();
        $scope.modalInstance.close();
        $scope.modalInstance = null;
      };
      if(!$scope.modalInstance) {
        $scope.modalInstance = $modal.open({
          templateUrl: 'app/dashboard/alert/Alert.html',
          controller: 'AppCtrl',
          size: "md",
          keyboard: false, //ESC to dismiss the modal
          backdrop: "static",
          scope: $scope
        });
      }
    }
  }

  function setSessionTimeout() {
    $interval.cancel($rootScope.timeoutId);
    $rootScope.timeoutId = $interval(sessionTimeoutWarning, Config.serverParams.sessionTimeout - $scope.warningTimeout, 1);
  }
});