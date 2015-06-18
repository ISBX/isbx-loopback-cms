angular.module('dashboard.Register', [
  'dashboard.Config',
  'dashboard.services.Session',
  'dashboard.services.User',
  'ui.router'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('public.register', {
      url: '/register',
      controller: 'RegisterCtrl',
      templateUrl: 'app/Register/Register.html',
      data: {
        pageTitle: 'Register'
      }
    });
})

.controller('RegisterCtrl', function RegisterCtrl($scope, Config, SessionService, UserService) {
  $scope.login = {};

  function init() {
  }

  $scope.register = function() {
    UserService.register($scope.login.email, $scope.login.password)
      .then(function(response) {
        SessionService.logIn($scope.login.email, $scope.login.password).
          then(function(response) {
            $state.go('dashboard');
          })
          .catch(function(response) {
            alert("Error registering");
          });
      })
      .catch(function(response) {
        alert("Error registering");
      });
  }
  
  init();
})

;

