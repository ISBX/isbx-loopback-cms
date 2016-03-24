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

.controller('AppCtrl', function AppCtrl ($scope, $location , $state , $rootScope, $timeout, $document, SessionService, CacheService, Config) {
  $rootScope.$state = $state;
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
  });

  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if (angular.isDefined(toState.data.pageTitle)) {
      $scope.pageTitle = toState.data.pageTitle + ' | CMS' ;
    }
  });

  $rootScope.logOut = function(){
    CacheService.reset(); //clear out caching
    SessionService.logOut()
      .then(function(result){
        if (Config.serverParams.loginState) {
          $state.go(Config.serverParams.loginState); //custom login controller
        } else {
          $state.go('public.login');
        }
      })
      .catch(function(error){
      });
  };

  function setSessionTimeout() {
    $rootScope.timeoutId = $timeout($rootScope.logOut, Config.serverParams.sessionTimeout);
  }

  //Handle Idle Timer for SessionTimeout
  if (Config.serverParams.sessionTimeout && $location.host() != 'localhost') {
    setSessionTimeout();
    $document.on("mousemove", function() {
      //For Desktop devices
      $timeout.cancel($rootScope.timeoutId);
      setSessionTimeout();
    });
    $document.on("touchmove", function() {
      //For Mobile devices
      $timeout.cancel($rootScope.timeoutId);
      setSessionTimeout();
    });
  }

  })

;

