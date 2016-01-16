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

.directive('modelFieldVideoEdit', function($sce, $compile, $document, GeneralModelService, SessionService) {
  return {
    restrict: 'E',
    template: '<div class="video-container"><video ng-if="videoUrl" src="{{videoUrl}}" controls></video><div class="placeholder" ng-hide="videoUrl">Upload a Video File</div></div> \
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

      /**
       * scope.data updates async from controller so need to watch for the first change only
       */
      var unwatch = scope.$watch('data', function(data) {
        if (data) {
          unwatch(); //Remove the watch
          if (typeof data === "string") {
            scope.videoUrl = $sce.trustAsResourceUrl(data);
          } else if (typeof data === "object") {
            if (data.fileUrl) scope.videoUrl = $sce.trustAsResourceUrl(data.fileUrl);
            if (data.videoUrl) scope.videoUrl = $sce.trustAsResourceUrl(data.videoUrl);
          }
        }
      });

      //Use the FileReader to display a preview of the image before uploading
      var fileReader = new FileReader();
      fileReader.onload = function (event) {
        //Set the preview video via scope.videoUrl binding
        scope.videoUrl = $sce.trustAsResourceUrl(event.target.result);
        scope.$apply();
      };
      fileReader.onerror = function(error) {
        console.error(error);
      };

      scope.clear = function() {
        //Clear out an existing selected image
        scope.data = null; //null out the data field
        delete scope.videoUrl; //remove the preview video
      };

      scope.onFileSelect = function($files) {
        //$files: an array of files selected, each file has name, size, and type.
        if ($files.length < 1) return;
        selectedFile = $files[0];
        var s3Path = scope.options.path; //S3 path needed when getting S3 Credentials for validation;
        scope.data = {path: s3Path, file: selectedFile};

        //Load the Preview before uploading
        fileReader.readAsDataURL(selectedFile);
      };

      //Prevent accidental file drop
      $document.on("drop", function(event) {
        if (event.target.nodeName != "INPUT") {
          event.preventDefault();
        }
      });

      $document.on("dragover", function( event ) {
        event.preventDefault();
        //Show Drop Target
        element.find(".image-drop").addClass("show-upload");
        element.find(".input[type=file]").addClass("show-upload");
        element.find(".button-menu").addClass("hide-menu");
      });

      $(window).on("mouseleave", function() {
        //Hide Drop Target
        element.find(".image-drop").removeClass("show-upload");
        element.find(".input[type=file]").removeClass("show-upload");
        element.find(".button-menu").removeClass("hide-menu");
      });

      scope.$on('$destroy', function() {
        //event clean up
        $document.off("drop");
        $document.off("dragover");
        $(window).off("mouseleave");
      });

    }
  };
})

;
