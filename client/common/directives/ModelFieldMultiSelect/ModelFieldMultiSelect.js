angular.module('dashboard.directives.ModelFieldMultiSelect', [])

.directive('modelFieldMultiSelect', function($compile) {
  "ngInject";

  function getTemplate() {
    var template =
      '<div class="select-item checkbox-container" ng-repeat="item in multiSelectOptions">' +
        '<input type="checkbox" class="field" ng-attr-id="{{key+\'-\'+$index}}" ng-model="selected[$index]" ng-checked="selected[$index]" ng-disabled="disabled" ng-change="clickMultiSelectCheckbox($index, item)">' +
        '<label class="checkbox-label" ng-attr-for="{{key+\'-\'+$index}}">{{ item.value }}</label>' +
      '</div>';
    return template;
  }

  return {
    restrict: 'E',
    require: "ngModel",
    scope: {
      key: '=key',
      property: '=property',
      options: '=options',
      data: '=ngModel',
      modelData: '=modelData',
      disabled: '=ngDisabled'
    },
    link: function(scope, element, attrs, ngModel) {
      
      var property = scope.property;
      
      function init() {
        scope.multiSelectOptions = [];
        scope.selected = [];
        if (!property) property = {};
        if (!property.display) property.display = {};

        initOptions();
        initData();

        //Handle translating multi-select checks to scope.data[scope.key] output format
        scope.clickMultiSelectCheckbox = clickMultiSelectCheckbox;


        element.html(getTemplate()).show();
        $compile(element.contents())(scope);
      }

      /**
       * parses multi-select options and checks if string, array, or object
       * if string - try parsing first based on new line character; if no new-line character assume comma separated
       * if array - check if array of string values or array of key/value pair objects
       * if object - parse as key/value pair object ordered by key
       */
      function initOptions() {
        var options = scope.options || property.display.options;
        if (typeof options === 'string') {
          //Check if options on new line
          if (options.indexOf('\n') > -1) {
            //Options separated by new line
            options = options.split('\n');
          } else {
            //assume options separated by comma
            options = options.split(',');
          }
        }

        var keyOverride = property.display.key || 'key';
        var valueOverride = property.display.value || 'value';
        if (Array.isArray(options)) {
          //Check if array of strings
          for (var i in options) {
            var item = options[i];
            if (typeof item === 'string') {
              //string option
              var option = {key: item, value: item};
              scope.multiSelectOptions.push(item);
            } else if (item && typeof item === 'object') {
              //Objects (key/value pair)
              var key = item[keyOverride] || i; //fallback to index if no key
              var option = { key: key, value: item[valueOverride], item: item };
              scope.multiSelectOptions.push(option);
            }
          }

        } else if (options && typeof options === 'object') {
          //Assume object containing key/value pair
          var keys = Object.keys(options);
          for (var k in keys) {
            var key = keys[k];
            var option = { key: key, value: options[key] };
            scope.multiSelectOptions.push(option);
          }
        }
      }

      /**
       * Initial data load by checking desired output as comma, array, or object
       */
      function initData() {
        if (typeof property.display.output === 'undefined') {
          var options = scope.options || property.display.options;
          property.display.output = options instanceof Array ? "comma" : "object";
        }
        switch (property.display.output) {
          case "comma":
            if (!scope.data) scope.data = "";
            var items = scope.data.split('","');
            for (var i in items) {
              var item = items[i];
              if (item[0] == '"') item = item.substring(1, item.length);
              if (item[item.length-1] == '"') item = item.substring(0, item.length-1);
              var index = _.find(scope.multiSelectOptions, {key: item});
              if (index > -1) scope.selected[index] = true;
            }
            break;
          case "array":
            if (!scope.data) scope.data = [];
            for (var i in scope.data) {
              var value = scope.data[i];
              var index = _.find(scope.multiSelectOptions, {key: value});
              if (index > -1) scope.selected[index] = true;
            }
            break;
          case "object":
            if (!scope.data) scope.data = {};
            var keys = Object.keys(scope.data);
            for (var k in keys) {
              var key = keys[k];
              var index = _.find(scope.multiSelectOptions, {key: key});
              if (index > -1) scope.selected[index] = true;
            }
            break;
        }
      }

      function clickMultiSelectCheckbox(index, selectedOption) {
        var output = property.display.output === 'array' ? [] : property.display.output === 'object' ? {} : '';

        for (var i in scope.selected) {
          if (scope.selected[i]) {
            var option = scope.multiSelectOptions[i];
            switch (property.display.output) {
              case 'object':
                output[option.key] = option.value;
                break;
              case 'comma':
                output += '"' + option.value + '",'; //quote qualified
                break;
              case 'array':
                output.push(selectedOption.item || selectedOption.key); // return array
                break;
            }

          }
        }

        if (property.display.output === 'comma' && output.length > 0) output = output.substring(0, output.length-1); //remove last comma

        scope.data[scope.key] = output;

        // Note: breaking changes on onModelFieldMultiSelectCheckboxClick emit below after Angular 1.6.4 upgrade
        // due to ModelFieldMultiSelect rewrite
        //scope.$emit('onModelFieldMultiSelectCheckboxClick', scope.key, selectedOption, selected);
      }

      init();
    }
  };
})

;
