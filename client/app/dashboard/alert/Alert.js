angular.module('dashboard.Alert', [
  'ui.bootstrap',
  'ui.bootstrap.modal'
])

.controller('AlertCtrl', function AlertCtrl($scope, $uibModalInstance) {
  "ngInject";

  $scope.closeAlert = function() {
    $uibModalInstance.close();
  };
  
  function init() {
    $scope.isConfirm = ($scope.alertType == 'confirm');
  }

  $scope.okAlert = function() {
    if(typeof $scope.okHandler == 'function') $scope.okHandler();
    $uibModalInstance.close();
  };

  $scope.cancelAlert = function() {
    if(typeof $scope.cancelHandler == 'function') $scope.cancelHandler();
    $uibModalInstance.close();
  };
  
  init();
})

;
