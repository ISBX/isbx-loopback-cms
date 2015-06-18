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

.controller('ModelEditCtrl', function ModelEditCtrl($scope, $cookies, $stateParams, $state, $window, $modal, Config, GeneralModelService, FileUploadService, $location) {

  var modalInstance = null;
      
  function init() {
    $scope.hideSideMenu();
    if ($window.ga) $window.ga('send', 'pageview', { page: $location.path() });

    $scope.model = Config.serverParams.models[$scope.action.options.model];

    //Make Key field readonly
    if ($scope.action.options.key) {
      var key = $scope.action.options.key;
      if (!$scope.model.properties[key].display) $scope.model.properties[key].display = {};
      $scope.model.properties[key].display.readonly = true;
    }

    
    $scope.data = {};
    
    //Check to see if there's any passed in values from the referring page
    if ($scope.action.options.data) {
      var keys = Object.keys($scope.action.options.data);
      for (var i in keys) {
        var key = keys[i];
        $scope.data[key] = $scope.action.options.data[key];
      }
    }
    
    
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

    //Loop through fields and check for forced default fields
    checkDefaultValues();
    
    //Check to see if editing model
    var id = null;
    if ($stateParams.id && $stateParams.id > 0) id = $stateParams.id;
    if ($scope.action.options.id && $scope.action.options.id > 0) id = $scope.action.options.id;
    if (id) {
      $scope.isEdit = true;
      GeneralModelService.get($scope.model.plural, id)
      .then(function(response) {
        if (!response) return;  //in case http request was cancelled
        $scope.data = response;
      });
    } else {
      $scope.isEdit = false;
    } 
  }

  /**
   * Look for fields with file type to upload in $scope.data
   * @param data
   * @param callback
   */
  function uploadFiles(data, callback) {
    var index = 0;
    var keys = Object.keys(data);
    var nextFile = function() {
      if (index >= keys.length) {
        callback();
        return;
      }
      var key = keys[index];
      var field = data[key];
      if (field && typeof field === 'object' && field.file) {
        //Found file so upload it
        $scope.status = "Uploading file: " + field.file.name;
        FileUploadService.uploadFile(field.file, field.path)
          .then(function(result) {
            data[key] = result.fileUrl;
            index++;
            nextFile();
          }, function(error) {
            if (typeof error === "object" && error.error) {
              if (modalInstance) modalInstance.close();
              alert("The file being uploaded is not an accepted file type for this patient form. Please contact a system administrator for assistance.");
            } else if (error && error.message) {
              $scope.status = error.message;
            } else {
              $scope.status = error;
            }
          }, function(progress) {
            $scope.progress = progress;
          });
      } else {
        index++;
        nextFile();
      }
    };
    nextFile();
  }

  /**
   * Loop through fields and check for forced default fields
   */
  function checkDefaultValues() {
    var keys = Object.keys($scope.model.properties);
    for (var i in keys) {
      var key = keys[i];
      var property = $scope.model.properties[key];
      if ((property && property.display) && (!$scope.data[key] || property.display.forceDefaultOnSave)) {
        if (typeof property["default"] !== 'undefined') $scope.data[key] = property["default"];
        if (typeof property.display.evalDefault !=='undefined') $scope.data[key] = eval(property.display.evalDefault);
      }
    }
  }

  /**
   * Performs call to loopback to save the model data
   */
  function save(callback) {
    
    //Loop through fields and check for forced default fields
    checkDefaultValues();
    
    var id = $scope.data[$scope.action.options.key];
    uploadFiles($scope.data, function() {
      GeneralModelService.save($scope.model.name, id, $scope.data)
        .then(function(response) {
//      console.log("response = " + JSON.stringify(response, null, '  '));
//      console.log("$scope.action.options.key = " + $scope.action.options.key);
//      console.log("response[$scope.action.options.key] = " + response[$scope.action.options.key]);
          if (callback) {
            callback();
          } else if ($scope.action.options && $scope.action.options.returnAfterEdit) {
            $window.history.back();
          } else {
            //reload data
            if (!$scope.section) {
              //No section identified, so likely not called from main navigation via config.json
              //Instead likely called from Modal Popup
              if (modalInstance) modalInstance.close();
            } else {
              $state.go("dashboard.model.action.edit", { model: $scope.section.path, action: $scope.action.label, id:response[$scope.action.options.key] });
            }
          }
          if (modalInstance) modalInstance.close();
        }, function(error) {
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
        });
    });
  }


  /**
   * Check to see if any file upload functionality exist and upload files first then call to save the model data
   */
  $scope.clickSaveModel = function(data) {
    //console.log("data = " + JSON.stringify(data, null, '  '));
    
    $scope.status = "Saving...";
    $scope.progress = 0.0;
    modalInstance = $modal.open({
      templateUrl: 'app/dashboard/model/edit/ModelEditSaveDialog.html',
      controller: 'ModelEditSaveDialogCtrl',
      scope: $scope
    });

    if (data.__ModelFieldImageData) {
      $scope.status = "Uploading image file(s)";
      FileUploadService.uploadImages(data.__ModelFieldImageData)
        .then(function(result) {
          //console.log("finished uploading");
          //console.log(JSON.stringify(result, null, '  '));

          //Loop through results and get URLs into scope.data
          var keys = Object.keys(result);
          for (var i in keys) {
            var fieldKey = keys[i]; //key represents the model field (column) name
            
            //Check the fieldKey properties
            var property = $scope.model.properties[fieldKey]; //see model json properties
            var options = property.display.options;
            if (!options || !options.model || !options.relationship) {
              //store URL directly in model field value 
              $scope.data[fieldKey] = result[fieldKey]; //response[key] is the image url
            } else {
              //Create a nested object in scope.data to mimic the relationship data structure for filter[include] in loopback.io
              if (!$scope.data[options.relationship]) $scope.data[options.relationship] = {};
              var mediaRelationshipModel = $scope.data[options.relationship];
              if ($scope.data[fieldKey]) mediaRelationshipModel[options.key] = $scope.data[fieldKey]; //assign the ID value if editing (i.e. mediaId)
              mediaRelationshipModel[options.urlKey] = result[fieldKey][options.urlKey];
              
              //Add export images
              var exportKeys = Object.keys(options.export);
              for (var j in exportKeys) {
                var exportKey = exportKeys[j];
                mediaRelationshipModel[exportKey] = result[fieldKey][exportKey];
              }
              
              //Add filename
              if (data.__ModelFieldImageData[fieldKey] && data.__ModelFieldImageData[fieldKey][options.urlKey]) {
                var fileInfo = data.__ModelFieldImageData[fieldKey][options.urlKey];
                var file = fileInfo ? fileInfo.file : {}; //First Image in __ModelFieldImageData will have { path, file } subsequent exports will just be the file
                mediaRelationshipModel.filename = file.name;   
              } else {
                mediaRelationshipModel.filename = "unknown";
              }
              //Add any specified meta data field
              if (options.meta) {
                var metaKeys = Object.keys(options.meta);
                for (var k in metaKeys) {
                  var metaKey = metaKeys[k];
                  mediaRelationshipModel[metaKey] = options.meta[metaKey];
                }
              }
            }
            
          }
         
          //Finally delete the __ModelFieldImageData
          delete $scope.data.__ModelFieldImageData; 
          
          $scope.status = "Saving...";
          save();
        }, function(error) {
          console.log(error);
          if (error && error.message) {
            $scope.status = error.message; 
          } else {
            $scope.status = error; 
          }
        }, function(progress) {
          //console.log("upload progress = " + progress);
          $scope.progress = progress;
        });
      
      
    } else {
      save();
    }
    

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
