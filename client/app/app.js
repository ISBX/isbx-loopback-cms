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

.config(function myAppConfig($locationProvider, $stateProvider, $urlRouterProvider, $compileProvider, $qProvider, Config) {
  "ngInject";

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(http|https|ftp|mailto|tel|file|blo‌​b|data):/);
  $urlRouterProvider.otherwise('/login');
  if(Config.serverParams.disableRegistration) $urlRouterProvider.when('/register','/login');
  $locationProvider.html5Mode(true);
  // $qProvider.errorOnUnhandledRejections(false); //angular 1.6.1 'Possibly unhandled rejection:' issues

  $stateProvider
    .state('public', {
      abstract: true,
      template: '<ui-view />'
    })
    .state('public.accessDenied', {
      url: '/access-denied',
      template: '<div class="no-script-warning"><h1>Access Denied</h1><p>You are not authorized to access this page.</p></div>',
      data: {
        pageTitle: 'Access Denied'
      }
    });

  $urlRouterProvider.deferIntercept(); // defer routing until custom modules are loaded
})

.run(function run($ocLazyLoad, $rootScope, $urlRouter, Config, SessionService) {
  "ngInject";

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

.constant('constants', {
  TIMEOUT_INTERVAL: 5000,
  PUBLIC_STATE: 'public',
  LOGIN_STATE: 'public.login'
})

.controller('AppCtrl', function AppCtrl ($scope, $location, $state, $rootScope, $timeout, $document, SessionService, CacheService, Config, constants) {
  "ngInject";

  $rootScope.$state = $state;
  if (Config.serverParams.gaTrackingId) ga('create', Config.serverParams.gaTrackingId, 'auto');

  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    var toStateName = toState.name;
    toStateName = toStateName.substr(toStateName, toStateName.indexOf('.'));

    if (!SessionService.getAuthToken() && toStateName != constants.PUBLIC_STATE) {
      var desiredState = { state: toState, params: toParams };
      CacheService.set('desiredState', desiredState);

      if (Config.serverParams.loginState) {
        $state.go(Config.serverParams.loginState); //custom login controller
      } else if (toStateName != constants.PUBLIC_STATE) {
        $state.go(constants.LOGIN_STATE);
      }
      event.preventDefault();
      return;
    }

    if(!SessionService.isAuthorized(toState, toParams)) {
      $state.go('public.accessDenied');
      event.preventDefault();
    }
    
  });

  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if (angular.isDefined(toState.data.pageTitle)) {
      $scope.pageTitle = toState.data.pageTitle;
    }
  });

  $rootScope.logOut = function(){
    if(!SessionService.getAuthToken()) return;
    CacheService.reset(); //clear out caching
    SessionService.logOut()
      .then(function(result){
        if (Config.serverParams.loginState) {
          $state.go(Config.serverParams.loginState); //custom login controller
        } else {
          $state.go(constants.LOGIN_STATE);
        }
      })
      .catch(function(error){
        $state.go(constants.LOGIN_STATE);
      });
  };

  var lastPersistDate = new Date();
  $rootScope.persistSession = function() {
    $timeout.cancel($rootScope.persistId);
    if ($state.current.name.indexOf(constants.PUBLIC_STATE) > -1) {
      return; //don't timeout if on the public website
    }
    lastPersistDate = new Date();
    //limit the amount of time localStorage is written to
    if (new Date() - lastPersistDate > constants.TIMEOUT_INTERVAL) {
      if ($rootScope.checkTimeout()) {
        localStorage['lastActive'] = new Date();
      }
    } else {
      $rootScope.persistId = $timeout(function() {
        if ($rootScope.checkTimeout()) {
          localStorage['lastActive'] = new Date();
        }
      }, constants.TIMEOUT_INTERVAL);
    }
  }

  $rootScope.checkTimeout = function() {
    $timeout.cancel($rootScope.timeoutId);
    if (!localStorage['lastActive']) {
      console.error('Session Timedout on another window/tab');
      $state.go(constants.LOGIN_STATE);
      return false;
    }
    var lastActiveDate = new Date(localStorage['lastActive']);
    var interval = new Date() - lastActiveDate;
    if (interval > Config.serverParams.sessionTimeout) {
      $rootScope.logOut();
      return false;
    } else {
      $rootScope.timeoutId = $timeout($rootScope.checkTimeout, constants.TIMEOUT_INTERVAL); //Wait another 5 sec to check again
      return true;
    }

  };

  //Handle Idle Timer for SessionTimeout
  if (Config.serverParams.sessionTimeout && $location.host() != 'localhost') {
    $document.on("mousemove", function() {
      //For Desktop devices
      $rootScope.persistSession();
    });
    $document.on("touchmove", function() {
      //For Mobile devices
      $rootScope.persistSession();
    });
    $document.on("keydown", function() {
      $rootScope.persistSession();
    });
  }

  })

;

