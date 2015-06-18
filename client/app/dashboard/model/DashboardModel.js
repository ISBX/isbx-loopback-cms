angular.module('dashboard.Dashboard.Model', [
  'dashboard.Dashboard.Model.Action',
  'ui.router'
])

.config(function config($stateProvider) {
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

  function init() {
    $scope.section = angular.copy(_.find(Config.serverParams.nav, { path: $stateParams.model }));
  }

  init();
})

;
