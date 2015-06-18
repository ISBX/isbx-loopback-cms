angular.module('dashboard.Dashboard.Model.View', [
  'dashboard.Config',
  'dashboard.directives.ModelField',
  'dashboard.services.GeneralModel',
  'ui.router'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard.model.action.view', {
      url: '/view/:id',
      controller: 'ModelViewCtrl',
      templateUrl: 'app/dashboard/model/view/ModelView.html',
      data: {
        pageTitle: 'View'
      }
    })
    ;
})

.controller('ModelViewCtrl', function ModelViewCtrl($scope, $stateParams, Config, GeneralModelService) {

  function init() {
    GeneralModelService.get($scope.model.model, $stateParams.id)
      .then(function(response) {
        $scope.data = response;
      });
  }
  
  init();
})

;
