angular.module('dashboard.directives.ModelFieldLocation', [
    'dashboard.Dashboard.Model.Edit.SaveDialog',
    "dashboard.Config",
    "dashboard.services.Location",
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

  .directive('modelFieldLocationEdit', function($compile, $cookies, $timeout, $modal, $http, $q, $window, Config, GeneralModelService, LocationService) {
    
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
      var repeatExpression = 'item in displayedSearchResults track by item.id';
      var template = ' \
        <div class="loading" ng-if="isMapLoading"><img src="http://www.nasa.gov/multimedia/videogallery/ajax-loader.gif" width="20" height="20" />Search results are loading...</div> \
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
          <accordion close-others="oneAtATime">\
            <accordion-group heading="Geocode">\
              <input class="field form-control" placeholder="Location" ng-model="geocodeSearch.value">\
              <div ng-if="geocodeError">{{geocodeError}}</div>\
              <button class="btn" ng-click="doGeocode()" ng-disabled="!geocodeSearch.value">Go</button>\
            </accordion-group>\
            <accordion-group heading="Place Search" is-open="placeSearchOpen">\
              <input id="searchInput" class="field form-control" placeholder="Search" ng-model="request[\'query\']">\
              <select id="radius" ng-options="value as value.label for value in radiusOptions | orderBy: \'value\'" ng-model="request[\'radius\']" class="field form-control"></select> \
              <!--<div>\
                <label class="checkbox-inline" ng-repeat="placeType in placeTypeOptions">\
                  <input type="checkbox" value="{{placeType}}" ng-checked="request.types.indexOf(placeType) > -1" ng-click="togglePlaceType(placeType)"> {{placeType}}\
                </label>\
              </div>-->\
              <button class="btn" ng-click="doSearch()" ng-model="request.query">Search</button> <button class="btn btn-primary" ng-disabled="!(markers && markers.length)" ng-click="clearSearch()">Clear</button>\
              <h4 ng-if="displayedSearchResults && displayedSearchResults.length">Results</h3>\
              <div class="list-group" ng-model="displayedSearchResults"> \
                <a ng-repeat="'+repeatExpression+'" class="list-group-item" ng-click="selectResult(item)" ng-class="{active:item.geometry.location.lat() == data.lat && item.geometry.location.lng() == data.lng}"> \
                  <div class="location-title">{{ item.name }}</div> \
                  <span>{{item.formatted_address}}</span> \
                </a> \
              </div>\
              <span ng-if="hasSearched && (!displayedSearchResults || !displayedSearchResults.length)">No results to display</span>\
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
        disabled: '=disabled'
      },
      link: function(scope, element, attrs) {

        var map;
        var milesToMeters = 1609.34;           // Conversion to miles to meters
        var miles = 3;             
        var userSearchInput;
        var radius = 3;
        var geocoder;
        var selectedMarker;
        var bounds;
        var originalValue;

        scope.circle = {};                     // displayed cicle boundary 
        scope.markers = [];                    // Stored markers
        scope.boundaries = [];                 // Stored google boundary circles
        scope.searchResults = [];              // All data recieved from query
        scope.displayedMarkers = [];           // Markers that match query
        scope.displayedSearchResults = [];     // Data for location list
        scope.isMapLoading = true;
        scope.isLoaded = false;
        scope.geocodeSearch = {value:''};
        scope.hasSearched = false;
        scope.geocodeError = null;

        scope.placeTypeOptions = ["accounting","airport","amusement_park","aquarium","art_gallery","atm","bakery","bank","bar","beauty_salon","bicycle_store","book_store","bowling_alley","bus_station","cafe","campground","car_dealer","car_rental","car_repair","car_wash","casino","cemetery","church","city_hall","clothing_store","convenience_store","courthouse","dentist","department_store","doctor","electrician","electronics_store","embassy","establishment","finance","fire_station","florist","food","funeral_home","furniture_store","gas_station","general_contractor","grocery_or_supermarket","gym","hair_care","hardware_store","health","hindu_temple","home_goods_store","hospital","insurance_agency","jewelry_store","laundry","lawyer","library","liquor_store","local_government_office","locksmith","lodging","meal_delivery","meal_takeaway","mosque","movie_rental","movie_theater","moving_company","museum","night_club","painter","park","parking","pet_store","pharmacy","physiotherapist","place_of_worship","plumber","police","post_office","real_estate_agency","restaurant","roofing_contractor","rv_park","school","shoe_store","shopping_mall","spa","stadium","storage","store","subway_station","synagogue","taxi_stand","train_station","travel_agency","university","veterinary_care","zoo"];
        scope.radiusOptions = [
          {value:1, label: "1 Mile"},
          {value:2, label: "2 Miles"},
          {value:3, label: "3 Miles"},
          {value:4, label: "5 Miles"},
          {value:10, label: "10 Miles"},
          {value:20, label: "20 Miles"},
          {value:30, label: "30 Miles"}
        ];

        loadScript().then(function () {
            
            bounds = new google.maps.LatLngBounds(); // Set initial bounds for markers
            geocoder = new google.maps.Geocoder();

            //  Allow intializing a search from property.display.options
            var placeTypes = [];
            if(scope.property.display.options.placeType) {
              placeTypes = angular.isArray(scope.property.display.options.placeType) ? scope.property.display.options.placeType : [scope.property.display.options.placeType];
            }

            var query = '';
            if( scope.property.display.options.query ) {
              query = scope.property.display.options.query;
            }

            var radius = scope.radiusOptions[1];
            if(scope.property.display.options.radius) {
              var customRadius = null;
              angular.forEach(scope.radiusOptions,function(item){
                if(item.value==scope.property.display.options.radius) {
                  customRadius = item;
                }
              });
              if(!customRadius) {
                customRadius = {value:scope.property.display.options.radius,label:scope.property.display.options.radius + " Miles"};
                scope.radiusOptions.push(customRadius);
              }
              radius = customRadius;
            }

            //  Whether or not the place search is initially open
            scope.placeSearchOpen = (scope.property.display.options.placeType!=undefined || scope.property.display.options.query!=undefined);

            //  Place Search request
            scope.request = {
              radius: radius,
              query: query,
              types: placeTypes 
            };

            //  Render template
            element.html(getTemplate()).show();
            $compile(element.contents())(scope);

            //  If there is a value for this field, show a marker for it,
            //  otherwise geolocate the user using browser's location api
            if(scope.data) {
              originalValue = scope.data;
              scope.request.location = angular.copy(scope.data);
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
            console.error("Error loading Google Maps")
        });

        function initMap() {
          scope.isMapLoading = false;
          scope.isLoaded = true;
          map = new google.maps.Map(angular.element('#map_canvas')[0], {
            center: scope.request.location,
            zoom: 12
          });
          initialize();
        }

        function initialize() {
          initQuery();
          initSelectedMarker();
        }

        scope.doSearch = function() {
          var placeService = new google.maps.places.PlacesService(map);
          var params = angular.copy(scope.request);
          params.radius = params.radius.value * milesToMeters;
          if(params.query && params.radius && params.location) {
            scope.clearSearch();
            placeService.textSearch(params, function callback(results, status) {
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
                scope.hasSearched = true;
                scope.$digest();
              } else if (status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                alert('No results');
              } else {
                //May need to handle this..
              }
            }); 
          }
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
        }

        function initQuery() {
          // Clears results for new query
          scope.clearSearch();
          scope.doSearch();
        }

        function initSelectedMarker() {
          //update marker
          if(scope.data) {
            if(!selectedMarker) {
              var pinColor = "2F76EE";
              selectedMarker = new google.maps.Marker({
                position: scope.request.location,
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
              selectedMarker.setMap(map)
              map.setCenter(LatLng);
            }
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
            radius: scope.request.radius.value*milesToMeters,
            fillOpacity: 0.15,
            fillColor: "#FF0000",
            map: map
          });
          scope.boundaries.push(scope.circle);
        }

        function displayMarkers(location) {
          if(selectedMarker) bounds.extend(selectedMarker.getPosition());
          for (var i = 0; i < scope.markers.length; i++) {
            if (google.maps.geometry.spherical.computeDistanceBetween(scope.markers[i].getPosition(), scope.circle.center) < (scope.request.radius.value * milesToMeters)) {
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
            if (google.maps.geometry.spherical.computeDistanceBetween(scope.searchResults[i].geometry.location, scope.circle.center) < (scope.request.radius.value * milesToMeters)) {
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

        scope.selectResult = function(item) {
          if(scope.selectedResult != item) {
            scope.data = {lat:item.geometry.location.lat(),lng:item.geometry.location.lng()}
          } else {
            scope.data = originalValue;
          }
        }

        scope.clearSearch = function() {
          removeMarkers();
          clearOverlays();
          scope.searchResults = [];
          scope.displayedMarkers = [];
          scope.displayedSearchResults = [];
          scope.markers = [];
          scope.hasSearched = false;
        }

        scope.revertValue = function() {
          if( originalValue ) scope.data = originalValue;
        }

        scope.togglePlaceType = function(type) {
          var index = scope.request.types.indexOf(type);
          if(index>-1) {
            scope.request.types.splice(index);
          }else{
            scope.request.types.push(type);
          }
        }
      }
    };
  })

;
