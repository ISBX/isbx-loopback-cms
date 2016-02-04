angular.module('dashboard.directives.ModelFieldPointsOfInterest', [
		'dashboard.Dashboard.Model.Edit.SaveDialog',
		"dashboard.Config",
		"dashboard.services.Location",
		"ui.bootstrap",
		"dashboard.services.GeneralModel",
		"ui.select"
	])
	
	.directive('modelFieldPointsOfInterestView', function($compile) {
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

  .directive('modelFieldPointsOfInterestEdit', function($compile, $cookies, $timeout, $modal, $http, $q, $window, Config, GeneralModelService, LocationService) {
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
        <accordion close-others="oneAtATime"> \
        <accordion-group id="accordion-group-1" heading="Pharmacy Search" is-open="true"> \
        <input id="zipCode" class="field form-control" placeholder="Zip Code" ng-model="data.zipCode">\
        <input id="searchInput" class="field form-control" placeholder="Search Location" ng-model="request[\'query\']">\
         <select id="radius" ng-options="value as value for value in display.options" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled=""> \
           <option value="" disabled selected class="">Radius</option> \
           <option value="1" label="1 Mile">1 Mile</option> \
           <option value="2" label="2 Miles">2 Miles</option> \
           <option value="3" label="3 Miles">3 Miles</option> \
           <option value="5" label="5 Miles">5 Miles</option> \
           <option value="10" label="10 Miles">10 Miles</option> \
           <option value="20" label="20 Miles">20 Miles</option> \
        	 <option value="30" label="30 Miles">30 Miles</option> \
         </select> \
        <button class="btn" ng-click="doSearch()" ng-model="request.query">Search</button>\
        </accordion-group>\
        </accordion> \
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
				var milesToMeters = 1609.34;           // Conversion to miles to meters
				var miles = 3;
				var geocoder;
				var radius = miles*milesToMeters;
				var bounds;

				scope.circle = {};                     // displayed cicle boundary
				scope.markers = [];                    // Stored markers
				scope.boundaries = [];                 // Stored google boundary circles
				scope.searchResults = [];              // All data recieved from query
				scope.displayedMarkers = [];           // Markers that match query
				scope.displayedSearchResults = [];     // Data for location list
				scope.isMapLoading = true;
				scope.isLoaded = false;
				scope.placeType = scope.property.display.options.placeType; //Default query value
				scope.data = {};

				loadScript().then(function () {
					bounds = new google.maps.LatLngBounds(); // Set initial bounds for markers
					geocoder = new google.maps.Geocoder();

					scope.request = {
						radius: radius,
						query: scope.placeType,
						types: scope.placeType
					};

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
					});
				}, function () {
					console.error("Error loading Google Maps")
				});

				function initMap() {
					scope.isMapLoading = false;
					scope.isLoaded = true;
					map = new google.maps.Map(document.getElementById('map_canvas'), {
						center: scope.request.location,
						zoom: 12
					});
					initialize();
				}

				function initialize() {
					initQuery();
				}
				// Search is initated once user presses search button
				scope.doSearch = function() {
					scope.data.query = scope.request.query;
					scope.request.radius = (angular.element('#radius')[0].value)*milesToMeters;
					scope.data.radius = angular.element('#radius')[0].value;
					var zipCode = scope.data.zipCode;
					if (!zipCode || zipCode.length !== 5) {
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

				function initQuery() {
					scope.clearSearch();
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
						scope.$digest();
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
				}

				function clearOverlays() {
					for (var i = 0; i < scope.boundaries.length; i++ ) {
						scope.boundaries[i].setMap(null);
						scope.boundaries.length = 0;
					}
				}

				scope.clearSearch = function() {
					removeMarkers();
					clearOverlays();
					scope.searchResults = [];
					scope.displayedMarkers = [];
					scope.displayedSearchResults = [];
					scope.markers = [];
				}

				scope.getSelectResultData = function(item) {
					if(item) {
						scope.data.address = item.formatted_address;
						scope.data.lat = item.geometry.location.lat();
						scope.data.lng = item.geometry.location.lng();
						scope.data.name = item.name;
						//Calls getDetails to get extra information
						var placeRequest = {
							placeId: item.place_id
						};
						service = new google.maps.places.PlacesService(map);
						service.getDetails(placeRequest, callback);

						function callback(place, status) {
							if (status == google.maps.places.PlacesServiceStatus.OK) {
								scope.data.phoneNumber = place.formatted_phone_number;
								//Will remove before pull request, showing scope.data
								console.log('scope.data', scope.data);
							}
						}
					} else {
						console.log('The selection made does not exsist');
					}
				}
				// Prevents more than one checkbox at a time
				scope.updateSelection = function(location, displayedSearchResults) {
					angular.forEach(displayedSearchResults, function(item, index) {
						if (location != index) {
							item.checked = false;
						} else {
							scope.getSelectResultData(item);
						}
					});
				}
			}
		};
	})

;