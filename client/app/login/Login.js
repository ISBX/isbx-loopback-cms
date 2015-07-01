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

.controller('LoginCtrl', function LoginCtrl($scope, $state, $window, Config, SessionService, UserService) {
  $scope.login = {};
  $scope.isPasswordVisible = false;

  function init() {
  }
  $scope.togglePassword = function(){
     $scope.isPasswordVisible = !$scope.isPasswordVisible;
  };
  $scope.resetPassword = function(){
    if($scope.login.emailToReset && $scope.login.emailToReset !== ''){
      UserService.resetPassword($scope.login.emailToReset)
      .then(function(response){
        alert('Password is sent to your email');
        $scope.isPasswordVisible = false;
      })
      .catch(function(response) {
        alert('');
      });
    }
  };

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
});
