angular.module('dashboard.Alert', [
  'ui.bootstrap',
  'ui.bootstrap.modal'
])

.controller('AlertCtrl', function AlertCtrl($scope, $modalInstance) {
  "ngInject";

  $scope.closeAlert = function() {
    $modalInstance.close();
  };
  
  function init() {
    $scope.isConfirm = ($scope.alertType == 'confirm');
  }

  $scope.okAlert = function() {
    if(typeof $scope.okHandler == 'function') $scope.okHandler();
    $modalInstance.close();
  };

  $scope.cancelAlert = function() {
    if(typeof $scope.cancelHandler == 'function') $scope.cancelHandler();
    $modalInstance.close();
  };
  
  init();
})

;
