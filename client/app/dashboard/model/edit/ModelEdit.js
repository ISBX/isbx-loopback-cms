angular.module('dashboard.Dashboard.Model.Edit', [
  'dashboard.Dashboard.Model.Edit.SaveDialog',                                                
  'dashboard.Config',
  'dashboard.directives.ModelField',
  'dashboard.services.GeneralModel',
  'dashboard.services.FileUpload',
  'ui.router',
  'ui.bootstrap',
  'ui.bootstrap.datepicker',
  'ui.bootstrap.modal',
  'ngCookies'  
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard.model.action.edit', {
      url: '/edit/:id',
      //controller: 'ModelEditCtrl', /* causes controller to init twice */
      templateUrl: 'app/dashboard/model/edit/ModelEdit.html',
      data: {
        pageTitle: 'Edit'
      }
    })
    ;
})

.controller('ModelEditCtrl', function ModelEditCtrl($rootScope, $scope, $cookies, $stateParams, $state, $window, $modal, Config, GeneralModelService, FileUploadService, $location) {

  var modalInstance = null;
      
  function init() {
    $scope.hideSideMenu();
    if ($window.ga) $window.ga('send', 'pageview', { page: $location.path() });

    if (!$scope.action) $scope.action = {};
    if (!$scope.action.options) $scope.action.options = { model: $stateParams.model, key: $stateParams.key };

    $scope.model = Config.serverParams.models[$scope.action.options.model];
    //Make Key field readonly
    if ($scope.action.options.key) {
      var key = $scope.action.options.key;
      if (!$scope.model.properties[key].display) $scope.model.properties[key].display = {};
      $scope.model.properties[key].display.readonly = true;
    }

    //Give each property display definition an order property if undefined
    var i = 0;
    angular.forEach($scope.model.properties,function(item,key,index){
      if(!item.display) item.display = {};
      if(!item.display.options) item.display.options = {};
      if(item.display.options.order === undefined) item.display.options.order = i;
      i++;
    });

    $scope.isLoading = true;
    $scope.data = {};
    
    //Check to see if there's any passed in values from the referring page
    if ($scope.action.options.data) {
      var keys = Object.keys($scope.action.options.data);
      for (var i in keys) {
        var key = keys[i];
        $scope.data[key] = $scope.action.options.data[key]; //only occurs for new records (this gets replaced when editing a record)
      }
    }

    //Loop through fields and check for forced default fields
    GeneralModelService.checkDefaultValues($scope.model, $scope.data);
    
    //Check to see if editing model
    var id = null;
    if ($stateParams.id && $stateParams.id > 0) id = $stateParams.id;
    if ($scope.action.options.id && $scope.action.options.id > 0) id = $scope.action.options.id;
    if (id) {
      $scope.isEdit = true;
      $scope.modelDisplay = null; //reset model display to prevent caching
      GeneralModelService.get($scope.model.plural, id)
      .then(function(response) {
        if (!response) return;  //in case http request was cancelled
        $scope.data = response;
        layoutModelDisplay();
        $scope.isLoading = false;
      });
    } else {
      layoutModelDisplay();
      $scope.isEdit = false;
      $scope.isLoading = false;
    }
  }

  function layoutModelDisplay() {
    //Check if $scope.model.display is defined displaying the order of fields defined in the loopback model json
    $scope.modelDisplay = $scope.model.display;
    if ($scope.action.options.display) $scope.modelDisplay = $scope.model[$scope.action.options.display];
    if (!$scope.modelDisplay || $scope.modelDisplay.length == 0) {
      $scope.modelDisplay = [];
      var keys = Object.keys($scope.model.properties);
      for (var i in keys) {
        var key = keys[i];
        //Hide field if display.hidden is set to true in loopback model json
        if( $scope.model.properties[key].display.options && $scope.model.properties[key].display.options.hidden === true ) continue;
        $scope.modelDisplay.push(key);
        if (!$scope.data[key]) $scope.data[key] = null;
      }
    }
    //Sort fields by order property
    $scope.modelDisplay.sort(function(a,b){
      if( $scope.model.properties[a].display.options.order === null ) return 0;
      if( $scope.model.properties[a].display.options.order < $scope.model.properties[b].display.options.order ) return -1;
      if( $scope.model.properties[a].display.options.order > $scope.model.properties[b].display.options.order ) return 1;
      return 0;
    })
  };


  /**
   * Performs call to loopback to save the model data
   */
  function save(callback) {
    var id = $scope.data[$scope.action.options.key];
    GeneralModelService.saveWithFiles($scope.model.name, id, $scope.data)
      .then(function(response) {
        if (callback) {
          callback(); //occurs when deleting model record
        } else if ($scope.action.options && $scope.action.options.returnAfterEdit) {
          $window.history.back();
        } else {
          //reload data
          if (!$scope.section) {
            //No section identified, so likely not called from main navigation via config.json
            //Instead likely called from Modal Popup
            if (modalInstance) modalInstance.close();
          } else {
            $state.go($scope.section.state ? $scope.section.state : "dashboard.model.action.edit", { model: $scope.section.path, action: $scope.action.label, id:response[$scope.action.options.key] });
          }
        }
        if (modalInstance) modalInstance.close();
          $rootScope.$broadcast('modelEditSaved');
      },
      function(error) {
        if (typeof error === 'object' && error.message) {
          alert(error.message);
        } else if (typeof error === 'object' && error.error && error.error.message) {
          alert(error.error.message);
        } else if (typeof error === 'object' && error.code) {
          switch (error.code) {
            case "ER_DUP_ENTRY": alert("There was a duplicate entry found. Please make sure the entry is unique."); break;
          }
        } else if (typeof error === 'object') {
          alert(JSON.stringify(error));
        } else {
          alert(error);
        }
        if (modalInstance) modalInstance.close();
      },
      function(status) {
        if (status.message) $scope.status = status.message;
        if (status.progress) $scope.progress = status.progress;
      });
  }


  /**
   * Check to see if any file upload functionality exist and upload files first then call to save the model data
   */
  $scope.clickSaveModel = function(data) {
    $scope.status = "Saving...";
    $scope.progress = 0.0;
    modalInstance = $modal.open({
      templateUrl: 'app/dashboard/model/edit/ModelEditSaveDialog.html',
      controller: 'ModelEditSaveDialogCtrl',
      scope: $scope
    });
    save();
  };
  
  $scope.clickDeleteModel = function(data) {
    if (!confirm("Are you sure you want to delete?")) return;
    var id = data[$scope.action.options.key];
    if ($scope.model.options && $scope.model.options.softDeleteProperty) {
      //Soft Delete
      $scope.data[$scope.model.options.softDeleteProperty] = true;
      save(function() {
        $window.history.back();
      });
    } else {
      //Hard Delete
      GeneralModelService.remove($scope.model.plural, id)
      .then(function(response) {
        $window.history.back();
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
    }
  };
  
  /**
   * Checks if the user access to edit the field for this Model
   */
  $scope.hasPermission = function(key) {
    var displayInfo = null;
    if (typeof key === "object") {
      displayInfo = key;
    } else {
      var property = $scope.model.properties[key];
      displayInfo = property.display;
    }
    if (!displayInfo || !displayInfo.roles) {
      return true; //no roles specified so grant permission
    }
    if (!$cookies.roles) {
      return false; //user has no role access
    }
    
    var userRoles = JSON.parse($cookies.roles);
    for (var i in userRoles) {
      var role = userRoles[i];
      if (displayInfo.roles.indexOf(role.name) > -1) {
        return true;
      }
    }
    return false;
  };
  
  init();
})

;
