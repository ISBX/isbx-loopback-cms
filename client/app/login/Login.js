angular.module('dashboard.Login', [
  'dashboard.Config',
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

.controller('LoginCtrl', function LoginCtrl($scope, $state, $window, Config, SessionService) {
  $scope.login = {};

  function init() {
  }

  $scope.logIn = function() {
    SessionService.logIn($scope.login.email, $scope.login.password)
      .then(function(response) {
        localStorage.clear(); //clear out all previous cache when login
        $state.go('dashboard');
      })
      .catch(function(response) {
        alert("Invalid login.");
      });
  }
  
  init();
})

;
