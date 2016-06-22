angular.module('dashboard.directives.ModelFieldFile', [
  "dashboard.services.GeneralModel"
])

.directive('modelFieldFileView', function($compile) {
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

.directive('modelFieldFileEdit', function($compile, $document, $window, GeneralModelService, SessionService) {
  return {
    restrict: 'E',
    template: '<button class="btn btn-default select-file" ng-hide="disabled">Select File</button> \
      <input type="file" ng-file-select="onFileSelect($files)" ng-hide="disabled"> \
      <span class="file-upload-info" ng-if="filename"><i class="fa {{getFileIcon(filename)}}"></i>&nbsp;&nbsp;{{ filename }}&nbsp;&nbsp;<span ng-if="fileUrl">(<a href="{{fileUrl}}">download</a> | <a target="_blank" href="{{previewUrl}}">preview</a>)</span></span> \
      <div ng-file-drop="onFileSelect($files)" ng-file-drag-over-class="optional-css-class-name-or-function" ng-show="dropSupported" class="file-drop">Drop File Here</div>',
    scope: {
      key: "=key",
      options: '=options',
      disabled: '=disabled',
      data: '=ngModel',
      modelData: '=modelData'
    },
    link: function(scope, element, attrs) {

        /**
         * scope.data updates async from controller so need to watch for the first change only
         */
        var unwatch = scope.$watch('data', function(data) {
          if (data) {
            unwatch(); //Remove the watch
            if (scope.data && scope.data && scope.data.filename) {
              //expects scope.data to be an object with {filename, fileUrl}
              scope.filename = scope.data.filename;
              scope.fileUrl = scope.data.fileUrl;
              scope.previewUrl = scope.data.previewUrl;
            } else if (typeof scope.data === 'string') {
              scope.fileUrl = scope.data.replace(/%2F/g, "/");
              var pos = scope.fileUrl.lastIndexOf("/");
              scope.filename = scope.fileUrl.substring(pos+1);
            } else if (typeof scope.data.file === 'object') {
              var s3Path = scope.options.path; //S3 path needed when getting S3 Credentials for validation;
              scope.data = {path: s3Path, file: scope.data.file};
              scope.filename = scope.data.file.name;
              scope.fileUrl = null;
              scope.previewUrl = null;
            }
          }
       });
      
        scope.getFileIcon = function(filename) {
          var extension = filename.substring(filename.lastIndexOf("."));
          switch(extension.toLowerCase()) {
          case ".txt":
            return "fa-file-text-o";
          case ".doc":
          case ".docx":
            return "fa-file-word-o";
          case ".wav":
          case ".mp3":
          case ".aif":
            return "fa-file-audio-o";
          case ".m4v":
          case ".mov":
          case ".mp4":
          case ".avi":
            return "fa-file-video-o";
          case ".jpg":
          case ".jpeg":
          case ".png":
          case ".gif":
          case ".bmp":
          case ".tif":
            return "fa-file-image-o";
          case ".xls":
          case ".xlsx":
             return "fa-file-excel-o";
          case ".ppt":
          case ".pptx":
             return "fa-file-excel-o";
          case ".pdf":
             return "fa-file-pdf-o";
          default:
            return "fa-file-o";
          }
        };

        scope.onFileSelect = function($files) {
          //$files: an array of files selected, each file has name, size, and type.
          if ($files.length < 1) return;
          var selectedFile = $files[0];
          var s3Path = scope.options.path; //S3 path needed when getting S3 Credentials for validation;
          scope.data = {path: s3Path, file: selectedFile};
          scope.filename = selectedFile.name;
          scope.fileUrl = null;

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
          element.find(".file-drop").addClass("show");
        });
        
        $(window).on("mouseleave", function() {
          //Hide Drop Target
          element.find(".file-drop").removeClass("show");
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
