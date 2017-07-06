angular.module('dashboard.directives.ModelFieldNumber', [])

.directive('modelFieldNumber', function($compile, $filter) {
  "ngInject";

  function getTemplate() {
    var template =
      '<input type="{{property.display.allowDecimal ? \'text\' : \'number\'}}" ng-class="{error: property.display.error.length > 0}" ng-keypress="checkNumber($event)" ng-blur="validateAndParseNumbers($event)" min="{{ property.display.minValue }}" max="{{ property.display.maxValue }}" ng-model="data" ng-disabled="disabled" ng-required="required" class="field form-control">';
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
        scope.checkNumber = checkNumber;
        scope.validateAndParseNumbers = validateAndParseNumbers;

        if (property.display.allowDecimal === true) {
          scope.data = $filter('decimalWithScale')(scope.data, property.display.scaleValue);
        }

        element.html(getTemplate()).show();
        $compile(element.contents())(scope);
      }

      /**
       * On keypress check the input and limit decimal scale value
       * @param event
       */
      function checkNumber(event) {
        //Get current cursor input position
        var cursorPosition = 0;
        if (document.selection) {
          //IE support
          var range = document.selection.createRange();
          range.moveStart('character', -event.target.value.length);
          cursorPosition = range.text.length;
        } else if (event.target.selectionStart || event.target.selectionStart === 0) {
          cursorPosition = event.target.selectionStart;
        }

        var value = event.target.value;
        if (typeof value !== 'string') return;
        var indexOfDecimal = value.indexOf('.');
        if (indexOfDecimal === -1 || indexOfDecimal >= cursorPosition) return; //only strict if entering decimal
        var valueComponents = value.split('.');
        if (valueComponents.length < 1) return;
        if (valueComponents[1].length >= property.display.scaleValue) {
          event.preventDefault();
          return;
        }
      }

      /**
       * Validate the input on blur
       * @param e
       */
      function validateAndParseNumbers(e) {
        // this logic is to to handled required
        if ((e.target.value === '' || e.target.value === null) && !e.target.validity.badInput) { /*validity states lets us know if it's actually a bad value - target.value also returnes empty string */
          if (scope.ngError && property.display.isRequired) {
            scope.ngError({error: new Error('This is a required field.')});
          } else if (scope.ngError) {
            scope.ngError({error: null});
          }
          return
        }

        if (property.display.allowDecimal === true) {
          var decimalString = $filter('decimalWithScale')(e.target.value, property.display.scaleValue);
          if (isNaN(decimalString) && scope.ngError) {
            scope.ngError({error: new Error('Please enter a valid integer')});
            return
          } else {
            scope.data = decimalString; /*scope.data.scale is to handle parsing the field while scale data is being entered - formEdit */
          }
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
