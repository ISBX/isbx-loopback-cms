angular.module('dashboard.Dashboard.Model.Edit.SaveDialog', [
  'ui.bootstrap',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.modal'
])

.controller('ModelEditSaveDialogCtrl', function ModelEditCtrl($scope, $modalInstance, $translate) {
  "ngInject";

  function init() {
    $scope.statusLabel = 'Status';
    $translate("cms.status").then(function(translated) {
      if (typeof translated == 'string' && translated.length > 0 && translated !== 'cms.status')
        $scope.statusLabel = translated;
    }, function(e) {
      console.log('Failed to translate cms.status', e);
    });
  }
  
  init();
})

;
