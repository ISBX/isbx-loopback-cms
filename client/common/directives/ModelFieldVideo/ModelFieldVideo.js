angular.module('dashboard.directives.ModelFieldVideo', [
    "dashboard.services.GeneralModel"
  ])

  .directive('modelFieldVideoView', function($compile) {
    return {
      restrict: 'E',
      template: '<b>{{ field.label }}</b>: {{ data[field.name] }}',
      scope: {
        field: '=options',
        data: '=ngModel'
      },
      link: function(scope, element, attrs) {

      }
    };
  })

  .directive('modelFieldVideoEdit', function($compile, $document, GeneralModelService, SessionService) {
    return {
      restrict: 'E',
      template: '<div class="video-container">Video Tag Here</div> \
      <div class="button-menu show-menu">\
      <button class="btn btn-default upload-button" ng-hide="disabled">Select File</button> \
      <button class="btn btn-default clear-button" ng-show="imageUrl && !disabled" ng-click="clear()">Clear</button> \
      </div> \
      <div ng-file-drop="onFileSelect($files)" ng-file-drag-over-class="optional-css-class-name-or-function" ng-show="dropSupported && !disabled" class="image-drop">{{ uploadStatus }}</div> \
      <div ng-file-drop-available="dropSupported=true" ng-show="!dropSupported">HTML5 Drop File is not supported!</div> \
      <input type="file" ng-file-select="onFileSelect($files)" ng-hide="disabled"> \
      <button ng-click="upload.abort()" class="cancel-button">Cancel Upload</button>',
      scope: {
        key: "=key",
        options: '=options',
        disabled: '=disabled',
        data: '=ngModel',
        modelData: '=modelData'
      },
      link: function(scope, element, attrs) {
        var selectedFile = null;

        scope.uploadStatus = "Upload File";

      }
    };
  })

;
