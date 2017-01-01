angular.module('dashboard.directives.ModelFieldReferenceSort', [
  "dashboard.Config",
  "dashboard.services.GeneralModel",
  "ui.select"
])

  .directive('modelFieldReferenceSortView', function($compile) {
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

  .directive('modelFieldReferenceSortEdit', function($compile, $cookies, $timeout, Config, GeneralModelService) {
    function getTemplate(key, matchTemplate, choiceTemplate, allowInsert) {
      var repeatExpression = '(index, item) in selectedList';
      if (!allowInsert) repeatExpression += ' track by item.' + key;
      var template = '\
      <ui-select ng-model="selected.item" on-select="onSelect($item, $model)" ng-required="ngRequired" ng-disabled="disabled" > \
      <ui-select-match placeholder="{{ options.placeholder }}">'+ matchTemplate +'</ui-select-match> \
      <ui-select-choices repeat="item in list track by item.'+key+'" refresh="refreshChoices($select.search)" refresh-delay="200">' + choiceTemplate + '</ui-select-choices> \
      </ui-select> \
      <ul ui-sortable="sortableOptions" ng-model="selectedList"> \
        <li ng-repeat="'+repeatExpression+'"> \
          <i class="fa fa-reorder"></i>\
          <div class="title">'+choiceTemplate+'</div> \
          <div class="action"> \
            <a href="" ng-click="removeItem(index)" class="remove" ng-hide="disabled"><i class="fa fa-times"></i></a> \
          </div> \
        </li> \
      </ul>';
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
        disabled: '=ngDisabled'
      },
      link: function(scope, element, attrs) {

        scope.selected = {};
        scope.selected.item = null; //for single select; initialize to null so placeholder is displayed
        scope.list = []; //data for drop down list
        scope.selectedList = []; //used for tracking whats been selected and also allows for sorting

        scope.sortableOptions = {
          placeholder: 'sortable-placeholder',
          disabled: scope.disabled
        }

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
          GeneralModelService.list(apiPath, params).then(function(response) {
            if (!response) return; //in case http request was cancelled by newer request
            scope.list = response;
            //Remove items already selected
            for (var i in scope.selectedList) {
              var selectedItem = scope.selectedList[i];
              var filter = {};
              filter[scope.options.key] = selectedItem[scope.options.key];
              var item = _.find(scope.list, filter);
              if (item) {
                scope.list.splice(scope.list.indexOf(item), 1);
              }
            }
            if (scope.options.allowInsert) {
              var addNewItem = {};
              addNewItem[scope.options.searchField] = scope.options.insertText ? scope.options.insertText : "[Add New Item]";
              scope.list.push(addNewItem);
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
          if (scope.data && scope.options && scope.options.model) {
            unwatch();
            scope.selectedList = scope.data;
          }
        });

        scope.onSelect = function(item, model) {
          scope.$emit('onModelFieldReferenceSortSelect', scope.modelData, scope.key, item);
          if (!item[scope.options.key] && item[scope.options.searchField]) {
            var value = element.find("input.ui-select-search").val();
            item[scope.options.key] = value;
            item[scope.options.searchField] = value;
          }
          var selectedItem = _.find(scope.selectedList, function(i) {
            return i[scope.options.key] === item[scope.options.key] || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase());
          });
          if (!selectedItem) {
            scope.selectedList.push(item);
            scope.data = scope.selectedList;
          }
          $timeout(function() {
            delete scope.selected.item;
          });
        };

        scope.removeItem = function(index) {
          var item = scope.selectedList[index];
          scope.selectedList.splice(index, 1);
          scope.list.push(item);
        };


        element.html(getTemplate(scope.options.key, scope.options.matchTemplate, scope.options.choiceTemplate, scope.options.allowInsert)).show();
        $compile(element.contents())(scope);

      }
    };
  })

;
