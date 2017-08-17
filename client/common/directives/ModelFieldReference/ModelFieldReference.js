angular.module('dashboard.directives.ModelFieldReference', [
  "dashboard.Config",
  "dashboard.services.GeneralModel",
  "ui.select"
])

.directive('modelFieldReferenceView', function($compile) {
  "ngInject";

  return {
    restrict: 'E',
    template: '<b>{{ options.model }}</b>: {{ data[options.key] }}',
    scope: {
      options: '=options',
      data: '=ngModel',
      required: 'ngRequired',
      disabled: 'ngDisabled'
    },
    link: function(scope, element, attrs) {
    }
  };
})
/**
 * A service that provides shared variable to 
 * all modelFieldReferenceEditData directives.
 */
.factory('modelFieldReferenceEditData', [function(){
  return { items: [] };
}])

.directive('modelFieldReferenceEdit', function($compile, $cookies, Config, GeneralModelService, modelFieldReferenceEditData) {
  "ngInject";

  function getTemplate(multiple, matchTemplate, choiceTemplate) {
    var template = '';
    if (multiple) {
      //multi-select
      template = '\
      <ui-select multiple ng-model="selected.items" on-select="onSelect($item, $model)" on-remove="onRemove($item, $model)"  ng-disabled="disabled"> \
      <ui-select-match placeholder="{{ options.placeholder }}">'+ matchTemplate +'</ui-select-match> \
      <ui-select-choices repeat="item in list" refresh="refreshChoices($select.search)" refresh-delay="200">' + choiceTemplate + '</ui-select-choices> \
      </ui-select>';
    } else {
      //single-select
      template = '\
      <ui-select ng-model="selected.item" on-select="onSelect($item, $model)" ng-required="ngRequired" ng-disabled="disabled" append-to-body="{{appendToBody}}"> \
      <ui-select-match ng-click="refreshChoices($select.search);" placeholder="{{ options.placeholder }}">'+ matchTemplate +'</ui-select-match> \
      <ui-select-choices repeat="item in list" refresh="refreshChoices($select.search)" refresh-delay="200">' + choiceTemplate + '</ui-select-choices> \
      </ui-select>';
    }
    return template;
  }
  return {
    restrict: 'E',
    scope: {
      key: '=key',
      property: '=property',
      options: '=options',
      data: '=ngModel',
      modelData: '=modelData',
      disabled: '=ngDisabled',
      rowData: "=ngRowData", //for use in the model list edit mode
      textOutputPath: '=ngTextOutputPath', //output the selected text to this path in the rowData
      onModelChanged: "&onModelChanged",
      appendToBody: "=appendToBody"
    },
    link: function(scope, element, attrs) {

      scope.moment = moment;
      scope.isFirstTimeLoad = true;
      scope.selected= {};
      scope.selected.items = []; //for multi-select
      scope.selected.item = null; //for single select; initialize to null so placeholder is displayed
      scope.list = [];

      function replaceSessionVariables(string) {
        if (typeof string !== 'string') return string;
        try {
          //Look for session variables in string
          var session = JSON.parse($cookies.get('session')); //needed for eval() below
          var searchString = "{session.";
          var startPos = string.indexOf(searchString);
          while (startPos > -1) {
            var endPos = string.indexOf("}", startPos);
            if (endPos == -1) {
              console.error("ModelList session parsing malformed for string");
              break;
            }
            var sessionKey = string.substring(startPos+1, endPos);
            string = string.slice(0, startPos) + eval(sessionKey) + string.slice(endPos+1);
            startPos = string.indexOf(searchString);
          }
          //Look for model data variable strings
          searchString = "{";
          startPos = string.indexOf(searchString);
          while (startPos > -1) {
            var endPos = string.indexOf("}", startPos);
            if (endPos == -1) {
              console.error("ModelList session parsing malformed for string");
              break;
            }
            var key = string.substring(startPos+1, endPos);
            string = string.slice(0, startPos) + scope.modelData[key] + string.slice(endPos+1);
            startPos = string.indexOf(searchString);
          }
        } catch(e) {
          console.error(e);
        }
        return string;
      }

      /**
       * Merge arrays and filter out duplicates
       * @param fromArray
       * @param toArray
       */
      function mergeArray(fromArray, toArray) {
        for (var i in fromArray) {
          var item = fromArray[i];
          var index = toArray.indexOf(item);
          if (index == -1) toArray.push(item);
        }
      }

      scope.refreshChoices = function(search) {
        var model = Config.serverParams.models[scope.options.model];
        var params = { 'filter[limit]': 100 }; //limit only 100 items in drop down list
        params['filter[where]['+scope.options.searchField+'][like]'] = "%" + search + "%";
        if (scope.options.where) {
          //Add additional filtering on reference results
          var keys = Object.keys(scope.options.where);
          for (var i in keys) {
            var key = keys[i];
            params['filter[where][' + key + ']'] = replaceSessionVariables(scope.options.where[key]);
          }
        }
        if (scope.options.filters) {
          var keys = Object.keys(scope.options.filters);
          for (var i in keys) {
            var key = keys[i];
            params[key] = replaceSessionVariables(scope.options.filters[key]);
          }
        }
        var apiPath = model.plural;
        if (scope.options.api) apiPath = replaceSessionVariables(scope.options.api);
        GeneralModelService.list(apiPath, params, {preventCancel: true}).then(function(response) {
          if (!response) return; //in case http request was cancelled by newer request
          scope.list = response;
          /**
           * If option removeSelected is true
           * the shared variable of model-field-reference-edit (modelReferenceEditData.items)
           * will be used to save selected data for the comparison. This was tested only on
           * single selection and schedule templates. Only available in single selection.
           * It removes data that is in scope.list base 
           * on the modelReferenceEditData.items
           * @param  {Boolean} scope.options.removeSelected true or false
           */
          if (scope.options.removeSelected && !scope.options.multiple) {
            modelFieldReferenceEditData.items.forEach(function (value) {
              scope.list = scope.list.filter(function(object) {
                  if (object[scope.options.key] != value) {
                    return object;
                  }
              });
            });
          }
          if (scope.options.allowInsert) {
            var addNewItem = {};
            addNewItem[scope.options.searchField] = "[Add New Item]";
            scope.list.push(addNewItem);
          }
          if (scope.options.allowClear) {
            var addNewItem = {};
            addNewItem[scope.options.searchField] = "[clear]";
            scope.list.unshift(addNewItem);

          }
          if (typeof scope.options.defaultIndex === 'number') {
            if (response[scope.options.defaultIndex]) {
              //scope.selected.items = [response[scope.options.defaultIndex]];
              scope.onSelect(response[scope.options.defaultIndex]);
            }
          }
        });
      };

      var unwatch = scope.$watchCollection('[data, options, modelData]', function(results) {
        if (scope.modelData && scope.modelData && scope.options && scope.options.multiple) {
          if (!scope.property.display.sourceModel) {
            unwatch();
            //No sourceModel so try to populate from modelData for items already selected
            if (scope.modelData[scope.property.display.options.relationship]) {
              scope.selected.items = scope.modelData[scope.property.display.options.relationship];
              assignJunctionMeta();
              scope.list = scope.selected.items; //make sure list contains item otherwise won't be displayed
            }
            return;
          }
          //Lookup multiple records that were previously selected
          var sourceModel = Config.serverParams.models[scope.property.display.sourceModel];
          var referenceModel = Config.serverParams.models[scope.options.model];
          var sourceModelName = sourceModel.plural;
          var referenceModelName = referenceModel.plural;
          var sourceId = scope.modelData[scope.property.display.sourceKey];
          if (!sourceId) {
            return;
          }
          unwatch(); //due to late binding need to unwatch here

          //Pass in junctionMeta as filters if exists
          var params = {};
          if (scope.options.junctionMeta) {
            var keys = Object.keys(scope.options.junctionMeta);
            for (var i in keys) {
              var key = keys[i];
              params['filter[where][' + key + ']'] = scope.options.junctionMeta[key];
            }
          }
          GeneralModelService.getMany(sourceModelName, sourceId, scope.options.relationship, params, {preventCancel: true})
          .then(function(response) {
            if (!response) return;  //in case http request was cancelled
            if (scope.options.api && response.length > 0) {
              //If custom API is provided then use it
              var params = {filter: { where: {}}};
              params.filter.where[scope.options.key] = {inq: []};
              for (var i in response) {
                var item = response[i];
                params.filter.where[scope.options.key].inq.push(item[scope.options.key]);
              }
              apiPath = replaceSessionVariables(scope.options.api);
              GeneralModelService.list(apiPath, params, {preventCancel: true}).then(function(response) {
                if (!response) return;  //in case http request was cancelled
                scope.selected.items = response;
                assignJunctionMeta();
                scope.list = response;
              });
            } else {
              scope.selected.items = response;
              assignJunctionMeta();
              scope.list = response;
            }
          });

        } else if (scope.data && scope.options && scope.options.model) {
          //Lookup default reference record
          var model = Config.serverParams.models[scope.options.model];
          //unwatch(); //due to late binding need to unwatch here
          GeneralModelService.get(model.plural, scope.data)
          .then(function(response) {
            if (!response) return;  //in case http request was cancelled
            //console.log("default select = " + JSON.stringify(response));
            scope.selected.item = response;
            assignJunctionMeta();
            scope.list = [scope.selected.item]; //make sure list contains item otherwise won't be displayed
            if (scope.onModelChanged) scope.onModelChanged({'$item': scope.selected.item});
          }, function(error) {
              if (scope.options.allowInsert) {
                //Not found so just add the item
                var newItem = {};
                newItem[scope.options.key] = scope.data;
                newItem[scope.options.searchField] = scope.data;
                scope.selected.item = newItem;
                assignJunctionMeta();
                scope.list.push(newItem);
              }

          });
        }
     });

     function assignJunctionMeta() {
       if (scope.options.junctionMeta) {
         //Make sure to loop through all items for junctionMeta (previously loaded items will not have junctionMeta populated)
         for (var i in scope.selected.items) {
           var selectedItem = scope.selected.items[i];
           //meta data for junction table in a many-to-many situation
           selectedItem.junctionMeta = scope.options.junctionMeta;
         }
       }
     }

     scope.onSelect = function(item, model) {
       if (scope.options.multiple) {
         if (item && item[scope.options.searchField] == "[Add New Item]") {
           var value = element.find("input.ui-select-search").val();
           item[scope.key] = value;
         }
         //For multi-select add as relationship array objects to modelData (when saving, the CMS relational-upsert.js will handle it)
         //scope.selected.items.push(item); //NOTE: commenting out this line fixes issue with dulpicate entries for Angular v1.6 update
         //Make sure to loop through all items for junctionMeta (previously loaded items will not have junctionMeta populated)
         assignJunctionMeta();

         //Assign to model data
         if (scope.modelData[scope.options.relationship]) {
           //Append to object if already exists; this is needed if more than one reference field for same relationship
           mergeArray(scope.selected.items, scope.modelData[scope.options.relationship]);
         } else {
           scope.modelData[scope.options.relationship] = scope.selected.items;
         }
       } else {
        /**
         * If option removeSelected is true
         * the shared variable of model-field-reference-edit (modelFieldReferenceEditData.items)
         * will be used to save selected data for comparison. This was tested only on
         * single selection and schedule templates. Only available in single selection.
         * @param  {Boolean} scope.options.removeSelected true or false
         */
        if (scope.options.removeSelected) {
          if (scope.data) {
            modelFieldReferenceEditData.items = modelFieldReferenceEditData.items.filter(function(item) { 
                return item != scope.data;
            });
          }
          modelFieldReferenceEditData.items.push(item[scope.options.key]);
        }
         //For single record reference just assign the ID back to data
         scope.data = item[scope.options.key];
         if (scope.rowData) scope.rowData[scope.options.key] = scope.data; //work around for ui-grid not being able to set ng-model for cell edit
         //emit an event when an item is selected
         scope.$emit('onModelFieldReferenceSelect', scope.modelData, scope.key, item);
         var textValue = item[scope.options.searchField];
          if (item && item[scope.options.searchField] == "[Add New Item]") {
            //console.log("should add " + $select.search);
            var value = element.find("input.ui-select-search").val();
            scope.data = value;
            var newItem = {};
            newItem[scope.options.key] = value;
            newItem[scope.options.searchField] = value;
            scope.selected.item = newItem;
            scope.list.push(newItem);
          } else if (item && item[scope.options.searchField] == "[clear]") {
            //console.log("should add " + $select.search);
            scope.data = null;
            textValue = "";
          }

          //For the Model List Edit View we need a way to return back the
          //text value to be displayed. The config.json can specify the rowData
          //and textOutputPath to retrieve the data
          if (scope.rowData && scope.textOutputPath && item[scope.options.searchField]) {
            if (scope.textOutputPath.indexOf(".") > -1) {
              var path = scope.textOutputPath.split(".");
              var obj = scope.rowData;
              for (var i = 0; i < path.length-1; i++) {
                var property = path[i];
                if (!obj[property]) obj[property] = {};
                obj = obj[property];
              }
              obj[path[path.length-1]] = textValue;
            } else {
              scope.rowData[scope.textOutputPath] = textValue;
            }
          }

          setTimeout(function() {
            //Needed in a timeout so the scope.data gets saved
            //before emitting ngGridEventEndCellEdit
            scope.$emit('ngGridEventEndCellEdit');
          }, 1);
       }
     };

     scope.onRemove = function(item, model) {
       if (scope.options.multiple) {
         //Remove item from array
         var index = scope.selected.items.indexOf(item);
         if (index > -1) {
           scope.selected.items.splice(index, 1);
           assignJunctionMeta();
         }
         if (scope.modelData[scope.options.relationship]) {
           //Remove object if relationship object exists; this is needed if more than one reference field for same relationship
           if (scope.options.key && item[scope.options.key]) {
             //Remove item previously loaded using object key
             var where = {};
             where[scope.options.key] = item[scope.options.key];
             var index = _.findIndex(scope.modelData[scope.options.relationship], where);
             if (index > -1) scope.modelData[scope.options.relationship].splice(index, 1);
           }
           //Look for direct reference match
           var index = scope.modelData[scope.options.relationship].indexOf(item);
           if (index > -1) scope.modelData[scope.options.relationship].splice(index, 1);
           mergeArray(scope.selected.items, scope.modelData[scope.options.relationship]); //make sure to merge in any items previously selected
         } else {
           scope.modelData[scope.options.relationship] = scope.selected.items;
         }
       } else {
         //For single record reference just assign null
         scope.data = null;
       }
     };

     scope.$on('ngGridEventStartCellEdit', function () {
       //When editing focus on the reference button
       element.find("button").trigger("click");
       element.find("input.ui-select-search").focus();
     });


     element.html(getTemplate(scope.options.multiple, scope.options.matchTemplate, scope.options.choiceTemplate)).show();
     $compile(element.contents())(scope);

    }
  };
})

;
