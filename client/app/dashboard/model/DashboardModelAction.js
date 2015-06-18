angular.module('dashboard.Dashboard.Model.Action', [
  'dashboard.Dashboard.Model.Edit',
  'dashboard.Dashboard.Model.List',
  'dashboard.Dashboard.Model.Sort',
  'dashboard.Dashboard.Model.View',
  'dashboard.Dashboard.Model.Nav',
  'dashboard.Dashboard.Model.Definition',
  'ui.router'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard.model.action', {
      url: '/:action',
      controller: 'DashboardModelActionCtrl',
      templateUrl: 'app/dashboard/model/DashboardModelAction.html',
      data: {
        pageTitle: 'Dashboard'
      }
    })
    ;
})

.controller('DashboardModelActionCtrl', function DasbhoardModelActionCtrl($scope, $stateParams) {

  function init() {
    if ($scope.section && $scope.section.subnav) {
      $scope.action = angular.copy(_.find($scope.section.subnav, { label: $stateParams.action }));
    }
  }

  init();
})

;
