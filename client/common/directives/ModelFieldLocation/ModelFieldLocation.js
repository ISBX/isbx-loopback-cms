angular.module('dashboard.directives.ModelFieldLocation', [
    'dashboard.Dashboard.Model.Edit.SaveDialog',
    "dashboard.Config",
    "dashboard.services.Location",
    "ui.bootstrap",
    "dashboard.services.GeneralModel",
    "ui.select"
  ])
  .run(function() {
    var googleMapsApiJS = document.createElement('script');
    googleMapsApiJS.type = 'text/javascript';
    googleMapsApiJS.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,places';
    document.getElementsByTagName('head')[0].appendChild(googleMapsApiJS);
  })

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

  .directive('modelFieldLocationEdit', function($compile, $cookies, $timeout, $modal, $http, Config, GeneralModelService, LocationService) {
    function getTemplate() {
      var repeatExpression = 'item in displayedSearchResults';
      var template = ' \
        <div class="loading" ng-if="isMapLoading"><img src="http://www.nasa.gov/multimedia/videogallery/ajax-loader.gif" width="20" height="20" />Search results are loading...</div> \
        <div ng-show="isLoaded"> \
        <input id="zipCode" class="field form-control" placeholder="Zip Code">\
        <input id="searchInput" class="field form-control" placeholder="Search Location">\
        <select id="radius" ng-options="value as value for value in display.options" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled=""> \
          <option value="" disabled selected class="">Radius</option> \
          <option value="1" label="1 Mile">1 Mile</option> \
          <option value="2" label="2 Miles">2 Miles</option> \
          <option value="3" label="3 Miles">3 Miles</option> \
          <option value="5" label="5 Miles">5 Miles</option> \
          <option value="10" label="10 Mile">10 Mile</option> \
          <option value="20" label="20 Miles">20 Miles</option> \
          <option value="30" label="30 Miles">30 Miles</option> \
        </select> \
        <div class="model-field-description" ng-if="display.description">{{ display.description }}</div> \
        <div class="map-canvas"id="map_canvas"></div> \
        <ul class="selected-location" ng-model="displayedSearchResults" > \
          <li ng-repeat="'+repeatExpression+'"> \
            <div class="location-title">{{ item.name }}</div> \
              <span>{{item.formatted_address}}</span> \
            <div class="col-sm checkbox-container">\
              <input type="checkbox" ng-attr-id="{{item.id}}" ng-model="item.checked" ng-click="updateSelection($index, displayedSearchResults)" class="field"> \
              <label class="checkbox-label" ng-attr-for="{{item.id}}" ></label> \
            </div> \
          </li> \
        </ul>';
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
      link: function(scope, element, attrs) {
        scope.circle = {};                     // displayed cicle boundary 
        scope.markers = [];                    // Stored markers
        scope.boundaries = [];                 // Stored google boundary circles
        scope.searchResults = [];              // All data recieved from query
        scope.displayedMarkers = [];           // Markers that match query
        scope.displayedSearchResults = [];     // Data for location list
        scope.isMapLoading = true;
        scope.isLoaded = false;
        scope.placeType = scope.property.display.options.placeType; //Default query value

        var map;
        var milesToMeters = 1609.34;           // Conversion to miles to meters
        var miles = 3;             
        var userSearchInput;
        var radius = miles*milesToMeters;
        var geocoder;
        var bounds = new google.maps.LatLngBounds(); // Sets initial bounds for markers

        scope.request = {
          radius: radius,
          query: scope.placeType,
          types: scope.placeType
        };

        function initMap() {
          scope.isMapLoading = false;
          scope.isLoaded = true;
          map = new google.maps.Map(document.getElementById('map_canvas'), {
            center: scope.request.location,
            zoom: 12
          });
          initialize();
          initQuery();
        }

        function initialize() {
          initSearch();
        }
        // Search is initated once user presses enter within the search input field
        function initSearch() {
          var userQueryElement = document.getElementById('searchInput');
          if (userQueryElement) {
            userQueryElement.onkeypress = function(e) {
              if(e.keyCode == 13) {
                userQuery = userQueryElement.value;
                scope.request.query = userQuery;
                scope.request.radius = (document.getElementById('radius').value)*milesToMeters;
                var zipCode = document.getElementById('zipCode').value;
                if (!zipCode || zipCode.length !== 5) {
                  // May need to implement better error handling 
                  alert('Your zipcode is invalid!');
                } else {
                  geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ 
                  'address': zipCode 
                  }, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                      scope.$apply(function() {
                         var LatLng = {
                          lat: results[0].geometry.location.lat(),
                          lng: results[0].geometry.location.lng()
                       };
                       scope.request.location = LatLng;
                       initMap();
                      });
                    } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                        console.log("Geocode was not successful for the following reason: " + status);
                    } else {
                      console.log("Geocode was not successful for the following reason:" + status);
                    }
                  });
                }
              }
            }
          }
        }

        function initQuery() {
          // Clears results for new query
          scope.searchResults = [];
          scope.displayedMarkers = [];
          scope.displayedSearchResults = [];
          scope.markers = [];
          //Starts Google TextSearch API
          var bounds = new google.maps.LatLngBounds();
          var service = new google.maps.places.PlacesService(map);
          service.textSearch(scope.request, callback); 
        }

        function callback(results, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            createMarkers(results);
            if (scope.boundaries.length > 0) {
              clearOverlays();
            }
            if (scope.markers.length > 0) {
              removeMarkers();
            }
            createCircle();
            displayMarkers();
            listSearchResults();
          } else {
            //May need to handle this..
          }
        }

        function createMarkers(results) {
          for (var i = 0; i < results.length; i++) {
            scope.searchResults.push(results[i]);
            var marker = new google.maps.Marker ({
              map: map,
              position: results[i].geometry.location,
            });
            scope.markers.push(marker);
          } 
        }

        function removeMarkers() {
          for(var i = 0; i < scope.markers.length; i++) {
            scope.markers[i].setMap(null);
          }
        }

        function createCircle() {
          // circle for display
          scope.circle = new google.maps.Circle({
            center: scope.request.location,
            radius: scope.request.radius,
            fillOpacity: 0.15,
            fillColor: "#FF0000",
            map: map
          });
          scope.boundaries.push(scope.circle);
        }

        function displayMarkers(location) {
          for (var i = 0; i < scope.markers.length; i++) {
            if (google.maps.geometry.spherical.computeDistanceBetween(scope.markers[i].getPosition(), scope.circle.center) < scope.request.radius) {
              bounds.extend(scope.markers[i].getPosition());
              map.fitBounds(bounds);
              scope.displayedMarkers.push(scope.markers[i]);
              // Display markers
              scope.markers[i].setMap(map);
            } else {
              // Hide the markers outside of the boundary
              scope.markers[i].setMap(null);
            }
          }
        }

        function listSearchResults(location) {
          for (var i = 0; i < scope.searchResults.length; i++) {
            if (google.maps.geometry.spherical.computeDistanceBetween(scope.searchResults[i].geometry.location, scope.circle.center) < scope.request.radius) {
              //Adds correct results to list view
              scope.displayedSearchResults.push(scope.searchResults[i]);
            }
          }
          scope.$digest();
        }

        function clearOverlays() {
          for (var i = 0; i < scope.boundaries.length; i++ ) {
            scope.boundaries[i].setMap(null);
            scope.boundaries.length = 0;
          }
        }
        // Prevents more than one checkbox at a time
        scope.updateSelection = function(location, displayedSearchResults) {
          angular.forEach(displayedSearchResults, function(item, index) {
            if (location != index) 
              item.checked = false;
          });
        }
  
        element.html(getTemplate()).show();
        $compile(element.contents())(scope);
        //Currently calls LocationService to get user's current location
        LocationService.currentLocation().then(function (position) {
          var pointLocation = {
            lat: position.latitude,
            lng: position.longitude
          };
          scope.request.location = pointLocation;
          initMap(scope.request.location);
        })  
      }
    };
  })

;
