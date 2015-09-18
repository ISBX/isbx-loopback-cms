angular.module('dashboard.Dashboard.Model.Sort', [
  'dashboard.Config',
  'dashboard.services.GeneralModel',
  'dashboard.Alert',
  'ui.router',
  'ui.sortable',
  'ui.bootstrap.modal'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard.model.action.sort', {
      url: '/sort',
      //controller: 'ModelSortCtrl', /* causes controller to init twice */
      templateUrl: 'app/dashboard/model/sort/ModelSort.html',
      data: {
        pageTitle: 'Sort'
      }
    })
    ;
})

.controller('ModelSortCtrl', function ModelListCtrl($scope, $timeout, $state, $modal, $window, Config, GeneralModelService, $location) {
  $scope.list = [];
  var modalInstance = null;
  
  function init() {
    $scope.hideSideMenu();
    if ($window.ga) $window.ga('send', 'pageview', { page: $location.path() });

    if (!$scope.action.options.params) $scope.action.options.params = {};
    $scope.model = Config.serverParams.models[$scope.action.options.model];
    $scope.title = $scope.action.options.title ? $scope.action.options.title : $scope.action.options.key;
    $scope.loadItems();
  }


  $scope.loadItems = function() {
    if (!$scope.action.options.params) $scope.action.options.params = {};
    var params = $scope.action.options.params;
    params["filter[order]"] = $scope.action.options.sortField + " DESC";

    if ($scope.action.options.api) {
      //options contains api path with possible variables to replace
      $scope.apiPath = $scope.action.options.api;
    } else if ($scope.action.options.model) {
      //Simple model list query
      $scope.apiPath = $scope.model.plural;
    }

    GeneralModelService.list($scope.apiPath, params)
      .then(function(response) {
        if (!response) return;  //in case http request was cancelled
        //Do a sort here in case API call didn't sort (seems to be an issue with loopback's relationship queries via custom API parameters
        $scope.list = response.sort(function(a,b) {
          if (a[$scope.action.options.sortField] < b[$scope.action.options.sortField]) {
            return 1;
          }
          if (a[$scope.action.options.sortField] > b[$scope.action.options.sortField]) {
            return -1;
          }
          // a must be equal to b
          return 0;

        });
      });
  };

  $scope.moveUp = function(item) {
    var from = $scope.list.indexOf(item);
    if (from == 0) return;
    var to = from-1;
    $scope.list.splice(to, 0, $scope.list.splice(from, 1)[0]);
  };

  $scope.moveDown = function(item) {
    var from = $scope.list.indexOf(item);
    if (from == $scope.list.length-1) return;
    var to = from+1;
    $scope.list.splice(to, 0, $scope.list.splice(from, 1)[0]);
    
  };

  $scope.edit = function(item) {
    if ($scope.action.options.onEdit) {
      $scope.action.options.onEdit(item[$scope.action.options.key]);
    } else {
      $state.go("dashboard.model.action.edit", { model: $scope.section.path, action: $scope.action.label, id: item[$scope.action.options.key] });
    }
  };
  
  $scope.saveSort = function() {

    //Display Save Modal Popup
    $scope.alertTitle = "Saving...";
    $scope.alertMessage = "Saving new sort order";
    $scope.allowAlertClose = false;
    modalInstance = $modal.open({
      templateUrl: 'app/dashboard/alert/Alert.html',
      controller: 'AlertCtrl',
      size: "sm",
      scope: $scope
    });
    
    //Get the new sort order into an array of ids
    var newOrder = [];
    for (var i in $scope.list) {
      var item = $scope.list[i];
      var id = item[$scope.action.options.key];
      newOrder.unshift(id);
      
    }
    //console.log(JSON.stringify(newOrder));
    
    //Call CMS API to save new order
    GeneralModelService.sort($scope.action.options.model, $scope.action.options.key, $scope.action.options.sortField, newOrder)
    .then(function(response) {
      $scope.alertMessage = "Saved Successful!";
      $scope.allowAlertClose = true;
    }, function(error) {
      if (typeof error === 'object' && error.message) {
        alert(error.message);
      } else if (typeof error === 'object' && error.error && error.error.message) {
          alert(error.error.message);
      } else if (typeof error === 'object') {
        alert(JSON.stringify(error));
      } else {
        alert(error);
      }
    });
  };
  
  init();
})

;
