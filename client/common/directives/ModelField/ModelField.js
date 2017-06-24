angular.module('dashboard.directives.ModelField', [
  'dashboard.directives.ModelFieldImage',
  'dashboard.directives.ModelFieldVideo',
  'dashboard.directives.ModelFieldFile',
  'dashboard.directives.ModelFieldReference',
  'dashboard.directives.ModelFieldReferenceSort',
  'dashboard.directives.ModelFieldList',
  'dashboard.directives.ModelFieldWYSIWYG',
  'dashboard.directives.ModelFieldCanvas',
  'dashboard.directives.ModelFieldLocation',
  'dashboard.directives.ModelFieldPointsOfInterest',
  'dashboard.directives.ModelFieldMultiSelect',
  'dashboard.directives.ModelFieldNumber',
  'dashboard.directive.DateTimePicker',
  'ngCookies',
  'ngSlider',
  'ngSignaturePad',
  'cwill747.phonenumber',
  'monospaced.elastic'
])

.directive('modelFieldView', function($compile) {
  "ngInject";

  function getTemplate(type) {
    var template = '';
    switch(type) {
      default:
        template = '<b>{{ field.label }}</b>: {{ data[field.name] }}';
    }
    return template;
  }
  return {
    restrict: 'E',
    scope: {
      key: '=key',
      model: '=model',
      data: '=ngModel'
    },
    link: function(scope, element, attrs) {
        element.html(getTemplate(scope.field.type)).show();
        $compile(element.contents())(scope);
    }
  };
})

