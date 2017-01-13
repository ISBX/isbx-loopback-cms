angular.module('dashboard.directive.DateTimePicker', [
])

.directive('dateTimePicker', function ($rootScope) {
  
  return {
      require: '?ngModel',
      restrict: 'AE',
      scope: {
          control: '=',
          format: '@',
          ngFormat: '=ngFormat',
          defaultDate: '@',
          viewMode: '@',
          ngViewMode: '=ngViewMode',
          horizontal: '@'
      },
      link: function (scope, elem, attrs, ngModel) {

        //If no static attribute then use dynamic angular attributes
        if (!scope.format) scope.format = scope.ngFormat;
        if (!scope.viewMode) scope.viewMode = scope.ngViewMode;

        ngModel.$formatters.push(function(value) {
          //Format the passed in date
          if (!scope.format) scope.format = scope.ngFormat;
          if (!value) return;
          return moment(value).format(scope.format);
        });
        
        scope.defaultDate = scope.defaultDate ? scope.defaultDate.replace(/"/g, '') : scope.defaultDate; //remove quotes  
        
        //Bind the Element
        elem.datetimepicker({
          format: scope.format,
          useCurrent: false,
          defaultDate: scope.defaultDate ? moment(scope.defaultDate).format(scope.format) : undefined,
          viewMode: scope.viewMode,
          widgetPositioning: { horizontal: scope.horizontal ? scope.horizontal : 'auto' }
        });

        //For companion button to launch the popup
        if (!scope.control) scope.control = {};
        scope.control.show = function() {
          elem.focus();
        };

        //On Blur update the ng-model
        elem.on('blur', function () {
          if (!scope.format) scope.format = scope.ngFormat;
          var dateValue = moment(elem.val(), scope.format);
          if (dateValue.isValid()) {
            ngModel.$setViewValue(dateValue);
          } else {
            ngModel.$setViewValue(null);
          }
        });
      }
    };
});
