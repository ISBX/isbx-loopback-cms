angular.module('dashboard.directives.ModelFieldCanvas', [
    'dashboard.Dashboard.Model.Edit.SaveDialog',
    "dashboard.Config",
    "ui.bootstrap",
    "dashboard.services.GeneralModel",
    "ui.select"
  ])

.directive('modelFieldCanvasView', function($compile) {
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

.directive('modelFieldCanvasEdit', function($compile, $cookies, $timeout, $modal, Config, FileUploadService) {
  function getTemplate() {
    var template = '\
    <canvas ng-signature-pad="signature" width="300" height="150"></canvas>\
    <button class="btn btn-default" ng-click="clearCanvas()">Clear</button>\
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
      disabled: '=ngDisabled'
    },
    link: function(scope, element, attrs, ngModel) {

      scope.isLoading = true;
      scope.signature = {};

      scope.clearCanvas = function() {
        var canvas = scope.signature._canvas;
        canvas.width = canvas.width;
      };

      scope.$watch('signature._mouseButtonDown', function() {
        if (scope.signature.fromDataURL && scope.isLoading) {
          //Load Existing Signature
          scope.isLoading = false;
          //Load Image because of CORS issue
          var image = new Image();
          image.setAttribute('crossOrigin', 'anonymous');
          image.onload = function() {
            var context = scope.signature._canvas.getContext("2d");
            context.drawImage(image, 0, 0);
          };
          if (typeof scope.data === 'object' && scope.data.fileUrl) {
            image.src = scope.data.fileUrl;
          } else {
            image.src = scope.data;
          }
        } else if (scope.signature.toDataURL) {
          //When done signing store into data
          var dataUrl = scope.signature.toDataURL();
          scope.data = dataUrl;
        }
      });

      element.html(getTemplate()).show();
      $compile(element.contents())(scope);
    }
  };
})

;
