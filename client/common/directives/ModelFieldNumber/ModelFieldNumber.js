angular.module('dashboard.directives.ModelFieldNumber', [
  "dashboard.services.GeneralModel"
])

.directive("decimalScale", function ($filter) {
  return {
    restrict: "A", // Only usable as an attribute of another HTML element
    require: "?ngModel",
    scope: {
      decimalScale: "@",
      decimalPoint: "@"
    },
    link: function (scope, element, attr, ngModel) {
      var decimalScale = parseInt(scope.decimalScale) || 2;
      var decimalPoint = scope.decimalPoint || ".";

      // Run when the model is first rendered and when the model is changed from code
      ngModel.$render = function() {
        if (ngModel.$modelValue != null && ngModel.$modelValue >= 0) {
          if (typeof decimalScale === "number") {
            element.val(ngModel.$modelValue.toFixed(decimalScale).toString().replace(".", ","));
          } else {
            element.val(ngModel.$modelValue.toString().replace(".", ","));
          }
        }
      }

      // Run when the view value changes - after each keypress
      // The returned value is then written to the model
      ngModel.$parsers.unshift(function(newValue) {
        if (typeof decimalScale === "number") {
          var floatValue = parseFloat(newValue.replace(",", "."));
          if (decimalScale === 0) {
            return parseInt(floatValue);
          }
          return parseFloat(floatValue.toFixed(decimalScale));
        }

        return parseFloat(newValue.replace(",", "."));
      });

      // Formats the displayed value when the input field loses focus
      element.on("change", function(e) {
        var floatValue = parseFloat(element.val().replace(",", "."));
        if (!isNaN(floatValue) && typeof decimalScale === "number") {
          if (decimalScale === 0) {
            element.val(parseInt(floatValue));
          } else {
            var strValue = floatValue.toFixed(decimalScale);
            element.val(strValue.replace(".", decimalPoint));
          }
        }
      });
    }
  }
});
