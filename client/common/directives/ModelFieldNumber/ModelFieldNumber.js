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
          if (property.display.minValue !== undefined && isFirstDecLarger(property.display.minValue, e.target.value)) {
            if (scope.ngError) scope.ngError({error: new Error('Value is less than the minimum allowed value (' + property.display.minValue + ').')});
            return
          }
          if (property.display.maxValue !== undefined && isFirstDecLarger(e.target.value, property.display.maxValue)) {
            if (scope.ngError) scope.ngError({error: new Error('Value is greater than the maximum allowed value (' + property.display.maxValue + ').')});
            return
          }
          if (scope.ngError) scope.ngError({error: null});
        } else if (property.display.allowDecimal === false) { /*handle when don't allow decimals - needs to be explicitly implied*/
          if (isNaN(_.round(e.target.value)) || isNaN(parseInt(e.target.value))) {
            if (scope.ngError) scope.ngError({error: new Error('Please enter a valid integer')});
            return
          }
          var roundedValue = _.round(e.target.value, 0);
          scope.data = roundedValue;
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

      /**
       * Takes two decimals as string and returns true if first is strictly larger than second
       * @param dec1 - string representation of decimal - decimal separated, must have leading 0 if absolute value less than 1
       * @param dec2 - string representation of decimal - decimal separated, must have leading 0 if absolute value less than 1
       */
      function isFirstDecLarger(dec1, dec2) {
        if (dec1 === undefined || dec2 === undefined || dec1 === "" || dec2 === "") return;
        var dec1Components = dec1.split('.');
        var dec2Components = dec2.split('.');
        if (parseInt(dec1Components[0]) > parseInt(dec2Components[0])) {
          return true
        } else if (parseInt(dec1Components[0]) < parseInt(dec2Components[0])) {
          return false
        } else { /*equal so look at decimal spots */
          for (var i = 0; i < Math.max(dec1Components[1].length, dec2Components[1].length); i++) {
            if (dec1Components[1].charAt(i) === '') dec1Components[1] += '0';
            if (dec2Components[1].charAt(i) === '') dec2Components[1] += '0';
            if (parseInt(dec1Components[1].charAt(i)) > parseInt(dec2Components[1].charAt(i))) {
              return true
            } else if (parseInt(dec1Components[1].charAt(i)) < parseInt(dec2Components[1].charAt(i))) {
              return false
            }
          }
        }
      };

      init();
    }
  };
})

;
