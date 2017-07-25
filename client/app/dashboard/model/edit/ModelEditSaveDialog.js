angular.module('dashboard.Dashboard.Model.Edit.SaveDialog', [
  'ui.bootstrap',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.modal'
])

.controller('ModelEditSaveDialogCtrl', function ModelEditCtrl($scope, $modalInstance, $translate) {
  "ngInject";

  function init() {
    $translate("cms.status").then(function(translated) {
      $scope.statusLabel = translated;
    }, function() { // gracefully fallback to a default value if no override provided
      $scope.statusLabel = 'Status';
    });
  }
  
  init();
})

;
