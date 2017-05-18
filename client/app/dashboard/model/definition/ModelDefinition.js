angular.module('dashboard.Dashboard.Model.Definition', [
  'dashboard.Config',
  'dashboard.services.Settings',
  'ui.router',
  'ui.bootstrap.modal'
])

.config(function config($stateProvider) {
  "ngInject";

  $stateProvider
    .state('dashboard.model.action.definition', {
      url: '/definition',
      //controller: 'ModelDefinitionCtrl', /* causes controller to init twice */
      templateUrl: 'app/dashboard/model/definition/ModelDefinition.html',
      data: {
        pageTitle: 'Settings - Model Definitions'
      }
    })
    ;
})

.controller('ModelDefinitionCtrl', function ModelDefinitionCtrl($scope, $timeout, $state, $location, $modal, Config, SettingsService) {
  "ngInject";

  var jsonEditor = null;
  var modifiedModels = [];
  var modalInstance = null;
  var currentModelIndex = 0;
  
  function init() {
    $scope.hideSideMenu();
    
    var models = angular.copy(Config.serverParams.models); //make a copy of the current nav to persist changes
    
    //convert models to array 
    var keys = Object.keys(models);
    for (var i in keys) {
      var key = keys[i];
      var model = models[key];
      modifiedModels.push(model);
    }

    //only display one navigation at a time so that json-editor doesn't 
    //generate DOM elements for every field in the models JSON
    models = filterModels(currentModelIndex); 
    console.log(JSON.stringify(models, null, '  '));
    var element = document.getElementById("models");
    var options = {
        theme: "bootstrap3",
        iconlib: "fontawesome4",
        layout: "tree",
        startval: models,
        disable_properties: false,
        disable_edit_json: true,
        disable_delete_all: true,
        disable_delete_last: true,
        schema: {
          type: "array", 
          title: "Models",
          format: "tabs",
          options: {
            disable_collapse: true
          },
          items: {
            title: "Model",
            type: "object",
            headerTemplate: "{{self.name}}",
            id: "model",
            properties: {
            }
          }
          
        }
    };
    
    jsonEditor = new JSONEditor(element, options);
    jsonEditor.on('ready',function() {
      //jsonEditor is ready
    });
    
    jsonEditor.on("tabclick", function(params) {
      //Store the current section info in case it was modified
      var model = jsonEditor.getEditor("root."+currentModelIndex);
      //console.log("section.getValue(); = " + JSON.stringify(section.getValue(), null, '  '));
      modifiedModels[currentModelIndex] = model.getValue();
      
      //Load the section info
      currentModelIndex = params.index;
      model = jsonEditor.getEditor("root."+currentModelIndex);
      if (model) model.setValue(modifiedModels[currentModelIndex]);
      
    });
    
  }
  
  function filterModels(currentModelndex) {
    var models = angular.copy(modifiedModels);
    for (var i = 0; i < models.length; i++) {
      var model = models[i];
      delete model.options;
      delete model.properties;
      delete model.display;
      delete model.acls;
      if (currentModelIndex != i) {
      }
    } 
    return models;
  }
  

  $scope.clickSave = function() {
    //Display Save Modal Popup
//    $scope.alertTitle = "Saving...";
//    $scope.alertMessage = "Saving navigation settings";
//    $scope.allowAlertClose = false;
//    modalInstance = $modal.open({
//      templateUrl: 'app/dashboard/alert/Alert.html',
//      controller: 'AlertCtrl',
//      size: "sm",
//      scope: $scope
//    });
//
//    //Store the current section info in case it was modified
//    var section = jsonEditor.getEditor("root."+currentNavIndex);
//    modifiedNav[currentNavIndex] = section.getValue();
//
//    //Save modifiedNav to config.js 
//    //console.log(JSON.stringify(modifiedNav, null, '  '));
//    SettingsService.saveNav(modifiedNav)
//      .then(function(response) {
//        //Saved Successfully
//        $scope.alertMessage = "Saved Successful!";
//        $scope.allowAlertClose = true;
//        
//      }, function(error) {
//        if (typeof error === 'object' && error.message) {
//          alert(error.message);
//        } else if (typeof error === 'object' && error.error && error.error.message) {
//            alert(error.error.message);
//        } else if (typeof error === 'object') {
//          alert(JSON.stringify(error));
//        } else {
//          alert(error);
//        }
//      });
  };
  
  //init();
})

;