.directive('modelFieldEdit', function($compile) {
  "ngInject";

  function getTemplate(type, scope) {
    var template = '';
    switch(type) {
      case 'reference':
        // depends on directive modelFieldReferenceEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-reference-edit key="key" property="property" options="display.options" model-data="data" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"  /> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>' ;
        break;
      case 'reference-sort':
        // depends on directive modelFieldReferenceSortEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-reference-sort-edit key="key" property="property" options="display.options" model-data="data" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"  /> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div> \
          <label class="col-sm-2 control-label"></label> \
          <div class="col-sm-10"> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'list':
        // depends on directive modelFieldListEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-list-edit key="key" property="property" options="display.options" model-data="data" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"  /> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div> \
          <label class="col-sm-2 control-label"></label> \
          <div class="col-sm-10"> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'file':
        // depends on directive modelFieldFileEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-file-edit key="key" options="display.options" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" class="field" /> \
          </div> \
          <br /> \
          <label class="col-sm-2 control-label place-holder-file-label"></label> \
          <div class="col-sm-10"> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'image':
        // depends on directive modelFieldImageEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-image-edit key="key" options="display.options" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" class="field" /> \
          </div>\
          <label class="col-sm-2 control-label"></label> \
          <div class="col-sm-10"> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'video':
        // depends on directive modelFieldImageEdit
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-video-edit key="key" options="display.options" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" class="field" /> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'datetime':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label> \
          <div class="col-sm-10"> \
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <p class="date-picker input-group"> \
              <input type="text" class="form-control" \
              control="dateControl" \
              min-date="{{ display.minDate }}" \
              max-date="{{ display.maxDate }}" \
              ng-model="data[key]" \
              default-date="{{data[key]}}" \
              ng-format="display.options.format" \
              ng-time-zone="display.options.timeZone" \
              ng-view-mode="display.options.viewMode" \
              ng-required="{{ model.properties[key].required }}" ng-disabled="{{ display.readonly }}" \
              data-date-time-picker \
               /> \
              <span class="input-group-btn"> \
                <button type="button" class="btn btn-default" ng-click="dateControl.show()" ng-disabled="{{ display.readonly }}"><i class="fa fa-calendar"></i></button> \
              </span>\
            </p> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'multi-select':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10 multi-select">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-multi-select key="key" property="property" options="display.options" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" class="field" />\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'select':
        var ngOptions = 'key as value for (key, value) in display.options';
        if (scope.property.display.options instanceof Array) {
          //Handle when options is array of objects containing key/value pair
          if (typeof scope.property.display.options[0] === 'object' && !Array.isArray(scope.property.display.options[0])) {
            ngOptions = 'item.key as item.value disable when item.disabled for item in display.options'
          } else {
            //Handle when options is a an array vs key/value pair object
            ngOptions = 'value as value for value in display.options';
          }
        }
        //NOTE: need to add empty <option> element to prevent weird AngularJS select issue when handling first selection
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <select ng-model="data[key]" ng-options="'+ngOptions+'" ng-required="{{ model.properties[key].required }}" class="field form-control" ng-disabled="{{ display.readonly }}"><option value=""></option></select>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'radio':
        var ngRepeat = '(value, text) in display.options';
        if (scope.property.display.options instanceof Array) {
          //Handle when options is array of objects containing key/value pair
          if (typeof scope.property.display.options[0] === 'object' && !Array.isArray(scope.property.display.options[0])) {
            ngRepeat = 'item in display.options'
          } else {
            //Handle when options is a an array vs key/value pair
            ngRepeat = 'text in display.options';
          }
        }
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10 multi-select">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <div class="select-item checkbox-container" ng-repeat="'+ngRepeat+'" >\
              <input type="radio" ng-attr-id="{{key+\'-\'+$index}}" ng-model="data[key]" ng-value="value || text || item.key" ng-disabled="{{ display.readonly }}" name="{{key}}">\
              <label ng-attr-for="{{key+\'-\'+$index}}" class="radio">{{text || item.value}}</label>\
            </div>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'slider':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <input slider ng-model="data[key]" options="display.options" class="slider ng-isolate-scope ng-valid ng-hide ng-dirty"> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'boolean':
        template = '<div class="col-sm-2"></div> \
          <div class="col-sm-10 checkbox-container">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <input type="checkbox" ng-attr-id="{{key}}" ng-model="data[key]" ng-checked="check(data, key)" class="field" ng-disabled="{{ display.readonly }}">\
            <label class="checkbox-label" ng-attr-for="{{key}}">{{ display.label || key }}</label>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'password':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <input type="password" ng-model="data[key]" ng-pattern="display.pattern" ng-disabled="{{ display.readonly }}" ng-required="{{ model.properties[key].required }}" class="field form-control">\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'textarea':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <textarea msd-elastic ng-model="data[key]" ng-keyup="lengthCheck($event)" ng-disabled="{{ display.readonly }}" ng-required="{{ model.properties[key].required }}" class="field form-control" ng-maxlength="{{ display.maxLength }}"></textarea>\
            <div class="model-field-description">\
              <span ng-if="display.description"> {{ display.description }} </span> \
              <span ng-if="display.maxLength"> &nbsp({{ charsLeft }} characters left) </span>\
            </div>\
          </div>';
        break;
      case 'wysiwyg':
      case 'WYSIWYG':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-wysiwyg-edit key="key" property="property" options="display.options" model-data="data" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"  /> \
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'draw':
      case 'signature':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-canvas-edit key="key" property="property" options="display.options" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"></model-field-canvas-edit>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'location':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-location-edit key="key" property="property" options="display.options" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"></model-field-location-edit>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'poi':
      case 'POI':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <model-field-points-of-interest-edit key="key" property="property" options="display.options" ng-model="data[key]" class="field" ng-required="{{ model.properties[key].required }}" ng-disabled="display.readonly"></model-field-points-of-interest-edit>\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'number':
        template = '<model-field-number key="key" property="property" options="display.options" ng-required="model.properties[key].required" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" ng-error="onFieldError(error)" class="field" ng-class="{error: display.error.length > 0}" />';
        // template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
        //   <div class="col-sm-10">\
        //     <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
        //     <model-field-number key="key" property="property" options="display.options" ng-required="model.properties[key].required" ng-disabled="display.readonly" model-data="data" ng-model="data[key]" ng-error="onFieldError(error)" class="field" ng-class="{error: display.error.length > 0}" />\
        //     <div class="model-field-description" ng-if="display.description">{{ display.description }} {{count}}</div>\
        //   </div>';
        break;
      case 'phoneNumber':
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <input type="hidden" ng-model="countrycode" value="{{ display.region }}" />\
            <input type="text" ng-model="data[key]" phone-number country-code="countrycode" ng-pattern="display.pattern" ng-disabled="{{ display.readonly }}" ng-required="{{ model.properties[key].required }}" class="field form-control">\
            <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
          </div>';
        break;
      case 'text':
      default:
        template = '<label class="col-sm-2 control-label">{{ display.label || key }}:</label>\
          <div class="col-sm-10">\
            <div class="error-message" ng-if="display.error.length > 0">{{ display.error }}</div>\
            <div ng-class="{\'input-status-indicator\': display.showStatusIndicator}">\
              <input type="text" ng-model="data[key]" ng-keyup="lengthCheck($event)" ng-pattern="display.pattern" ng-disabled="{{ display.readonly }}" ng-required="{{ model.properties[key].required }}" class="field form-control" ng-maxlength="{{ display.maxLength }}">\
              <div class="field-status-indicator" ng-if="display.showStatusIndicator">\
                <i class="fa" ng-class="{\'fa-check\': display.isValid && !display.isLoading, \'fa-warning\': !display.isValid && !display.isLoading, \'fa-spinner rotating\': display.isLoading}"></i>\
              </div>\
            </div>\
            <div class="model-field-description">\
              <span ng-if="display.description"> {{ display.description }} </span> \
              <span ng-if="display.maxLength"> &nbsp({{ charsLeft }} characters left) </span>\
            </div>\
          </div>';
    }
    return template;
  }

  function addInputAttributes(element, inputAttr) {
    var $input = $(element).find('input');
    if (inputAttr && $input) {
      for(var attr in inputAttr) {
        $input.attr(attr, inputAttr[attr]);
      }
    }
  }

  return {
    restrict: 'E',
    scope: {
      key: '=key',
      model: '=model',
      data: '=ngModel',
      ngError: '&'
    },
    link: function(scope, element, attrs) {

      var property;

      function init() {

        scope.onFieldError = onFieldError;

        //In situations where edit form has fields not in the model json properties object (i.e. ModelFieldReference multi-select)
        if(scope.key !== null && typeof scope.key === 'object') {
          if (!scope.model.properties[scope.key.property]) {
            scope.model.properties[scope.key.property] = {};
          }
          //override default display logic
          scope.model.properties[scope.key.property].display = scope.key;
          scope.key = scope.key.property;
        }

        property = { display: {type: "text"} };
        if (scope.model.properties && scope.model.properties[scope.key]) property = scope.model.properties[scope.key];
        if (!property) {
          console.log("ModelField link error: no property for model '" + scope.model.name + "'; property key = '" + scope.key + "' found!");
          return; //ABORT if no property definition
        }
        if (!property.display || !property.display.type) {
          if (!property.display) property.display = {};
          //TODO: check the property definition in the loopback model and pick a better default "type"
          switch (property.type) {
            case "date":
            case "Date":
              property.display.type = "datetime";
              break;
            default: property.display.type = "text"; break;
          }
        }

        //Initialize the various Field Type custom logic
        initFieldType(property);

        //See if there is a default value
        if (!scope.data[scope.key] && (property["default"] || typeof property["default"] === 'number')) {
          scope.data[scope.key] = property["default"];
        }

        //scope variables needed for the HTML Template
        scope.property = property;
        scope.display = property.display;

        if (property.display.editTemplate) {
          element.html(property.display.editTemplate).show();
        } else {
          element.html(getTemplate(property.display.type, scope)).show();
        }
        // add input attributes if specified in schema
        addInputAttributes(element, scope.property.display.inputAttr);

        if (scope.display.pattern && scope.display.pattern[0] == '/' && scope.display.pattern[scope.display.pattern.length-1] == '/') {
          //As of Angular 1.6 upgrade ng-pattern does not accept leading and trailing / in string regex; angular uses new RegExp() which does not accept / characters
          scope.display.pattern = scope.display.pattern.slice(1, scope.display.pattern.length-2);
        }

        $compile(element.contents())(scope);
      }

      function onFieldError(error) {
        if (error && error.message) {
          property.display.error = error.message;
        } else {
          delete property.display.error;
        }
        if (scope.ngError) scope.ngError({error: error});
      }

      function initFieldType() {
        
        // TODO: implement a required field validation popup - issue relates to sharing data object, but not same scopes

        if (property.display.type === 'text' || property.display.type === 'textarea') {
          var length = scope.data[scope.key] ? scope.data[scope.key].length : 0;
          scope.charsLeft = property.display.maxLength - length; /*calculate outside of function so we have a starting value */

          // validate text length
          scope.lengthCheck = function(e) {
            scope.charsLeft = property.display.maxLength - e.target.value.length;
            if (property.display.maxLength && e.target.value.length > property.display.maxLength) {
              scope.display.error = "Text is longer than the maximum allowed length of " + scope.display.maxLength + " characters.";
              if (scope.ngError) scope.ngError({error: new Error(scope.display.error)});
              return;
            } else {
              if (scope.display.error === "This is a required field.") {
                // do nothing - kind of a hack
                return
              }
              delete scope.display.error;
              if (scope.ngError) scope.ngError({error: null});
              return;
            }
          }
        }

        if (property.display.type == 'file' && scope.data[scope.key]) {
          //Check if image file is uploaded and convert schema property display type to image
          var filename = scope.data[scope.key];
          if (typeof filename === 'object' && filename.filename) filename = filename.filename;
          else if (typeof filename === 'object' && filename.file) filename = filename.file.name;
          if (filename) {
            var extension = filename.toLowerCase().substring(filename.length-4);
            if (extension == '.png' || extension == '.jpg' || extension == 'jpeg' || extension == '.bmp') {
              property = angular.copy(property); //we don't want changes the schema property to persist outside of this directive
              property.display.type = 'image';
            }
          }
        }

        //Set default date format
        if (property.display.type == "datetime") {
          if (!property.display.options) property.display.options = {};
          if (!property.display.options.format) property.display.options.format = "YYYY-MM-DD  h:mm A";
        }

        if (!scope.data[scope.key] && property.display.defaultValueUsingModelKey) {
          scope.data[scope.key] = scope.data[property.display.defaultValueUsingModelKey];
        }

        if (scope.data[scope.key] && property.display.convertToLocalTime === false) {
          //remove the 'Z' from the end of the timestamp so that it is not converted to local time
          scope.data[scope.key] = scope.data[scope.key].substring(0, scope.data[scope.key].length-1);
        }

        if (property.display.type == "boolean") {
          scope.check = function(data, key) {
            //This function is needed to accept string '1' and numeric 1 values when state changes
            var value = data[key];
            if (value == undefined || value == null) return property.display.default;
            data[key] = value == '1' || value == 1; //Fixes a bug where data[key] changes from bool to string can cause checkbox to get unchecked
            return data[key];
          }
          //Make sure boolean (checkbox) values are numeric (below only gets called on init and not when state changes)
          if (typeof scope.data[scope.key] === "string") scope.data[scope.key] = parseInt(scope.data[scope.key]);
        }

        if (property.display.type == "slider") {
          if (typeof scope.data[scope.key] === 'undefined' || scope.data[scope.key] == null) {
            scope.data[scope.key] = property.display.options.from + ";" + property.display.options.to;
          }
        }
      }

      init();

    }
  };
})

;
