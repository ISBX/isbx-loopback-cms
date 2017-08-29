angular.module('dashboard.directives.ModelFieldLocation', [
  "dashboard.services.Location",
  "ui.bootstrap",
  "dashboard.services.GeneralModel"
])
.directive('modelFieldLocationView', function($compile) {
  "ngInject";

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

.directive('modelFieldLocationEdit', function($compile, $q, LocationService) {
  "ngInject";

  //  load google maps javascript asynchronously
  function loadScript() {
    var deferred = $q.defer();
    if(angular.element('#google_maps').length ) {
      deferred.resolve();
      return deferred.promise;
    }
    var googleMapsApiJS = document.createElement('script');
    googleMapsApiJS.onload = function() {
      deferred.resolve();
    };
    googleMapsApiJS.id = 'google_maps';
    googleMapsApiJS.type = 'text/javascript';
    googleMapsApiJS.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,places';
    document.getElementsByTagName('head')[0].appendChild(googleMapsApiJS);
    return deferred.promise;
  }

  function getTemplate() {
    var template = ' \
      <div class="loading" ng-if="isMapLoading"><img src="http://www.nasa.gov/multimedia/videogallery/ajax-loader.gif" width="20" height="20" />Loading your location...</div> \
      <div ng-show="isLoaded"> \
        <div class="row">\
          <div class="cols" ng-class="{\'col-sm-5\':valueChanged,\'col-sm-6\':!valueChanged}">\
            <input id="geoPointLat" class="field form-control" placeholder="Lat" ng-model="data.lat">\
          </div>\
          <div class="cols" ng-class="{\'col-sm-5\':valueChanged,\'col-sm-6\':!valueChanged}">\
            <input id="geoPointLng" class="field form-control" placeholder="Lng" ng-model="data.lng">\
          </div>\
          <div class="cols col-sm-2" ng-show="valueChanged">\
            <button class="btn" ng-click="revertValue()" ng-disabled="!valueChanged">Revert</button>\
          </div>\
        </div>\
        <div class="map-canvas" id="map_canvas"></div>\
        <accordion close-others="oneAtATime" ng-if="showGeocode">\
          <accordion-group heading="Geocode">\
            <input class="field form-control" placeholder="Location" ng-model="geocodeSearch.value">\
            <div ng-if="geocodeError">{{geocodeError}}</div>\
            <button class="btn" ng-click="doGeocode()" ng-disabled="!geocodeSearch.value">Go</button>\
          </accordion-group>\
        </accordion>\
      </div>';
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
    link: function(scope, element, attrs) {

      var map;
      var miles = 3;
      var userSearchInput;
      var radius = 3;
      var geocoder;
      var selectedMarker;
      var originalValue;

      scope.isMapLoading = true;
      scope.isLoaded = false;
      scope.geocodeSearch = {value:''};
      scope.geocodeError = null;
      scope.showGeocode = false;

      loadScript().then(function () {

          geocoder = new google.maps.Geocoder();

          scope.showGeocode = false;
          if(scope.property.display.options && scope.property.display.options.allowGeocode ) {
            scope.showGeocode = true;
          }

          var query = '';
          if(scope.property.display.options && scope.property.display.options.query ) {
            query = scope.property.display.options.query;
          }

          //  Render template
          element.html(getTemplate()).show();
          $compile(element.contents())(scope);

          //  If there is a value for this field, show a marker for it,
          //  otherwise geolocate the user using browser's location api
          if(scope.data) {
            originalValue = scope.data;
            scope.location = angular.copy(scope.data);
            initMap();
          } else {
            //Currently calls LocationService to get user's current location
            LocationService.currentLocation().then(function (position) {
                var pointLocation = {
                  lat: position.latitude,
                  lng: position.longitude
                };
                originalValue = pointLocation;
                scope.data = pointLocation;
                initMap();
              });
          }

          //  Watch for changes to field value and update corresponding map marker
          scope.$watch('data',function(newVal,oldVal){
            if(newVal!=oldVal) {
              scope.valueChanged = JSON.stringify(scope.data)!=JSON.stringify(originalValue);
              initSelectedMarker();
            }
          });

          scope.$watch('data.lat',function(newVal,oldVal){
            if(newVal!=oldVal) {
              scope.valueChanged = JSON.stringify(scope.data)!=JSON.stringify(originalValue);
              initSelectedMarker();
            }
          });

          scope.$watch('data.lng',function(newVal,oldVal){
            if(newVal!=oldVal) {
              scope.valueChanged = JSON.stringify(scope.data)!=JSON.stringify(originalValue);
              initSelectedMarker();
            }
          });

      }, function () {
          console.error("Error loading Google Maps");
      });

      function initMap() {
        scope.isMapLoading = false;
        scope.isLoaded = true;
        map = new google.maps.Map(angular.element('#map_canvas')[0], {
          center: scope.location,
          zoom: 12
        });
        initialize();
      }

      function initialize() {
        initSelectedMarker();
      }

      scope.doGeocode = function() {
        scope.geocodeError = null;
        if (!scope.geocodeSearch.value) {
          // May need to implement better error handling
          alert('Please enter the address of a location to geocode.');
        } else {
          geocoder.geocode({
            'address': scope.geocodeSearch.value
            }, function(results, status) {
              if (status == google.maps.GeocoderStatus.OK) {
                scope.$apply(function() {
                   var LatLng = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                 };
                 scope.data = LatLng;
                 initMap();
                });
              } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                  console.log("Geocode was not successful for the following reason: " + status);
              } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
                  scope.geocodeError = "Couldn't match the specified query with a geopoint";
                  scope.$digest();
                  console.log("Geocode was not successful for the following reason: " + status);
              } else {
                console.log("Geocode was not successful for the following reason:" + status);
              }
            });
        }
      };

      function initSelectedMarker() {
        //update marker
        if(scope.data) {
          if(!selectedMarker) {
            var pinColor = "2F76EE";
            selectedMarker = new google.maps.Marker({
              position: scope.location,
              map: map,
              icon: new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
                  new google.maps.Size(21, 34),
                  new google.maps.Point(0,0),
                  new google.maps.Point(10, 34)),
              draggable: true,
              tooltip: "Current location"
            });
            google.maps.event.addListener(selectedMarker, 'dragend', function() {
              var LatLng = {
                  lat: selectedMarker.position.lat(),
                  lng: selectedMarker.position.lng()
               };
              scope.data = LatLng;
              scope.$digest();
            });
          } else {
            var LatLng = new google.maps.LatLng(scope.data.lat,scope.data.lng);
            selectedMarker.setPosition(LatLng);
            selectedMarker.setMap(map);
            map.setCenter(LatLng);
          }
        }
      }

      scope.clearSearch = function() {
        scope.hasSearched = false;
      };

      scope.revertValue = function() {
        if( originalValue ) scope.data = originalValue;
      };
    }
  };
})

;
