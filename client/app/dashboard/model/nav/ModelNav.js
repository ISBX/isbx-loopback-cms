angular.module('dashboard.Dashboard.Model.Nav', [
  'dashboard.Config',
  'dashboard.services.Settings',
  'ui.router',
  'ui.bootstrap.modal'
])

.config(function config($stateProvider) {
  "ngInject";

  $stateProvider
    .state('dashboard.model.action.nav', {
      url: '/config',
      //controller: 'ModelNavCtrl', /* causes controller to init twice */
      templateUrl: 'app/dashboard/model/nav/ModelNav.html',
      data: {
        pageTitle: 'Settings - Navigation'
      }
    })
    ;
})

.controller('ModelNavCtrl', function ModelNavCtrl($scope, $timeout, $state, $location, $modal, Config, SettingsService) {
  "ngInject";

  var jsonEditor = null;
  var modifiedNav = null;
  var modalInstance = null;
  var currentNavIndex = 0;
  
  function init() {
    $scope.hideSideMenu();
    
    modifiedNav = angular.copy(Config.serverParams.nav); //make a copy of the current nav to persist changes

    //only display one navigation at a time so that json-editor doesn't 
    //generate DOM elements for every field in the navigation JSON
    var nav = filterNav(currentNavIndex); 
    
    var element = document.getElementById("navigation");
    var options = {
        theme: "bootstrap3",
        iconlib: "fontawesome4",
        layout: "tree",
        startval: nav,
        disable_properties: false,
        disable_edit_json: true,
        disable_delete_all: true,
        disable_delete_last: true,
        schema: {
          type: "array", 
          title: "Navigation",
          format: "tabs",
          options: {
            disable_collapse: true
          },
          items: {
            title: "Section",
            type: "object",
            headerTemplate: "{{self.label}}",
            id: "item",
            properties: {
              label: { title: "Label", type: "string", required: true },
              path: { title: "Path", type: "string", required: true },
              icon: { title: "Icon", type: "string", required: true },
              subnav: {
                title: "Sub-Navigation",
                type: "array",
                required: true,
                items: {
                  title: "Sub Nav",
                  headerTemplate: "{{self.label}}",
                  type: "object",
                  options: {
                    collapsed: true,
                    disable_properties: false
                  },
                  properties: {
                    label: { title: "Label", type: "string", required: true },
                    className: { title: "ClassName", type: "string", required: false },
                    route: { title: "Route", type: "string", enum: ["list", "sort", "edit", "nav", "definition"], required: true },
                    options: { 
                        type: "object",
                        options: {
                          disable_properties: false
                        },
                        properties: {
                          api: { tite: "API", type: "string" },
                          eval: { tite: "eval", type: "string" },
                          model: { title: "Model", type: "string" },
                          key: { title: "Key", type: "string" },
                          rowHeight: { title: "Row Height", type: "integer" },
                          sortField: { title: "Sort Field", type: "string" },
                          title: { title: "Title Field", description: "Field name to display when sorting", type: "string" },
                          params: {
                            type: "object",
                            options: {
                              collapsed: true
                            },
                            properties: {
                              filter: { title: "Filter", type: "string", format: "json" }
                            }
                          },
                          columnRef: {
                            title: "Column Reference",
                            //description: "Reference the columns of another subnav",
                            type: "object",
                            options: {
                              collapsed: true,
                              disable_properties: false
                            },
                            properties: {
                              path: {
                                title: "Section Path",
                                type: "string"
                              },
                              label: {
                                title: "Subnav Label",
                                type: "string"
                              }
                              
                            }
                            
                          },
                          columns: {
                            title: "Columns",
                            type: "array",
                            items: {
                              title: "column",
                              type: "object",
                              headerTemplate: "{{self.displayName}}",
                              options: {
                                collapsed: true,
                                disable_properties: false
                              },
                              properties: {
                                field: { title: "Field", type: "string", required: true },
                                displayName: { title: "Display Name", type: "string", required: true },
                                width: { title: "Width", type: "number" },
                                headerClass: { title: "Header Class", type: "string" },
                                cellClass: { title: "Cell Class", type: "string" },
                                cellTemplate: { title: "Cell Template", type: "string", format: "html" },
                                cellFilter: { title: "Cell Filter", type: "string" },
                                minWidth: { type: "string" },
                                maxWidth: { type: "string" },
                                sortable: { title: "Sortable", type: "string" },
                                resizable: { title: "Resizable", type: "string" }
                              },
                              defaultProperties: ["field", "displayName"]
                            }
                          }
                        },
                        defaultProperties: []
                    }
                  }
                }
              },
              defaultSubNavIndex: {
                title: "Default Sub Nav",
                type: "string",
                watch: {
                  subnav: "item.subnav"
                },
                enumSource: [{
                  source: "subnav",
                  title: "{{item.label}}",
                  value: "{{i}}"
                }]
                
              }
              
            }

          }
          
        }
    };
    
    jsonEditor = new JSONEditor(element, options);
    jsonEditor.on('ready',function() {
      //jsonEditor is ready
    });

    jsonEditor.on('moveup',function(params) {
      //console.log("editor moveup params.row.parent.key = " +params.row.parent.key);
      if (params.row.parent.key == "root") {
        //Section moved up
        var temp = modifiedNav[currentNavIndex-1];
        modifiedNav[currentNavIndex-1] =  modifiedNav[currentNavIndex];
        modifiedNav[currentNavIndex] = temp;
        currentNavIndex--;
        console.log("currentNavIndex = " + currentNavIndex);
      }
    });
    
    jsonEditor.on('movedown',function(params) {
      //console.log("editor movedown params.row.parent.key = " +params.row.parent.key);
      if (params.row.parent.key == "root") {
        //Section moved up
        var temp = modifiedNav[currentNavIndex+1];
        modifiedNav[currentNavIndex+1] =  modifiedNav[currentNavIndex];
        modifiedNav[currentNavIndex] = temp;
        currentNavIndex++;
        console.log("currentNavIndex = " + currentNavIndex);
      }
    });

    jsonEditor.on("tabclick", function(params) {
      //Store the current section info in case it was modified
      var section = jsonEditor.getEditor("root."+currentNavIndex);
      //console.log("section.getValue(); = " + JSON.stringify(section.getValue(), null, '  '));
      modifiedNav[currentNavIndex] = section.getValue();
      
      //Load the section info
      currentNavIndex = params.index;
      section = jsonEditor.getEditor("root."+currentNavIndex);
      if (section) section.setValue(modifiedNav[currentNavIndex]);
      
    });
    
  }
  
  function filterNav(currentNavIndex) {
    var nav = angular.copy(modifiedNav);
    for (var i = 0; i < nav.length; i++) {
      var section = nav[i];
      if (currentNavIndex != i) {
        delete section.subnav;
      }
    } 
    return nav;
  }
  

  $scope.clickSave = function() {
    //Display Save Modal Popup
    $scope.alertTitle = "Saving...";
    $scope.alertMessage = "Saving navigation settings";
    $scope.allowAlertClose = false;
    modalInstance = $modal.open({
      templateUrl: 'app/dashboard/alert/Alert.html',
      controller: 'AlertCtrl',
      size: "sm",
      scope: $scope
    });

    //Store the current section info in case it was modified
    var section = jsonEditor.getEditor("root."+currentNavIndex);
    modifiedNav[currentNavIndex] = section.getValue();

    //Save modifiedNav to config.js 
    console.log(JSON.stringify(modifiedNav, null, '  '));
    SettingsService.saveNav(modifiedNav)
      .then(function(response) {
        //Saved Successfully
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
