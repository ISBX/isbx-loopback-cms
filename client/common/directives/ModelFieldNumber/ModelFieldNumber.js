angular.module('dashboard.directives.ModelFieldNumber', [])

.directive('modelFieldNumber', function($compile, $timeout) {
  "ngInject";

  function getTemplate() {
    var template =
      '<input type="{{property.display.allowDecimal ? \'text\' : \'number\'}}" ng-class="{error: property.display.error.length > 0}" ng-blur="validateAndParseNumbers($event)" min="{{ property.display.minValue }}" max="{{ property.display.maxValue }}" ng-model="data" ng-disabled="disabled" ng-required="required" class="field form-control">';
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
      disabled: '=ngDisabled',
      required: '=ngRequired',
      ngError: '&'
    },
    link: function(scope, element, attrs, ngModel) {

      var property = scope.property;
      var promise;

      function init() {

        if (!property) property = {};
        if (!property.display) property.display = {};
        if (typeof property.display.scaleValue === 'undefined') property.display.scaleValue = 0;
        scope.validateAndParseNumbers = validateAndParseNumbers;

        // force values that can be parsed to numbers, validate for range and errors
        // force numbers into int or float is possible, validate against max/min

        if (typeof scope.data === 'string') scope.data = parseFloat(scope.data); //could be integer or decimal

        if (property.display.allowDecimal === true) {
          $timeout(function() {
            scope.data = parseDecimalToString(scope.data, property.display.scaleValue); //Parse value on load - async behavior
          }, 0)
        }

        element.html(getTemplate()).show();
        $compile(element.contents())(scope);
      }

      /**
       * takes a string and converts it to proper number
       * @param value
       * @param scale
       */
      function parseDecimalToString(value, scale) {
        var parsedValue;
        var decimalScale = parseInt(scale) ? parseInt(scale) :  20; /* this is max decimal toFixed can handle */
        decimalScale = Math.min(Math.max(decimalScale, 0), 20); /*since decimalScale is passed to toFixed, must be between 0 and 20 */
        if (value !== undefined && value !== null) {
          parsedValue = parseFloat(value.toString().replace(",", "."));
          if (isNaN(parsedValue)) {
            if (scope.ngError) scope.ngError({error: new Error('Please enter a valid number.')});
            return value
          }
          value = parsedValue;
          if (typeof decimalScale === "number") {
            value = (Math.round(value * Math.pow(10, decimalScale)) / Math.pow(10, decimalScale)).toFixed(decimalScale)
          }
        }
        return value;
      }

      function validateAndParseNumbers(e) {
        if ((e.target.value === '' || e.target.value === null) && property.display.isRequired) {
          if (scope.ngError) scope.ngError({error: new Error('This is a required field.')});
          return
        }

        if (property.display.allowDecimal === true) {
          scope.data = parseDecimalToString(e.target.value, property.display.scaleValue); /*scope.data.scale is to handle parsing the field while scale data is being entered - formEdit */
        } else if (property.display.allowDecimal === false) { /*handle when don't allow decimals - needs to be explicitly implied*/
          if (isNaN(_.round(e.target.value)) || isNaN(parseInt(e.target.value))) {
            if (scope.ngError) scope.ngError({error: new Error('Please enter a valid integer')});
            return
          }
          var roundedValue = _.round(e.target.value, 0);
          scope.data = roundedValue;
        }

        if (!isNaN(parseFloat(e.target.value))) { /*if data can be coerced into a number)*/
          if (property.display.minValue !== undefined && property.display.minValue > parseFloat(e.target.value)) {
            if (scope.ngError) scope.ngError({error: new Error('Value is less than the minimum allowed value (' + property.display.minValue + ').')});
            return
          }
          if (property.display.maxValue !== undefined && property.display.maxValue < parseFloat(e.target.value)) {
            if (scope.ngError) scope.ngError({error: new Error('Value is greater than the maximum allowed value (' + property.display.maxValue + ').')});
            return
          }
          if (scope.ngError) scope.ngError({error: null});
        }

      }

      init();
    }
  };
})

;
