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
        <accordion-group class="accordion-group" heading="Location Search" is-open="true"> \
        <input id="zipCode" class="field form-control" placeholder="Zip Code" ng-model="data.zipCode">\
        <input id="searchInput" class="field form-control" placeholder="Search Location" ng-model="request[\'query\']">\
         <select id="radius" ng-options="value as value for value in display.options" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled=""> \
           <option value="3" disabled selected class="">3 Miles</option> \
           <option value="1" label="1 Mile">1 Mile</option> \
           <option value="2" label="2 Miles">2 Miles</option> \
           <option value="3" label="3 Miles">3 Miles</option> \
           <option value="5" label="5 Miles">5 Miles</option> \
           <option value="10" label="10 Miles">10 Miles</option> \
           <option value="20" label="20 Miles">20 Miles</option> \
        	 <option value="30" label="30 Miles">30 Miles</option> \
         </select> \
        <button class="btn" ng-click="doSearch()" ng-model="request.query">Search</button><span class="search-error" ng-if="searchError">{{searchError}}</span>\
        </accordion-group>\
        </accordion> \
        <div class="map-canvas"id="map_canvas"></div> \
        <ul class="selected-location" ng-model="displayedSearchResults" > \
          <li ng-repeat="'+repeatExpression+'" ng-click="updateSelection($index, displayedSearchResults)"> \
            <div class="location-title">{{ item.name }}</div> \
              <span class="search-results">{{item.formatted_address}}</span> \
            <div class="col-sm checkbox-container">\
              <input type="checkbox" ng-attr-id="{{item.place_id}}" ng-model="item.checked" class="field"> \
              <label class="checkbox-label" ng-attr-for="{{item.place_id}}" ></label> \
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
				disabled: '=ngDisabled'
			},
			link: function(scope, element, attrs) {

				var map;
				var milesToMeters = 1609.34;           // Conversion to miles to meters
				var miles = 3;
				var geocoder;
				var radius = miles * milesToMeters;
				var bounds;
				var zoom;
				var markerLocation;
				var infowindow;
				var requestQuery;
				var perviouslySavedLatLng;

				scope.circle = {};                     // displayed cicle boundary
				scope.markers = [];                    // Stored markers
				scope.boundaries = [];                 // Stored google boundary circles
				scope.searchResults = [];              // All data recieved from query
				scope.displayedMarkers = [];           // Markers that match query
				scope.displayedSearchResults = [];     // Data for location list
				scope.isMapLoading = true;
				scope.isLoaded = false;
				scope.placeType = scope.property.display.options.placeType; //Default query value
				if (!scope.data) scope.data = {};

				//Check if scope.data is JSON string and try to parse it to load the data
				if (scope.data && typeof scope.data === 'string') {
					try {
						scope.data = JSON.parse(scope.data);
					} catch (e) {
						console.error(e);
						scope.data = {};
					}
				}

				loadScript().then(function () {
					console.log('scope.data', scope.data);
					bounds = new google.maps.LatLngBounds(); // Set initial bounds for markers
					geocoder = new google.maps.Geocoder();
					infowindow = new google.maps.InfoWindow();
					if(scope.data.query) {
						requestQuery = scope.data.query;
					} else {
						requestQuery = scope.placeType;
					}
					scope.request = {
						radius: radius,
						query: requestQuery,
						types: scope.placeType
					};

					element.html(getTemplate()).show();
					$compile(element.contents())(scope);
					//Checked for saved coordinates
					if(!scope.data.lat && !scope.data.lng) {
						//Initial search with user's location
						LocationService.currentLocation().then(function (position) {
							var pointLocation = {
								lat: position.latitude,
								lng: position.longitude
							};
							zoom = 12;
							scope.request.location = pointLocation;
							scope.reverseGeocode(pointLocation);
							initMap();
						}, function () {
							//Use default location
							var defaultLocation = {
								lat: 39.833333,
								lng: -98.583333
							};
							zoom = 4;
							scope.request.location = defaultLocation;
							scope.reverseGeocode(defaultLocation);
							initMap();
						});
					} else {
						var savedLocation = {
							lat: scope.data.lat,
							lng: scope.data.lng
						};
						zoom = 12;
						scope.request.location = savedLocation;
						initMap();
					}
				}, function () {
					console.error("Error loading Google Maps")
				});

				function initMap() {
					scope.isMapLoading = false;
					scope.isLoaded = true;
					map = new google.maps.Map(document.getElementById('map_canvas'), {
						center: scope.request.location,
						zoom: zoom
					});
					initialize();
				}

				function initialize() {
					initQuery();
				}
				// Search is initialized once user presses search button
				scope.doSearch = function () {
					scope.searchError = null;
					scope.data.query = scope.request.query;
					scope.request.radius = (angular.element('#radius')[0].value) * milesToMeters;
					scope.data.radius = angular.element('#radius')[0].value;
					var zipCode = scope.data.zipCode;
					if (!zipCode || zipCode.length !== 5) {
						scope.searchError = 'Your Zip Code is invalid!';
					} else {
						geocoder = new google.maps.Geocoder();
						geocoder.geocode({
							'address': zipCode
						}, function (results, status) {
							if (status == google.maps.GeocoderStatus.OK) {
								scope.$apply(function () {
									var LatLng = {
										lat: results[0].geometry.location.lat(),
										lng: results[0].geometry.location.lng()
									};
									scope.request.location = LatLng;
									scope.reverseGeocode(LatLng);
									initMap();
								});
							} else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
								console.log("search was not successful for the following reason: " + status);
							} else {
								console.log("search was not successful for the following reason:" + status);
							}
						});
					}
				};

				function initQuery() {
					scope.clearSearch();
					var service = new google.maps.places.PlacesService(map);
					service.textSearch(scope.request, function(results, status) {
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
							console.log("search was not successful for the following reason: " + status);
						}
					});
				}

				scope.reverseGeocode = function (coordinates) {
					geocoder = new google.maps.Geocoder();
					geocoder.geocode({'location': coordinates}, function (results, status) {
						if (status === google.maps.GeocoderStatus.OK) {
							if (results[0]) {
								var resultPlaceId = {
									placeId: results[0].place_id
								};
								scope.getAdditionPlaceInformation(resultPlaceId);
							} else {
								console.log("search was not successful for the following reason: " + status);
							}
						} else {
							console.log("search was not successful for the following reason: " + status);
						}
					});
				};

				function createMarkers(results) {
					if (infowindow) {
						infowindow.close();
					}
					for (var i = 0; i < results.length; i++) {
						scope.searchResults.push(results[i]);
						var text = "Location:  " + results[i].name;
						var marker = new google.maps.Marker({
							map: map,
							position: results[i].geometry.location,
						});
						google.maps.event.addListener(marker, 'click', (function(marker, text) {
							return function() {
								markerLocation = marker.getPosition();
								infowindow.setContent(text);
								infowindow.open(map, marker);
								scope.getClickedMarker(markerLocation);
							}
						})(marker, text));
						scope.markers.push(marker);
					}
				}

				function removeMarkers() {
					for (var i = 0; i < scope.markers.length; i++) {
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

				function displayMarkers() {
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
					if (scope.displayedMarkers.length == 0) {
						scope.searchError = "Couldn't find any locations matching the search criteria!";
					}
				}

				function listSearchResults() {
					for (var i = 0; i < scope.searchResults.length; i++) {
						if (google.maps.geometry.spherical.computeDistanceBetween(scope.searchResults[i].geometry.location, scope.circle.center) < scope.request.radius) {
							//Adds correct results to list view
							scope.displayedSearchResults.push(scope.searchResults[i]);
						}
					}
					if (scope.data.placeId) { // pre-select point if exist
						perviouslySavedLatLng = new google.maps.LatLng(scope.data.lat, scope.data.lng);
						scope.getClickedMarker(perviouslySavedLatLng);
					}
				}

				function clearOverlays() {
					for (var i = 0; i < scope.boundaries.length; i++) {
						scope.boundaries[i].setMap(null);
						scope.boundaries.length = 0;
					}
				}

				scope.getClickedMarker = function(markerLocation) {
					if(scope.displayedSearchResults) {
						for(var i = 0; i < scope.displayedSearchResults.length; i++) {
							if(google.maps.geometry.spherical.computeDistanceBetween(markerLocation, scope.displayedSearchResults[i].geometry.location) == 0) {
								scope.displayedSearchResults[i].checked = true;
								scope.getSelectResultData(scope.displayedSearchResults[i]);
							} else {
								scope.displayedSearchResults[i].checked = false;
							}
						}
						scope.$digest();
					}
				};

				scope.clearSearch = function () {
					removeMarkers();
					clearOverlays();
					scope.searchResults = [];
					scope.displayedMarkers = [];
					scope.displayedSearchResults = [];
					scope.markers = [];
				};

				scope.getAdditionPlaceInformation = function (placeRequest) {
					service = new google.maps.places.PlacesService(map);
					service.getDetails(placeRequest, function(place, status) {
						if (status == google.maps.places.PlacesServiceStatus.OK) {
							if(place.address_components) {
								for(var i = 0; i < place.address_components.length; i++) {
									if(place.address_components[i].types[0] == "postal_code") {
										scope.data.zipCode = place.address_components[i].short_name;
									}
								}
							}
							scope.data.phoneNumber = place.formatted_phone_number;
						} else {
							console.log('The selection made does not exist');
						}
					})
				};

				scope.getSelectResultData = function (item) {
					if (item) {
						var placeRequest = {
							placeId: item.place_id
						};
						scope.data.address = item.formatted_address;
						scope.data.lat = item.geometry.location.lat();
						scope.data.lng = item.geometry.location.lng();
						scope.data.name = item.name;
						scope.data.placeId = placeRequest.placeId;
						//Calls getDetails to get extra information
						scope.getAdditionPlaceInformation(placeRequest);
					}
				};

				scope.updateInfoWindow = function(checkedLocation) {
					var text = "Location:  " + checkedLocation.name;
					var marker = new google.maps.Marker({
						map: map,
						position: checkedLocation.geometry.location
					});
					infowindow.setContent(text);
					infowindow.open(map, marker);
				};
				// Prevents more than one checkbox at a time
				scope.updateSelection = function (selectedIdx, displayedSearchResults) {
					angular.forEach(displayedSearchResults, function (item, index) {
						if (selectedIdx != index) {
							item.checked = false;
						} else {
							item.checked = true;
							scope.updateInfoWindow(item);
							scope.getSelectResultData(item);
						}
					});
				};
			}
		};
	})

;