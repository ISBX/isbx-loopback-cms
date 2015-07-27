angular.module('dashboard.Dashboard.Model.List', [
  'dashboard.Dashboard.Model.Edit.SaveDialog',                                                
  'dashboard.Config',
  'dashboard.services.GeneralModel',
  'dashboard.directives.ModelFieldReference',
  'ui.router',
  'ngCookies',
  'ngGrid',
  'googlechart'
])

.config(function config($stateProvider) {
  $stateProvider
    .state('dashboard.model.action.list', {
      url: '/list',
      //controller: 'ModelListCtrl', /* causes controller to init twice */
      templateUrl: 'app/dashboard/model/list/ModelList.html',
      data: {
        pageTitle: 'List'
      }
    })
    ;
})

.controller('ModelListCtrl', function ModelListCtrl($scope, $cookies, $timeout, $state, $location, $window, $modal, Config, GeneralModelService, $location) {
  
  var modalInstance = null;
  $scope.columnCount = 0;
  $scope.list = [];
  $scope.selected = [];
  $scope.columns = [];
  $scope.listTemplateUrl = '';
  $scope.totalServerItems = 0;
  $scope.isEditing = false;
  $scope.isSearching = false;
  $scope.query = '';
  $scope.isLoading = false;
  if ($scope.action.options.sort) {
    //Custom Sort Override
    $scope.sortInfo = $scope.action.options.sort;
  } else {
    //Use default sort by key
    $scope.sortInfo = { fields: [$scope.action.options.key], directions: ["ASC"] };
  }
  $scope.filterOptions = {
    filterText: "",
    useExternalFilter: false
  };
  $scope.pagingOptions = {
    //Follow ng-grid pagination model
    pageSizes: [25, 50, 100, 250, 500],
    pageSize: $scope.action.options.pageSize ? $scope.action.options.pageSize : 25,
    currentPage: 1 //1-based index
  };
  
  $scope.gridOptions = { 
      data: "list",
      enableColumnResize: true,
      enableRowSelection: typeof $scope.action.options.enableRowSelection === "boolean" ? $scope.action.options.enableRowSelection : true,
      multiSelect: false,
      enablePaging: true,
      useExternalSorting: true,
      showSelectionCheckbox: false,
      sortInfo: $scope.sortInfo,
      showFooter: true,
      showFilter: $scope.action.options.showFilter,
      headerRowHeight: 44,
      footerRowHeight: 44,
      totalServerItems: "totalServerItems",
      pagingOptions: $scope.pagingOptions,
      filterOptions: $scope.filterOptions,
      selectedItems: $scope.selected,
      rowHeight: $scope.action.options.rowHeight ? $scope.action.options.rowHeight : 44
  };
  
  function init() {
    //For Mobile
    $scope.hideSideMenu();
    if ($window.ga) $window.ga('send', 'pageview', { page: $location.path() });

    //Check if Chart needs to be displayed
    $scope.gridContainerTopMargin = 0;
    if ($scope.action.options.chart) {
      $scope.gridContainerTopMarginMax = $scope.action.options.chart.height + 60; //used for scrolling effect 
      $scope.gridContainerTopMargin = $scope.gridContainerTopMarginMax;
      processChart();
    }
    
    window.ngGrid.i18n['en'].ngTotalItemsLabel = "Total Records: ";
    window.ngGrid.i18n['en'].ngPageSizeLabel = "Show: ";
    
    //Load Column Definition
    $scope.columns = getColumnDefinition();
    $scope.gridOptions.columnDefs = "columns"; //tells ng-grid to watch $scope.columns for changes
    
    //Check if Editable
    //NOTE: $scope.action.options.disableAdd determines if you can add a record or not
    if ($scope.action.options.editable) {
      $scope.gridOptions.enableCellEdit = true;
      $scope.gridOptions.enableCellEditOnFocus = false;
      $scope.gridOptions.enableCellSelection = true;
      $scope.gridOptions.enableRowSelection = false;
    }

    //Setup Data Query
    if (!$scope.action.options.params) $scope.action.options.params = {};
    if ($scope.action.options.model) $scope.model = Config.serverParams.models[$scope.action.options.model];
    if ($scope.action.options.api) {
      //options contains api path with possible variables to replace
      $scope.apiPath = $scope.action.options.api;
    } else if ($scope.action.options.model) {
      //Simple model list query
      $scope.apiPath = $scope.model.plural;
    }
    addQueryStringParams();
    $scope.getTotalServerItems();
    
    $timeout(function() {
      //Custom styling override for ng-grid
      $(".ngFooterPanel select").addClass("form-control");
      $(".ngFooterPanel button").addClass("btn btn-default");
    });

    //On Browser resize determine if optional columns should be hidden
    $scope.$grid = $(".grid");
    angular.element($window).bind("resize", function() {
      processWindowSize();
    });
    
    //Check if editing then show Save/Cancel buttons
    $scope.$on('ngGridEventStartCellEdit', function () {
      startEdit();
    });
    
    $scope.$on('ModelListLoadItems', function(event, args) {
      $scope.loadItems();
    });

    if (/(iPad|iPhone|iPod|Android)/g.test( navigator.userAgent ))  {
      //For mobile let the page scroll rather just the ng-grid (Also see mouse binding details below for mobile mobile tweaks)
      $scope.gridOptions.plugins = [new ngGridFlexibleHeightPlugin()];
    }

  }

  function getColumnDefinition() {
    //Setup Columns in Grid
    var columnRef = $scope.action.options.columnRef;
    var columns = $scope.action.options.columns;
    if (columnRef && typeof columnRef === 'object' && columnRef.label) {
      if (columnRef.path) {
        //reference to another main-nav's sub-nav's columns :)
        var section = _.find(Config.serverParams.nav, { path: columnRef.path });
        var subnav = _.find(section.subnav, { label: columnRef.label });
        columns = subnav.options.columns;
      } else {
        //reference to another subnav's columns in the same section
        var subnav = _.find($scope.section.subnav, { label: columnRef.label });
        columns = subnav.options.columns;
      }
    }

    //Check column role access
    columns = angular.copy(columns); //make copy
    if (columns && $cookies.roles) {
      var roles = JSON.parse($cookies.roles);
      if (roles) {
        for (var i = 0; i < columns.length; i++) {
          var column = columns[i];
          if (column.roles) {
            var isRoleFound = false;
            for (var r in roles) {
              var role = roles[r];
              if (column.roles.indexOf(role.name) > -1) {
                isRoleFound = true;
                break; //exit current for loop
              }
            }
            //role was not found so hide column
            if (!isRoleFound) {
              columns.splice(i, 1);
              i--;
            }
            
          }
        }
      }
    }
    return columns; //assign the column definitions
  }
  
  /**
   * Handles hiding optional columns identified in the config.json colunn definition
   */
  function processWindowSize() {
    var $grid = $scope.$grid;
    var windowWidth = $window.innerWidth;
    var averageColumnWidth = windowWidth / $scope.columnCount;
    //console.log("windowWidth = " + windowWidth + "; columnCount = "+$scope.columnCount+"; averageColumnWidth = " + averageColumnWidth);

    if (averageColumnWidth < 90 && !$grid.hasClass("hide-optional")) {
      $grid.addClass("hide-optional");
      //Remove optional columns
      $scope.columns = $scope.columns.filter(function(column) { return !column.optional; });
      //$scope.$digest();
    } else if (averageColumnWidth >= 90 && $grid.hasClass("hide-optional")) {
      $grid.removeClass("hide-optional");
      //Display All Columns
      $scope.columns = $scope.columns = getColumnDefinition();
    }
  }

  /**
   * URLs can contain loopback.io filter query string parameters to filter the list.
   * This is useful when linking to a sub-list (i.e. Viewing entries for a particular contest)
   */
  function addQueryStringParams() {
    var queryStringParams = $location.search();
    $scope.queryStringParams = queryStringParams; //so nggrid cell templates can have access
    var keys = Object.keys(queryStringParams);
    for (var i in keys) {
      var key = keys[i];
      
      //Add filter params from querystring
      $scope.action.options.params[key] = queryStringParams[key];
      
      if ($scope.apiPath) {
        //Swap out any variables needed in API Path
        $scope.apiPath = $scope.apiPath.replace("{"+key+"}", queryStringParams[key]);
      }
    }
    
    //Look for session variables in $scope.apiPath
    try {
      var session = JSON.parse($cookies.session); //needed for eval() below
      var searchString = "{session.";
      var startPos = $scope.apiPath.indexOf(searchString);
      while (startPos > -1) {
        var endPos = $scope.apiPath.indexOf("}", startPos);
        if (endPos == -1) {
          console.error("ModelList session parsing malformed for $scope.apiPath");
          break;
        }
        var sessionKey = $scope.apiPath.substring(startPos+1, endPos);
        $scope.apiPath = $scope.apiPath.slice(0, startPos) + eval(sessionKey) + $scope.apiPath.slice(endPos+1);
        startPos = $scope.apiPath.indexOf(searchString);
      }
    } catch(e) {
      console.error(e);
    }
    
    //Gets the filter description if available for display
    var filterDescription = queryStringParams["filterDescription"];
    $scope.filterDescription = filterDescription ? filterDescription : $scope.action.label; 

    //Check if paging and sorting exists in querystring
    if (queryStringParams.pageSize) $scope.pagingOptions.pageSize = parseInt(queryStringParams.pageSize);
    if (queryStringParams.currentPage) $scope.pagingOptions.currentPage = parseInt(queryStringParams.currentPage);
    if (queryStringParams.sortInfo) {
      try {
        var sortInfo = JSON.parse(queryStringParams.sortInfo);
        _.extend($scope.sortInfo, sortInfo);
      } catch(e) {
        console.warn("There are errors with the querystring param 'pagingOptions'");
      }
    }

    //Check if search is in querystring
    if (queryStringParams.search) $scope.filterOptions.filterText = queryStringParams.search; 
  }
  
  function setupPagination() {
    //make a copy of config params
    var params = angular.copy($scope.action.options.params);
    if (params && params.filter && params.filter.length > 0) {
      //use of filter JSON string
      try {
        var filter = JSON.parse(params.filter);
        filter.limit = $scope.pagingOptions.pageSize;
        filter.skip = ($scope.pagingOptions.currentPage-1) * $scope.pagingOptions.pageSize;
        if ($scope.sortInfo.fields.length > 0) {
          filter.order = "";
          for (var i in $scope.sortInfo.fields) {
            var field = $scope.sortInfo.fields[i];
            var direction = $scope.sortInfo.directions[i];
            if (!direction) direction = "ASC";
            if (parseInt(i) > 0) filter.order += ", ";
            filter.order += field + " " + direction;
          }
        }
        params.filter = JSON.stringify(filter);
      } catch (e) {
        console.error(e);
        alert("Error with list filter. Please contact administrator for assistance.");
      }
    } else {
      //use of loopback.io querystring syntax
      params = _.extend(params, {
        'filter[limit]': $scope.pagingOptions.pageSize,
        'filter[skip]': ($scope.pagingOptions.currentPage-1) * $scope.pagingOptions.pageSize
      });
      if ($scope.sortInfo.fields.length > 0) {
        var sortOrder = "";
        for (var i in $scope.sortInfo.fields) {
          var field = $scope.sortInfo.fields[i];
          var direction = $scope.sortInfo.directions[i];
          if (!direction) direction = "ASC";
          if (parseInt(i) > 0) sortOrder += ", ";
          sortOrder += field + " " + direction;
        }

        params = _.extend(params, { 
          'filter[order]': sortOrder
        });
      }
    }
    
    //TODO: Figure out a better way to preserve state; the following 
    $location.search("pageSize", $scope.pagingOptions.pageSize);
    $location.search("currentPage", $scope.pagingOptions.currentPage); 
    $location.search("sortInfo", JSON.stringify($scope.sortInfo));
    $location.replace(); //replaces current history state rather then create new one when chaging querystring
    return params;
  }

  function injectSearchParams(params) {
    var searchFields = $scope.action.options.searchFields;
    if (searchFields && searchFields.length == 1) {
      var key = 'filter[where][' + searchFields[0] + '][like]';
      params[key] = '%' + $scope.query + '%';
    } else {
      for (var x = 0; x < searchFields.length; x++) {
        var key = 'filter[where][or][' + x + '][' + searchFields[x] + '][like]';
        params[key] = '%' + $scope.query + '%';
      }
    }
    //Debug testing only
    //console.log('params = ', params);

    return params;
  }
  
  $scope.getTotalServerItems = function() {
    var params = setupPagination();

    if ($scope.isSearching) {
      params = injectSearchParams(params);
    }

    GeneralModelService.count($scope.apiPath, params)
    .then(function(response) {
      if (!response) return; //in case http request was cancelled
      $scope.totalServerItems = response.count;
      $scope.loadItems();
    });  
  };

  $scope.loadItems = function() {
    var params = setupPagination();

    if ($scope.isSearching) {
      params = injectSearchParams(params);
    }

    //Rudimentary Caching (could use something more robust here)
    var cacheKey = $scope.apiPath + JSON.stringify(params);
    if(localStorage[cacheKey]) {
      try {
        $scope.list = JSON.parse(localStorage[cacheKey]); //load from cache
        $scope.columnCount = $scope.list.length > 0 ? Object.keys($scope.list[0]).length : 0;
        processWindowSize(); //on first load check window size to determine if optional columns should be displayed
      } catch(e) {
        console.warn("ModelList Cache is corupt for key = " + cacheKey);
      }
    }

    if ($scope.isSearching) {
      $scope.isLoading = true;
    }

    GeneralModelService.list($scope.apiPath, params)
      .then(function(response) {
        if ($scope.isSearching) $scope.isLoading = false;
        if (!response) return; //in case http request was cancelled
        //console.log('response = ', response);
        //console.log(JSON.stringify(response, null,'  '));
        $scope.list = response;
        $scope.columnCount = $scope.list.length > 0 ? Object.keys($scope.list[0]).length : 0;
        localStorage[cacheKey] = JSON.stringify(response); //assign to cache
        processWindowSize(); //on first load check window size to determine if optional columns should be displayed
      });  
  };
  
  /**
   * Return if the dynamic button should be displayed
   */
  $scope.hasButtonPermission = function(button) {
    if (!button.roles) return true;
    if (!$cookies.roles) return false; //user does not have any roles
    var roles = JSON.parse($cookies.roles);
    for (var i in roles) {
      var role = roles[i];
      if (button.roles.indexOf(role.name) > -1) {
        return true;
      }
    }
    return false;
  };
  
  /**
   * Dynamic buttons from config.json
   */
  $scope.clickListButton = function(button) {
    if (button.click) {
      //Custom Module implements button.click function in $scope
      eval("$scope." + button.click);
    } else if (button.route) {
      //Navigate to a specific custom route
      //$scope.action.options = angular.copy(button.options);
      if (button.options) {
        if (button.options.model) $scope.action.options.model = button.options.model;
        if (button.options.key) $scope.action.options.key = button.options.key;
        if (button.returnAfterEdit) $scope.action.options.returnAfterEdit = button.returnAfterEdit; 
        if (button.options.data) {
          var keys = Object.keys(button.options.data);
          for (var i in keys) {
            var key = keys[i];
            var value = button.options.data[key];
            if (value.lastIndexOf("{") > -1) {
              value = value.substring(value.lastIndexOf("{")+1,value.lastIndexOf("}"));
              value = $scope.queryStringParams[value];
            }
            if (!$scope.action.options.data) $scope.action.options.data = {}; 
            $scope.action.options.data[key] = value;
          }
        }
      }
      $state.go("dashboard.model.action." + button.route);
    } else if (button.path && button.label) {
      //Navigate to an existing navigation path/label combo in the same section
      var section = _.find(Config.serverParams.nav, { path: button.path });
      var action = _.find(section.subnav, {label: button.label});
      $state.go("dashboard.model.action." + action.route, { model: section.path, action: action.label });
    }
  };
 
  /**
   * When config.json specifies editable = true
   */
  $scope.clickAdd = function() {
  //Add a blank row to the bottom of the Form List
    if ($scope.list && $scope.list.length > 0) {
      //Prevent creating a new row if last row is not populated
      //var keys = Object.keys($scope.list[$scope.list.length-1]);
      //if (keys.length == 0) return;
    }
    $scope.list.push({});
    startEdit();
  };
  
  $scope.clickSaveEdit = function() {
    //Make sure there's an oldList to compare with $scope.list
    if ($scope.oldList) {
      //determine what has changed from the old list
      var deltaList = [];
      for (var i in $scope.list) {
        var newRow = $scope.list[i];
        var oldRow = $scope.oldList[i];
        //make sure newRow is not empty
        if (!newRow || (typeof newRow == 'object' && Object.keys(newRow).length == 0) || newRow.length == 0) {
          continue;
        }
               
        if (!oldRow || JSON.stringify(newRow) != JSON.stringify(oldRow)) {

          /*
           * We decided to remove any ability to upsert from model list
           * due to issues with model reference field not being able propagate
           * up the information needed. 
           */
          /*
          if ($scope.model && $scope.model.options.relations) {
            //check to see if a relationship was set to null; to prevent upsert of old relationship
            var rowKeys = Object.keys(newRow);
            for (var i in rowKeys) {
              var key = rowKeys[i];
              if (newRow[key] == null) {
                //Found field set to null; check if in a relationship
                var relationshipKeys = Object.keys($scope.model.options.relations);
                for (var k in relationshipKeys) {
                  var relationshipKey = relationshipKeys[k];
                  var relationship = $scope.model.options.relations[relationshipKey];
                  var foreignKey = relationship.foreignKey;
                  if (foreignKey && foreignKey == key && relationship.model) {
                    if (newRow[relationship.model]) {
                      //delete model reference
                      delete newRow[relationship.model];
                    }
                  }
                }
              }
            }
          }
          */
          
          //Remove all relationships to prevent upserting on the server side
          var rowKeys = Object.keys(newRow);
          for (var i in rowKeys) {
            var key = rowKeys[i];
            if (newRow[key] && typeof newRow[key] === 'object') {
              delete newRow[key];
            }
          }
          
          //insert defaults as specified in config.json
          if ($scope.action.options.defaults) {
            var keys = Object.keys($scope.action.options.defaults);
            for (var i in keys) {
              var key = keys[i];
              var property = $scope.action.options.defaults[key];
              if (property && (property.foreceDefaultOnSave || !newRow[key])) {
                //set the default value (i.e. lastUpdated or lastUpdatedBy)
                if (property["default"]) {
                  newRow[key] = property["default"];
                } else if (property.evalDefault) {
                  newRow[key] = eval(property.evalDefault);
                }
              }
            }
          }
          
          //check if all required fields are filled in
          if ($scope.action.options.columns) {
            for (var i in $scope.action.options.columns) {
              var column = $scope.action.options.columns[i];
              if (column.required && !newRow[column.field]) {
                alert("Please fill in all required fields: " + column.displayName);
                return;
              }
            }
            
          }
          
          deltaList.push(newRow);
        }
      }
      
      //console.log(JSON.stringify(deltaList, null, '  '));
      //return;

      
      //Save deltaList
      var recordIndex = 0;
      $scope.status = "Saving...";
      $scope.progress = 0.0;
      modalInstance = $modal.open({
        templateUrl: 'app/dashboard/model/edit/ModelEditSaveDialog.html',
        controller: 'ModelEditSaveDialogCtrl',
        scope: $scope
      });
      
      var saveRecord = function(record, callback) {
        var id = record[$scope.action.options.key];
        GeneralModelService.save($scope.action.options.model, id, record)
        .then(function(response) {
          callback();
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
          callback();
        });            
      };
      
      var saveNextRecord = function() {
        if (recordIndex >= deltaList.length) {
          //finished saving all data
          $scope.status = "Saved Successful";
          if (modalInstance) modalInstance.close();
          $scope.loadItems(); //refresh data after saving
          endEdit();
          return;
        }
        $scope.status = "Saving " + (recordIndex+1) + " of " + deltaList.length;
        $scope.progress = (recordIndex+1) / deltaList.length;
        var record = deltaList[recordIndex];
        saveRecord(record, function() {
          recordIndex++;
          saveNextRecord();
        });
      };
      saveNextRecord();

    }
  };
  
  $scope.clickCancelEdit = function() {
    if (confirm("Are you sure you want can cancel all changes?")) {
      endEdit();
    }
  };
  
  $scope.deleteRow = function(row, bypassPrompt) {
    if (!$scope.model || !$scope.model.plural) {
      console.error("$scope.model or $scope.model.plural not found!");
      return;
    }
    if (bypassPrompt || confirm("Are you sure you want to delete this item?")) {
      var id = row.entity[$scope.action.options.key];
      if (!id) {
        //Record doesn't have an id so must be a record that has not been created yet
        $scope.list.splice(row.rowIndex, 1);
      } else {
        if ($scope.model.options.softDeleteProperty) {
          startEdit();
          row.entity[$scope.model.options.softDeleteProperty] = true; //soft delete
          $scope.clickSaveEdit();
        } else {
          GeneralModelService.remove($scope.model.plural, id)
          .then(function(response) {
            $scope.list.splice(row.rowIndex, 1); //don't reload all the data as you could be editing while deleting
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
      }
    }
  };
  
  $scope.$watch("selected", function(newVal, oldVal) {
    if (newVal !== oldVal && newVal.length > 0 && !$scope.action.options.editable) {
      if ($scope.action.options.selectedState) {
        $state.go($scope.action.options.selectedState.stateName || "dashboard.model.action.edit", { model: $scope.action.options.selectedState.stateModel || $scope.section.path, action: $scope.action.options.selectedState.stateAction || $scope.action.label, id: newVal[0][$scope.action.options.selectedState.stateId || $scope.action.options.key] });
      } else {
        $state.go("dashboard.model.action.edit", { model: $scope.section.path, action: $scope.action.label, id: newVal[0][$scope.action.options.key] });
      }
    }    
  }, true);
  
  $scope.$watch('pagingOptions', function (newVal, oldVal) {
    if (newVal.currentPage != oldVal.currentPage || newVal.pageSize != oldVal.pageSize) {
      $scope.loadItems();
    }
  }, true);
  
  //TODO: Implement external filtering option 
  //(allow configuration between ng-grid search vs. external search from config.json)

//  $scope.$watch('filterOptions', function (newVal, oldVal) {
//      console.log("filterOptions = " + JSON.stringify($scope.filterOptions, null, '  '));
//      if (newVal !== oldVal) {
//        //$scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage, $scope.filterOptions.filterText);
//      }
//  }, true);

  $scope.$watch('sortInfo', function (newVal, oldVal) {
    if (newVal !== oldVal) {
      $scope.loadItems();
    }
  }, true);

  //Wait till ngGrid is loaded and then add scroll events
  var ngGridUnWatch = $scope.$watch('gridOptions.ngGrid', function() {
    var $viewport = $scope.gridOptions.ngGrid.$viewport; 
    ngGridUnWatch(); //remove watch on ngGrid
    $footerPanel = $(".ngFooterPanel");
    $listContainer = $(".grid-container.list");
    
    var rebuildTimeout = null;
    var rebuildGrid = function() {
      //Used in a timer to speed up refresh
      $scope.gridOptions.$gridServices.DomUtilityService.RebuildGrid(
          $scope.gridOptions.$gridScope, 
          $scope.gridOptions.ngGrid);
      
    };
    
    var handleScrollEvent = function(event) {
      var direction = event.originalEvent.detail ? -event.originalEvent.detail : event.originalEvent.wheelDelta/4;
      var scrollY = $viewport.scrollTop();
      
      if (direction < 0) {
        //scrolling down
        var scrollY = $viewport.scrollTop();
        if (scrollY == 0) scrollY = -direction;
        if ($scope.gridContainerTopMargin-scrollY > 0) {
          $scope.gridContainerTopMargin -= scrollY;
          $viewport.height($viewport.height() + scrollY);
          $viewport.scrollTop(0);
        } else {
          $viewport.height($viewport.height() + $scope.gridContainerTopMargin);
          $scope.gridContainerTopMargin = 0;
        }
        if ($scope.gridOptions.$gridServices) {
          //prevent viewport glitch
          clearTimeout(rebuildTimeout); //timer to speed up refresh
          rebuildTimeout = setTimeout(rebuildGrid, 30);
        }
      } else if (direction > 0) {
        //scrolling up
        if (scrollY == 0 && $scope.gridContainerTopMargin < $scope.gridContainerTopMarginMax) {
          scrollY = direction;//$($window).scrollTop();
          $scope.gridContainerTopMargin += scrollY ;
          $viewport.height($viewport.height() - scrollY);
        } else if (scrollY == 0) {
          $scope.gridContainerTopMargin = $scope.gridContainerTopMarginMax;
          $viewport.height($footerPanel.offset().top-$viewport.offset().top);
          
        }
      }
      $scope.$digest(); //Make sure to refresh UI
      
    }

    //For Mobile let entire page scroll
    if (/(iPad|iPhone|iPod|Android)/g.test( navigator.userAgent ))  {
      $(".model-list .grid-container").css({overflow: "visible"});
      $(".model-list .grid").css({ bottom: "auto" });
      $(".model-list .ngFooterPanel").css({position: "static", bottom: "auto"});
      //$scope.gridOptions.plugins = [new ngGridFlexibleHeightPlugin()];
    }

    //Bind Mouse Wheel
    if ($scope.action.options.chart) {
      //Only bind when chart is displayed (bug: unable to resize columns widths because of handleScrollEvent())
      angular.element($window).bind("mousewheel", handleScrollEvent);
      angular.element($window).bind("DOMMouseScroll", handleScrollEvent); //Firefox
    }
    
    //Bind search filter input box if exists to maintain state when back button pressed
    $(".search .ngColMenu input").on("keyup", function() {
      //console.log("filter text change: " + $(this).val());
      $location.search("search", $(this).val());
      $location.replace(); //replaces current history state rather then create new one when changing querystring
    });
  });
 
  
  function processChart() {
    if ($scope.action.options.chart.api) {
      //Load chart data from API Call
      GeneralModelService.list($scope.action.options.chart.api, {})
      .then(function(response) {
        //console.log("chart data: " + JSON.stringify(response, null,'  '));
         
        $scope.chart = $scope.action.options.chart; //make to sure make this assignment only after data is fetched (otherwise angular-google-chart can error)

        //Assign the data
        $scope.chart.data = response;

        //Basic formatting overrides
        if (!$scope.chart.options) $scope.chart.options = {};
        if (!$scope.chart.options.vAxis)  $scope.chart.options.vAxis = {};
        if (!$scope.chart.options.hAxis)  $scope.chart.options.hAxis = {};
        if (!$scope.chart.options.hAxis.textStyle) $scope.chart.options.hAxis.textStyle = {};
        if (!$scope.chart.options.vAxis.textStyle) $scope.chart.options.vAxis.textStyle = {};
        if (!$scope.chart.options.vAxis.gridlines) $scope.chart.options.vAxis.gridlines = {};
        if (!$scope.chart.options.hAxis.textStyle.fontSize) $scope.chart.options.hAxis.textStyle.fontSize = 11;
        if (!$scope.chart.options.vAxis.textStyle.fontSize) $scope.chart.options.vAxis.textStyle.fontSize = 11;
        if (!$scope.chart.options.hAxis.textStyle.color) $scope.chart.options.hAxis.textStyle.color = "#999";
        if (!$scope.chart.options.vAxis.textStyle.color) $scope.chart.options.vAxis.textStyle.color = "#999";
        if (!$scope.chart.options.vAxis.baselineColor) $scope.chart.options.vAxis.baselineColor = "#999";
        if (!$scope.chart.options.hAxis.baselineColor) $scope.chart.options.hAxis.baselineColor = "#999";
        if (!$scope.chart.options.vAxis.gridlines.color) $scope.chart.options.vAxis.gridlines.color = "#eee";
        if (!$scope.chart.options.hAxis.gridlines.color) $scope.chart.options.hAxis.gridlines.color = "#eee";

      });
    }
  }
  
  /**
   * When the user clicks to add a row or edits a cell
   * turn list into edit mode allowing to save or cancel changes
   */
  function startEdit() {
    if (!$scope.isEditing) {
      //track existing data so that when saving can get deltas
      $scope.oldList = angular.copy($scope.list); 
      $scope.isEditing = true;
    }
  }
  
  /**
   * User either saved or cancelled edit mode so reload data
   * and hide save/cancel buttons
   */
  function endEdit() {
    if ($scope.isEditing) {
      $scope.isEditing = false;
      $scope.oldList = undefined; //clear out any old data
      $scope.loadItems();
    }
    
  }

  /**
   * When the user searches a query in the list view
   */
  $scope.initSearch = function() {
    $scope.isSearching = true;
    init();
  };
  
  init();
})

.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
})

;
