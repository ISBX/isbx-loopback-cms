angular.module('dashboard.directives.ModelFieldLocation', [
    'dashboard.Dashboard.Model.Edit.SaveDialog',
    "dashboard.Config",
    "ui.bootstrap",
    "dashboard.services.GeneralModel",
    "ui.select"
  ])

  .directive('modelFieldLocationView', function($compile) {
    return {
      restrict: 'E',
      template: '<b>{{ options.model }}</b>: {{ data[options.key] }}',
      scope: {
        options: '=options',
        data: '=ngModel',
        required: 'ngRequired',
        disabled: 'disabled'
      },
      link: function(scope, element, attrs) {
      }
    };
  })

  .directive('modelFieldLocationEdit', function($compile, $cookies, $timeout, $modal, Config, FileUploadService) {
    function getTemplate() {
      var template = '\
    <div>[Location Search Here]</div>\
  ';
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
        disabled: '=disabled'
      },
      link: function(scope, element, attrs, ngModel) {

        element.html(getTemplate()).show();
        $compile(element.contents())(scope);
      }
    };
  })

;
