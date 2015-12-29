angular.module('dashboard.directives.ModelFieldLocation', [
    'dashboard.Dashboard.Model.Edit.SaveDialog',
    "dashboard.Config",
    "ui.bootstrap",
    "dashboard.services.GeneralModel",
    "ui.select"
  ])
  .run(function() {
    var googleMapsApiJS = document.createElement('script');
    var str = 90019;
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

  .directive('modelFieldLocationEdit', function($compile, $cookies, $timeout, $modal, Config, GeneralModelService) {
    function getTemplate() {
      var repeatExpression = 'item in displayedSearchResults';
      var template = ' \
        <select id="radius" ng-options="value as value for value in display.options" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled=""> \
          <option value="" disabled selected class="">Radius</option> \
          <option value="1" label="1 Mile">1 Mile</option> \
          <option value="5" label="5 Miles">5 Miles</option> \
          <option value="10" label="10 Miles">10 Miles</option> \
          <option value="20" label="20 Miles">20 Miles</option> \
        </select> \
        <input id="zipCode" class="field form-control" placeholder="Zip Code">\
        <input id="searchInput" class="field form-control" placeholder="Search Location">\
        <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
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

        var map;
        var pointLocation;                     // starting location, based on user's location
        var location;  
        var radius;
        var circle;
        scope.markers = [];
        scope.boundaries = [];                 // Stored google boundary circles
        scope.searchResults = [];              // All data recieved from query
        scope.displayedMarkers = [];           // Markers that match query
        scope.displayedSearchResults = [];     // Data for location list
        var meters = 0.00062137;               // Conversion to meter to miles

        function initMap() {

          var geocoder = new google.maps.Geocoder();
          var infoWindow = new google.maps.InfoWindow({map: map});

          map = new google.maps.Map(document.getElementById('map_canvas'), {
            center: pointLocation,
            zoom: 8
          });
          // HTML5 geolocator
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              var pointLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };

              infoWindow.setPosition(pointLocation);
              infoWindow.setContent('Location found.');
              map.setCenter(pointLocation);
            }, function() {
              handleLocationError(true, infoWindow, map.getCenter());
            });
          } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map.getCenter());
          }

          function handleLocationError(browserHasGeolocation, infoWindow, pointLocation) {
            infoWindow.setPosition(pointLocation);
            infoWindow.setContent(browserHasGeolocation ?
                                  'Error: The Geolocation service failed.' :
                                  'Error: Your browser doesn\'t support geolocation.');
          }
          // Search is initated once user presses enter within the search input field
          document.getElementById('searchInput').onkeypress = function(e) {
            if(e.keyCode == 13) {
              var userSearchInput = document.getElementById('searchInput').value;
              var zipCode = document.getElementById('zipCode').value;
              var miles = document.getElementById('radius').value;
              radius = miles/meters;
      
              if (!zipCode || zipCode.length !== 5) {
                // May need to implement better error handling 
                alert('Your zipcode is invalid!');
              } else {
                geocoder.geocode({ 
                  'address': zipCode 
                }, function(results, status) {
                  if (status == google.maps.GeocoderStatus.OK) {
                    location = results[0].geometry.location;

                    var request = {
                      location: location,
                      radius: radius,
                      types: [scope.options.placeTypes],
                      query: userSearchInput
                    };

                    service = new google.maps.places.PlacesService(map);
                    service.textSearch(request, callback);
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

        function callback(results, status) {
          if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
              scope.searchResults.push(results[i]);

              var marker = new google.maps.Marker ({
                  map: map,
                  position: results[i].geometry.location,
              });

              scope.markers.push(marker);
            }
            if (scope.boundaries.length > 0) {
              clearOverlays();
            }
            // circle for display
            circle = new google.maps.Circle({
              center:location,
              radius: radius,
              fillOpacity: 0.15,
              fillColor: "#FF0000",
              map: map
            });

            scope.boundaries.push(circle);
            var bounds = new google.maps.LatLngBounds();
              for (var i = 0; i < scope.markers.length; i++) {
                if (google.maps.geometry.spherical.computeDistanceBetween(scope.markers[i].getPosition(),location) < radius) {
                  bounds.extend(scope.markers[i].getPosition())
                  scope.displayedMarkers.push(scope.markers[i]);
                  // Display markers
                  scope.markers[i].setMap(map);
                } else {
                  // Hide the markers outside of the boundary
                  scope.markers[i].setMap(null);
                }
              }
              scope.listSearchResults(scope.searchResults);
          } else {
            console.log('something went wrong!');
          }
        }
        scope.listSearchResults = function(searchResults) {
          for (var i = 0; i < searchResults.length; i++) {
            if (google.maps.geometry.spherical.computeDistanceBetween(searchResults[i].geometry.location,location) < radius) 
              // Adds correct results to display
              scope.displayedSearchResults.push(searchResults[i]);
              scope.$digest();
          }
        }
        // Removed boundaries on next query
        function clearOverlays() {
          for (var i = 0; i < scope.boundaries.length; i++ ) {
            scope.boundaries[i].setMap(null);
          }
          scope.boundaries.length = 0;
        }
        // Prevents more than one checkbox at a time
        scope.updateSelection = function(location, displayedSearchResults) {
          angular.forEach(displayedSearchResults, function(item, index) {
            if (location != index) 
              item.checked = false;
          });
        }
        
        element.html(getTemplate(scope.options.choiceTemplate, scope.options.matchTemplate)).show();
        $compile(element.contents())(scope);
        initMap();

      }
    };
  })

;
