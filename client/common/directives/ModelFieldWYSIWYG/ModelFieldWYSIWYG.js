angular.module('dashboard.directives.ModelFieldWYSIWYG', [
  "dashboard.Config",
  "ui.bootstrap",
  "dashboard.services.GeneralModel",
  "ui.select"
])

  .directive('modelFieldWysiwygView', function($compile) {
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

  .directive('modelFieldWysiwygEdit', function($compile, $cookies, $timeout, Config, GeneralModelService) {
    function getTemplate() {
      var template = '\
        <div class="wysiwyg-toolbar" data-role="editor-toolbar" data-target=".wysiwyg-editor" ng-hide="disabled">\
          <!--\
          <div class="btn-group">\
            <a class="btn btn-default dropdown-toggle" data-toggle="dropdown" title="Font Size"><i class="fa fa-text-height"></i>&nbsp;<b class="caret"></b></a>\
            <ul class="dropdown-menu">\
              <li><a data-edit="fontSize 7">24 pt</a></li>\
              <li><a data-edit="fontSize 6">18 pt</a></li>\
              <li><a data-edit="fontSize 5">16 pt</a></li>\
              <li><a data-edit="fontSize 4">14 pt</a></li>\
              <li><a data-edit="fontSize 3">12 pt</a></li>\
              <li><a data-edit="fontSize 2">10 pt</a></li>\
              <li><a data-edit="fontSize 1">7 pt</a></li>\
            </ul>\
          </div>\
          <div class="btn-group">\
            <a class="btn btn-default dropdown-toggle color-picker" data-toggle="dropdown" title="Font Color"><i class="color-sample"></i>&nbsp;<b class="caret"></b></a>\
            <div class="dropdown-menu input-append">\
              <input type="color" class="font-color-picker" value="#000" />\
            </div>\
          </div>\
          -->\
          <div class="btn-group">\
            <a class="btn btn-default" data-edit="bold" title="Bold (Ctrl/Cmd+B)"><i class="fa fa-bold"></i></a>\
            <a class="btn btn-default" data-edit="italic" title="Italic (Ctrl/Cmd+I)"><i class="fa fa-italic"></i></a>\
            <a class="btn btn-default" data-edit="underline" title="Underline (Ctrl/Cmd+U)"><i class="fa fa-underline"></i></a>\
          </div>\
          <div class="btn-group">\
            <a class="btn btn-default" data-edit="insertunorderedlist" title="Bullet list"><i class="fa fa-list-ul"></i></a>\
            <a class="btn btn-default" data-edit="insertorderedlist" title="Number list"><i class="fa fa-list-ol"></i></a>\
            <a class="btn btn-default" data-edit="outdent" title="Reduce indent (Shift+Tab)"><i class="fa fa-dedent"></i></a>\
            <a class="btn btn-default" data-edit="indent" title="Indent (Tab)"><i class="fa fa-indent"></i></a>\
          </div>\
          <div class="btn-group">\
            <a class="btn btn-default" data-edit="justifyleft" title="Align Left (Ctrl/Cmd+L)"><i class="fa fa-align-left"></i></a>\
            <a class="btn btn-default" data-edit="justifycenter" title="Center (Ctrl/Cmd+E)"><i class="fa fa-align-center"></i></a>\
            <a class="btn btn-default" data-edit="justifyright" title="Align Right (Ctrl/Cmd+R)"><i class="fa fa-align-right"></i></a>\
            <a class="btn btn-default" data-edit="justifyfull" title="Justify (Ctrl/Cmd+J)"><i class="fa fa-align-justify"></i></a>\
          </div>\
          <div class="btn-group">\
            <span class="dropdown">\
            <a class="btn btn-default" data-original-title="Hyperlink" ng-click="toggleDropdown($event)"><i class="fa fa-link"></i></a>\
            <div class="menu">\
              <input class="form-control" placeholder="URL" type="text" data-edit="createLink">\
              <button class="btn btn-default add-button" type="button">Add</button>\
            </div></span>\
          </div>\
          <div class="btn-group">\
            <a class="btn btn-default picture-tool" title="Insert picture (or just drag & drop)"><i class="fa fa-picture-o"></i><input type="file" class="wysiwyg-picture-input" data-role="magic-overlay" data-target=".wysiwyg-toolbar .picture-tool" data-edit="insertImage" /></a>\
          </div>\
          <div class="btn-group">\
            <a class="btn btn-default" data-edit="undo" title="Undo (Ctrl/Cmd+Z)"><i class="fa fa-undo"></i></a>\
            <a class="btn btn-default" data-edit="redo" title="Redo (Ctrl/Cmd+Y)"><i class="fa fa-repeat"></i></a>\
          </div>\
        </div>\
        <div class="wysiwyg-editor"></div>\
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
        scope.toggleDropdown = function(event) {
          var $element = $(event.currentTarget).parent().find('.menu');
          if ($element.hasClass('open')) {
            $element.removeClass('open');
          } else {
            $element.addClass('open');
          }
        };

        element.html(getTemplate()).show();
        $compile(element.contents())(scope);

        var $wysiwyg = $(element).find('.wysiwyg-editor');
        if (!scope.disabled) $wysiwyg.wysiwyg({hotKeys: {}});

        $(element).find('.wysiwyg-toolbar [data-role=magic-overlay]').each(function () {
          var overlay = $(this), target = $(overlay.data('target'));
          overlay.css({opacity: 0, position: 'absolute', width: "42px", height: "30px" }).offset(target.offset()).width(target.outerWidth()).height(target.outerHeight());
        });

        ngModel.$render = function() {
          $wysiwyg.html(ngModel.$viewValue || "");
        };

        $wysiwyg.bind("blur keyup change", function() {
          scope.$apply(function() {
            ngModel.$setViewValue($wysiwyg.html());
          });
        });
      }
    };
  })

;
