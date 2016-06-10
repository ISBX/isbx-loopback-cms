angular.module('dashboard.Alert', [
  'ui.bootstrap',
  'ui.bootstrap.modal'
])

.controller('AlertCtrl', function AlertCtrl($scope, $modalInstance) {

  $scope.okayAlert = function() {
    $modalInstance.close();
  };

  $scope.closeAlert = function() {
    $modalInstance.close();
  };
  
  function init() {
  }
  
  init();
})

;
