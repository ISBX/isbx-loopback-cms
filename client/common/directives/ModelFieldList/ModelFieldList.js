angular.module('dashboard.directives.ModelFieldList', [
  "dashboard.Config",
  "dashboard.services.GeneralModel",
  "ui.select"
])

.directive('modelFieldListView', function($compile) {
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

.directive('modelFieldListEdit', function($compile, $cookies, $timeout, Config, GeneralModelService) {
  "ngInject";

  function getTemplate(key) {
    var template = '\
    <ul ui-sortable="sortableOptions" ng-model="list" ng-show="list.length > 0"> \
      <li ng-repeat="(index, item) in list"> \
        <i class="fa fa-reorder"></i>\
        <div class="list-field-container"> \
          <div class="list-field" ng-repeat="field in options.display">\
            <input type="text" class="form-control list-edit-{{field}}" ng-model="list[index][field]" placeholder="{{options.properties[field].display.label}}", ng-change="updateData()" ng-disabled="disabled || list[index].isDisabled"> \
          </div> \
        </div> \
        <div class="action"> \
          <a href="" ng-click="removeItem(index)" class="remove" ng-hide="disabled || list[index].isDisabled"><i class="fa fa-times"></i></a> \
        </div> \
      </li> \
    </ul>\
    <button class="btn btn-default list-add-item" ng-click="addItem()" ng-disabled="disabled">{{ options.addLabel }}</button>';
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
        update: self.updateData,
        disabled: scope.disabled
      };

      scope.setData = function() {
        if (scope.options.output == 'object') {
          scope.data = scope.list;
        } else {
          scope.data = JSON.stringify(scope.list);
        }
      };

      scope.addItem = function() {
        event.preventDefault()
        scope.list.push({});
        scope.setData();
      };

      scope.removeItem = function(index) {
        var item = scope.list[index];
        scope.list.splice(index, 1);
        scope.setData();
      };

      scope.updateData = function() {
        scope.setData();
      };


      var unwatch = scope.$watchCollection('[data, options, modelData]', function(results) {
        if (scope.data && scope.options) {
          //unwatch(); //Don't unwatch so that updates to the scope.data outside of the directive will refresh the list
          if (scope.data instanceof Array) {
            scope.list = scope.data;
          } else {
            try {
              scope.list = JSON.parse(scope.data);
            } catch(e) {
              scope.list = [];
              console.error('ModelFieldList failed to parse scope.data', e);
            }
          }
        }
      });

      element.html(getTemplate(scope.options.key)).show();
      $compile(element.contents())(scope);

    }
  };
})

;
