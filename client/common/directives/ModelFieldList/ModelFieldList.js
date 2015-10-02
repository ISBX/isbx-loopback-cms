angular.module('dashboard.directives.ModelFieldList', [
  "dashboard.Config",
  "dashboard.services.GeneralModel",
  "ui.select"
])

  .directive('modelFieldListView', function($compile) {
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

  .directive('modelFieldListEdit', function($compile, $cookies, $timeout, Config, GeneralModelService) {
    function getTemplate(key) {
      var template = '\
      <ul ui-sortable="sortableOptions" ng-model="list" ng-show="data.length > 0"> \
        <li ng-repeat="(index, item) in list"> \
          <i class="fa fa-reorder"></i>\
          <div class="list-field-container"> \
            <div class="list-field" ng-repeat="field in options.display">\
              <input type="text" class="form-control list-edit-{{field}}" ng-model="list[index][field]" placeholder="{{options.properties[field].display.label}}", ng-change="updateData()"> \
            </div> \
          </div> \
          <div class="action"> \
            <a href="" ng-click="removeItem(index)" class="remove"><i class="fa fa-times"></i></a> \
          </div> \
        </li> \
      </ul>\
      <button class="btn btn-default list-add-item" ng-click="addItem()">{{ options.addLabel }}</button>';
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

        if (!scope.list) scope.list = [];
        if (!scope.options.addLabel) scope.options.addLabel = "Add Item";

        scope.sortableOptions = {
          placeholder: 'sortable-placeholder',
          update: self.updateData
        };

        scope.addItem = function() {
          scope.list.push({});
          scope.data = JSON.stringify(scope.list);
        };

        scope.removeItem = function(index) {
          var item = scope.list[index];
          scope.list.splice(index, 1);
          scope.data = JSON.stringify(scope.list);
        };

        scope.updateData = function() {
          scope.data = JSON.stringify(scope.list);
        };


        var unwatch = scope.$watchCollection('[data, options, modelData]', function(results) {
          if (scope.data && scope.options) {
            unwatch();
            try {
              scope.list = JSON.parse(scope.data);
            } catch(e) {
              scope.list = [];
              console.error('ModelFieldList failed to parse scope.data', e);
            }
          }
        });

        element.html(getTemplate(scope.options.key)).show();
        $compile(element.contents())(scope);

      }
    };
  })

;
