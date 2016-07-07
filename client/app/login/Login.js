angular.module('dashboard.Login', [
  'dashboard.Config',
  'dashboard.services.Cache',
  'dashboard.services.Session',
  'ui.router'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('public.login', {
      url: '/login',
      controller: 'LoginCtrl',
      templateUrl: 'app/login/Login.html',
      data: {
        pageTitle: 'Login'
      }
    });
})

.controller('LoginCtrl', function LoginCtrl($scope, $state, $window, Config, SessionService, CacheService) {

  var self = this;

  this.init = function() {
    $scope.login = {};
    $scope.clickLogin = self.clickLogin;
  };

  this.clickLogin = function() {
    SessionService.logIn($scope.login.email, $scope.login.password)
      .then(function(response) {
        var desiredState = CacheService.get('desiredState');
        CacheService.reset(); //clear out all previous cache when login
        if (desiredState) {
          $state.go(desiredState.state.name, desiredState.params);
        } else {
          $state.go('dashboard');
        }
      })
      .catch(function(response) {
        if (response && response[0] && response[0].error && response[0].error.message) {
          alert(response[0].error.message);
        } else {
          alert("Invalid login.");
        }
      });
  };
  
  self.init();
})

;
