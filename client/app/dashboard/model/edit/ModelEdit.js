angular.module('dashboard.Dashboard.Model.Edit', [
  'dashboard.Dashboard.Model.Edit.SaveDialog',
  'dashboard.Config',
  'dashboard.directives.ModelField',
  'dashboard.services.Cache',
  'dashboard.services.GeneralModel',
  'dashboard.services.FileUpload',
  'dashboard.filters.locale',
  'ui.router',
  'ui.bootstrap',
  'ui.bootstrap.datepicker',
  'ui.bootstrap.modal',
  'ngCookies'  
])

.config(function config($stateProvider) {
  "ngInject";

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

.constant('modelEditConstants', {
  'keys': {
      'save': 'button.save',
      'delete':'button.delete',
      'confirmMessage':'button.delete.confirm'
  },
  'defaults': {
      'save': 'Save',
      'delete': 'Delete',
      'confirmMessage': 'Are you sure you want to delete this record?'
  }
})

.controller('ModelEditCtrl', function ModelEditCtrl($rootScope, $scope, $cookies, $location, $stateParams, $state, $window, $uibModal, $filter, Config, GeneralModelService, FileUploadService, CacheService, modelEditConstants, $translate) {
  "ngInject";

  var modalInstance = null;
  function init() {
    $scope.hideSideMenu();
    if ($window.ga) $window.ga('send', 'pageview', { page: $location.path() });

    if (!$scope.action) $scope.action = {};
    if (!$scope.action.options) $scope.action.options = { model: $stateParams.model, key: $stateParams.key };

    $scope.model = angular.copy(Config.serverParams.models[$scope.action.options.model]);

    //Make Key field readonly
    if ($scope.action.options.key) {
      var key = $scope.action.options.key;
      if (!$scope.model.properties[key].display) $scope.model.properties[key].display = {};
      $scope.model.properties[key].display.readonly = true;
    }

    //Get locale
    var languageCode = $translate.use();//retrieve currently used language key
    $scope.locale = $filter('iso-639-1')(languageCode); //convert ISO 639-2 to 639-1 for datetime

    _.forEach($scope.model.properties, function(property) {
      if (!property.display) property.display = {};
      if (!property.display.options) property.display.options = {};
      if($scope.action.options.readonly) {//Check if readonly view
        property.display.readonly = true;
      }
      if (typeof property.type === 'string') {
        switch (property.type.toLowerCase()) {
            case 'date':
            case 'datetime':
              property.display.options.locale = $scope.locale;
              break;
        }
      }
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


    $translate([modelEditConstants.keys.save, modelEditConstants.keys.delete, modelEditConstants.keys.confirmMessage])
      .then(function (translated) { // If translation fails or errors, use default strings
        $scope.saveButtonText = (translated[modelEditConstants.keys.save]==modelEditConstants.keys.save) ? modelEditConstants.defaults.save:translated[modelEditConstants.keys.save];
        $scope.deleteButtonText = (translated[modelEditConstants.keys.delete]==modelEditConstants.keys.delete) ? modelEditConstants.defaults.delete:translated[modelEditConstants.keys.delete];
        $scope.deleteDialogText = (translated[modelEditConstants.keys.confirmMessage]==modelEditConstants.keys.confirmMessage) ? modelEditConstants.defaults.confirmMessage:translated[modelEditConstants.keys.confirmMessage];
      }, function(transId) {
        $scope.saveButtonText = modelEditConstants.defaults.save;
        $scope.deleteButtonText = modelEditConstants.defaults.delete;
        $scope.deleteDialogText = modelEditConstants.defaults.confirmMessage;
      });
    //for deprecation
    $scope.$on('saveModel', function() { $scope.clickSaveModel($scope.data); });
    $scope.$on('deleteModel', function(event, formParams) {
      $scope.clickDeleteModel($scope.data, formParams);
    });

    $scope.$on('onModelSave', function() { $scope.clickSaveModel($scope.data); });
    $scope.$on('onModelDelete', function(event, formParams) {
      $scope.clickDeleteModel($scope.data, formParams);
    });
    $scope.$watchCollection('data', function(newData, oldData) {
      if ($scope.isLoading) return;
      //trigger change event only after model has been loaded and actual change was detected
      $scope.$emit('onModelChange', { newData: newData, oldData: oldData });
    });
  }

  function layoutModelDisplay() {
    //Check if $scope.model.display is defined displaying the order of fields defined in the loopback model json
    $scope.modelDisplay = $scope.model.display;
    if ($scope.action.options.display) $scope.modelDisplay = $scope.model[$scope.action.options.display];
    if (!$scope.modelDisplay || $scope.modelDisplay.length == 0) {
      $scope.modelDisplay = [];
      var keys = Object.keys( $scope.model.properties);
      for (var i in keys) {
        var key = keys[i];
        $scope.modelDisplay.push(key);
        if (!$scope.data[key]) $scope.data[key] = null;
      }
    }

    $scope.$emit('onModelLoad', { data: $scope.data });
  }


  /**
   * Performs call to loopback to save the model data
   */
  function save(callback) {
    var id = $scope.data[$scope.action.options.key];
    GeneralModelService.saveWithFiles($scope.model.name, id, $scope.data)
      .then(function(response) {
        if (modalInstance) modalInstance.close();
        $rootScope.$broadcast('modelEditSaved');
        if (callback) callback(response);
      },
      displayError,
      displayStatus);
  }

  function displayError(error) {
    $rootScope.$broadcast('modelEditSaveFailed', { error: error });
    if (_.isPlainObject(error)) {
      if (typeof error.translate === 'string' && error.translate.length > 0) {
        var msg = $translate.instant(error.translate);
        if (msg === error.translate) msg = error.message; //if no translation then display english message
        alert(msg);
      } else if (error.code || error.message) {
        if (error.code === 'ER_DUP_ENTRY') error.message = "There was a duplicate entry found. Please make sure the entry is unique.";
        alert(error.message);
      } else if (error.error) {
        displayError(error.error)
      } else {
        alert(angular.toJson(error))
      }
    } else {
      alert(error);
    }
    if (modalInstance) modalInstance.close();
  }

  function displayStatus(status) {
    if (_.isPlainObject(status)) {
      if (status.translate) {
        var statusMsg = $translate.instant(status.translate, status.params);
        $scope.status = (statusMsg === status.translate) ? status.message : statusMsg;
      } else if (status.message) $scope.status = status.message;
      if (status.progress) $scope.progress = status.progress;
    }
  }


  /**
   * Check to see if any file upload functionality exist and upload files first then call to save the model data
   */
  $scope.clickSaveModel = function(data) {
    displayStatus({message:"Saving", translate:"cms.status.saving", progress:0.0});
    modalInstance = $uibModal.open({
      templateUrl: 'app/dashboard/model/edit/ModelEditSaveDialog.html',
      controller: 'ModelEditSaveDialogCtrl',
      scope: $scope
    });
    save(function(response){
      CacheService.clear($scope.action.options.model);
      if($scope.action.options && $scope.action.options.returnAfterEdit) {
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
    });
  };
  
  $scope.clickDeleteModel = function(data, formParams) {
    $scope.deleteDialogText = (formParams && formParams.deleteDialogText) ? formParams.deleteDialogText : $scope.deleteDialogText;
    if (!confirm($scope.deleteDialogText)) return;
    var id = data[$scope.action.options.key];
    if ($scope.model.options && $scope.model.options.softDeleteProperty) {
      //Soft Delete
      $scope.data[$scope.model.options.softDeleteProperty] = true;
      save(function() {
        CacheService.clear($scope.action.options.model);
        $window.history.back();
      });
    } else {
      //Hard Delete
      GeneralModelService.remove($scope.model.plural, id)
      .then(function(response) {
        $rootScope.$broadcast('modelDeleted');
        CacheService.clear($scope.action.options.model);
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

    if (!displayInfo) {
      return true;
    }

    if (displayInfo.askIf) {
      var properties = Object.keys(displayInfo.askIf);
      for (var i in properties) {
        var property = properties[i];
        if ($scope.data[property] != displayInfo.askIf[property]) {
          return false; //don't display if doesn't match criteria
        }
      }
    }

    if (!displayInfo.roles) {
      return true; //no roles specified so grant permission
    }

    if (!$cookies.get('roles')) {
      return false; //user has no role access
    }
    
    var userRoles = JSON.parse($cookies.get('roles'));
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
