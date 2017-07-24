angular.module('dashboard.directive.DateTimePicker', [
])

.directive('dateTimePicker', function ($rootScope) {
  "ngInject";

  return {
      require: '?ngModel',
      restrict: 'AE',
      scope: {
          control: '=',
          format: '@',
          ngFormat: '=ngFormat',
          ngTimeZone: '=ngTimeZone',
          defaultDate: '@',
          viewMode: '@',
          ngViewMode: '=ngViewMode',
          horizontal: '@',
          locale: '@',
          maxDate: '@',
          minDate: '@'
      },
      link: function (scope, elem, attrs, ngModel) {

        //If no static attribute then use dynamic angular attributes
        if (!scope.format) scope.format = scope.ngFormat;
        if (!scope.viewMode) scope.viewMode = scope.ngViewMode;

        ngModel.$formatters.push(function(value) {
          //Format the passed in date
          if (!scope.format) scope.format = scope.ngFormat;
          if (!value) return;
          var date = moment(value);
          if (scope.ngTimeZone && date.tz) date = date.tz(scope.ngTimeZone); //NOTE: requires moment-timezone
          return date.format(scope.format);
        });
        
        scope.defaultDate = (scope.defaultDate && typeof scope.defaultDate === 'string') ? scope.defaultDate.replace(/"/g, '') : scope.defaultDate; //remove quotes

        //Bind the Element
        var options = {
          format: scope.format,
          useCurrent: false,
          locale: scope.locale,
          defaultDate: scope.defaultDate ? moment(scope.defaultDate).toDate() : undefined,
          viewMode: scope.viewMode,
          widgetPositioning: { horizontal: scope.horizontal ? scope.horizontal : 'auto' }
        }
        if (scope.minDate) options.minDate = scope.minDate;
        if (scope.maxDate) options.maxDate = scope.maxDate;
        elem.datetimepicker(options);

        //For companion button to launch the popup
        if (!scope.control) scope.control = {};
        scope.control.show = function() {
          elem.focus();
        };

        //On Blur update the ng-model
        elem.on('blur', function () {
          if (!scope.format) scope.format = scope.ngFormat;
          if (scope.locale) moment.locale(scope.locale);
          var value = elem.val();
          if (value && scope.format && scope.format.indexOf('DD-MMM-YYYY') > -1 && scope.locale === 'es') {
            //Hack to fix spanish date parsing via Spanish for DD-MMM-YYYY format as
            //Spanish uses period abbreviation for MMM
            var dateComponents = value.split('-');
            if (dateComponents.length === 3) {
              value = dateComponents[0] + '-' + dateComponents[1] + '.-' + dateComponents[2];
            }
          }
          var dateValue = moment(value, scope.format);
          if (dateValue.isValid()) {
            ngModel.$setViewValue(dateValue);
          } else {
            ngModel.$setViewValue(null);
          }
        });
      }
    };
});
