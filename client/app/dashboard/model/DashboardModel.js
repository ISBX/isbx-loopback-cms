angular.module('dashboard.Dashboard.Model', [
  'dashboard.Dashboard.Model.Action',
  'ui.router'
])

.config(function config($stateProvider) {
  "ngInject";

  $stateProvider
    .state('dashboard.model', {
      url: '/:model',
      controller: 'DashboardModelCtrl',
      templateUrl: 'app/dashboard/model/DashboardModel.html',
      data: {
        pageTitle: 'Dashboard'
      }
    })
    ;
})

.controller('DashboardModelCtrl', function DashboardModelCtrl($rootScope, $scope, $stateParams, Config) {
  "ngInject";

  function init() {
    $scope.section = angular.copy(_.find($scope.nav, { path: $stateParams.model }));
  }

  init();
})

;
