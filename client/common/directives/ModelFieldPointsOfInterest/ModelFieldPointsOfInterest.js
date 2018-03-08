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
	function loadScript(googleApiKey) {
		var deferred = $q.defer();
		if (angular.element('#google_maps').length) {
			deferred.resolve();
			return deferred.promise;
		}
		 var googleMapsApiJS = document.createElement('script');
		document.getElementsByTagName('head')[0].appendChild(googleMapsApiJS);
		googleMapsApiJS.onload = function() {
			deferred.resolve();
		};
		googleMapsApiJS.id = 'google_maps';
		googleMapsApiJS.type = 'text/javascript';

		var url = 'https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=geometry,places';
		if (googleApiKey) url += '&key=' + googleApiKey;
		googleMapsApiJS.src = url;
		return deferred.promise;
	}

	// makes the string lowercase and converts spaces into underscore
	function convertStringToGoogleTypeFormat(str) {
		return str.replace(/ /g,"_").toLowerCase();
	}

	function getTemplate() {
		var repeatExpression = 'item in displayedSearchResults track by item.id';
		var template = `
			<div ng-show="isLoaded">
			<accordion close-others="oneAtATime">
			<accordion-group class="accordion-group" heading="Location Search" is-open="true">
			<div class="row">
				<div class="col-xs-6">
					<input id="zipCode" class="field form-control" placeholder="Zip Code" ng-model="request.zipcode" ng-disabled="disabled">
				</div>
				<div class="col-xs-6">
					<select id="radius" ng-model="request.radius" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled="disabled">
						<option value="1" label="1 Mile">1 Mile</option>
						<option value="2" label="2 Miles">2 Miles</option>
						<option value="3" label="3 Miles" selected>3 Miles</option>
						<option value="5" label="5 Miles">5 Miles</option>
						<option value="10" label="10 Miles">10 Miles</option>
						<option value="20" label="20 Miles">20 Miles</option>
						<option value="30" label="30 Miles">30 Miles</option>
					</select>
				</div>
			</div>
			<input class="field form-control" placeholder="Search Location" ng-model="request.query" ng-disabled="disabled">
			<button class="btn btn-default" ng-click="onSearch()" ng-disabled="disabled">Search</button>
			<span class="search-error" ng-if="searchError">{{ searchError }}</span>
			</accordion-group>
			</accordion>
			<div class="loading" ng-if="isMapLoading"><i class="fa fa-spin fa-spinner"></i>Search results are loading...</div>
			<div class="sticky">
				<div class="map-canvas" id="map_canvas"></div>
			</div>
			<br>
			<accordion class="list">
				<div class="pharmacy-item" ng-repeat="item in list">
					<div class="pharmacy-checkbox">
						<input type="checkbox" ng-attr-id="{{ item.place_id }}" ng-model="item.checked" ng-click="onClickItem(item)" class="field" ng-disabled="disabled">
						<label class="checkbox-label" ng-attr-for="{{ item.place_id }}" ></label>
					</div>
					<div>
						<accordion-group is-open="item.isOpen" ng-class="{ highlight: item.highlight }">
							<accordion-heading>
								<span>{{ $index + 1 }}. {{ item.name }}</span>
								<i class="pull-right glyphicon" ng-class="{'glyphicon-chevron-down': item.isOpen, 'glyphicon-chevron-right': !item.isOpen}"></i>
							</accordion-heading>
							<div class="form-group">
								<label class="control-label">Name</label>
								<input id="name" class="field form-control" placeholder="Name" ng-model="item.name" ng-change="updateData(item)" ng-disabled="item.disabled">
							</div>
							<div class="form-group">
								<label class="control-label">Address</label>
								<input id="address" class="field form-control" placeholder="Address" ng-model="item.formatted_address" ng-change="updateData(item)" ng-disabled="item.disabled">
							</div>
							<div class="form-group">
								<label class="control-label">Phone Number</label>
								<input id="phoneNumber"phone-number country-code="us"
											maxlength="14" class="field form-control" placeholder="Phone Number" ng-model="item.formatted_phone_number" ng-change="updateData(item)" ng-disabled="item.disabled">
							</div>  
						</accordion-group>
					</div>
				</div>
			</accordion>`;
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
			var geocoder;
			var infowindow;
			var service;
			var googleApiKey = scope.property.display.options.googleApiKey;
			
			/**
			 * Create markers for specific map
			 * Bind scope onClickMarker
			 * @param {object} map
			 * @param {array} places
			 */
			var createMarkers = function(map, places) {
				places.forEach(function (place) {
					var marker = new google.maps.Marker({
						map: map,
						position: place.geometry.location
					});
					var placeId = place.place_id;
					marker.addListener('click', function() {
						map.setZoom(15);
						map.setCenter(marker.getPosition());
						scope.onClickItem(place); // bind onclickmarker hehehe
					})
				});
			};

			/**
			 * Create a cicle for specific map, please please create a comment always
			 * @param {object} map
			 * @param {number} radius 
			 * @return {Circle} 
			 */
			var createCircle = function(map, center, radius) {
				return new google.maps.Circle({
					map: map,
					center: center,
					radius: radius,
					fillOpacity: 0.15,
					fillColor: "#FF0000",
					strokeOpacity: 0.5,					
					strokeColor: '#000000',
					strokeWeight: 2,
				})
			};

			/**
			 * Get additional information about the place
			 * @param {*} placeId 
			 */
			var getAdditionalPlaceInformation = function(placeId) {
				return new Promise(function (resolve, reject) {
					service.getDetails({ placeId: placeId }, function(place, status) {
						console.log(status);
						if (status !== google.maps.places.PlacesServiceStatus.OK) {
							reject('Cannot get details for place ID.');
						}
						resolve(place);
					});
				});
			};

			/**
			 * Get places for specific radius, location and type
			 * @param {object} location 
			 * @param {number} radius 
			 * @param {string} type 
			 */
			var getPlaces = function(request) {
				return new Promise(function (resolve, reject) {
					service.textSearch({
						location: request.location,
						type: request.type,
						radius: request.radius,
						query: request.query
					}, function(places, status, pagination){
						if (status !== google.maps.places.PlacesServiceStatus.OK) {
							reject('Cannot get places');
						}
						resolve(places);
					})
				});
			};

			/**
			 * Get place using zip code
			 * @param {string} zipcode 
			 */
			var getPlaceByZipcode = function(zipcode) {
				return new Promise(function (resolve, reject) {
					geocoder.geocode({
						address: zipcode
					}, function(places, status) {
						console.log(status)
						if (status !== google.maps.GeocoderStatus.OK) {
							reject('Cannot get location');
						}
						resolve(places[0]);
					})
				});
			};

			/**
			 * Convert units from and to
			 * @param {string} from 
			 * @param {string} to 
			 * @param {number} number 
			 */
			var convert = function(from, to, number) {
				if (from === 'miles' && to === 'meters') {
					return number * 1609.34;   
				}
				return number;
			}

			// render variables
			scope.isLoaded = false;
			scope.isMapLoading = false;
			scope.radiuses = [1, 2, 3, 5, 10, 20, 30];
			scope.list = [];
			scope.request = {};

			scope.onSearch = function() {
				
				getPlaceByZipcode(scope.request.zipcode).then(function (place) {
					scope.request.location = place.geometry.location;
					map = new google.maps.Map(document.getElementById('map_canvas'), {
						center: place.geometry.location,
						zoom: 12
					});
					service = new google.maps.places.PlacesService(map);

					var radius = convert('miles', 'meters', scope.request.radius);
					var circle = createCircle(map, scope.request.location, radius);				

					// search for places
					getPlaces(scope.request).then(function (places) {
						scope.list = []; // reset						
						places.forEach(function (place) {
							// just to make sure no markers are outside the radius
							// but it also handles by getPlaces function
							var distance = google.maps.geometry.spherical.computeDistanceBetween(place.geometry.location, circle.center);
							if (distance < radius) {
								scope.list.push(place);
							}
							scope.$digest();
							createMarkers(map, scope.list);
						});
					}).catch(function (error) {
						alert(error);
					});
					
				});
			};

			scope.onClickItem = function(item) {
				getAdditionalPlaceInformation(item.place_id).then(function (placeInformation) {
					scope.list = scope.list.map(function (place) {
						if (place.place_id === item.place_id) {
							place = placeInformation;
							place.highlight = true;
							place.checked = true;
							place.disabled = false;
							console.log(place);
						} else {
							place.disabled = true;
							place.checked = false;
							place.highlight = false;
						}
						return place;
					});
					scope.$digest();
				});
			};

			// main
			loadScript(googleApiKey).then(function () {
				console.log('scope.data', scope.data);
				element.html(getTemplate()).show();
				$compile(element.contents())(scope);

				// create services
				geocoder = new google.maps.Geocoder();
				infowindow = new google.maps.InfoWindow();

				// set default values
				scope.request.zipcode = scope.data.zipCode;
				scope.request.radius = scope.data.radius;
				scope.request.type = convertStringToGoogleTypeFormat(scope.property.display.options.placeType);
				scope.request.query = scope.data.query || '';

				scope.isLoaded = true;
				scope.onSearch();

			}).catch(function () {
				console.log('oops loading script, maybe google map error. so sad you cannot search for pharmacy');
			});

			// var map;
			// var milesToMeters = 1609.34;           // Conversion to miles to meters
			// var miles = 3;
			// var geocoder;
			// var radius = miles * milesToMeters;
			// var zoom;
			// var markerLocation;
			// var infowindow;
			// var requestQuery;
			// var perviouslySavedLatLng;

			// scope.circle = {};                     // displayed cicle boundary
			// scope.markers = [];                    // Stored markers
			// scope.boundaries = [];                 // Stored google boundary circles
			// scope.searchResults = [];              // All data recieved from query
			// scope.displayedMarkers = [];           // Markers that match query
			// scope.displayedSearchResults = [];     // Data for location list
			// scope.isMapLoading = false;
			// scope.isLoaded = false;
			// scope.placeType = scope.property.display.options.placeType; //Default query value
			// scope.googleApiKey = scope.property.display.options.googleApiKey;
			// scope.googleType = [convertStringToGoogleTypeFormat(scope.placeType)];
			// scope.initialLoad = true;
			// scope.supportedRaduis = [1, 2, 3, 5, 10, 20, 30];

			// if (!scope.data) scope.data = {};
			// if (scope.property.display.zipCode) scope.data.zipCode = scope.property.display.zipCode; //pass in zip code if available
			// //Check if scope.data is JSON string and try to parse it to load the data
			// if (scope.data && typeof scope.data === 'string') {
			// 	try {
			// 		scope.data = JSON.parse(scope.data);
			// 	} catch (e) {
			// 		console.error(e);
			// 		scope.data = {};
			// 	}
			// }
			// if (!scope.data.radius) scope.data.radius = miles;

			// loadScript(scope.googleApiKey).then(function () {
			// 	console.log('scope.data', scope.data);
			// 	geocoder = new google.maps.Geocoder();
			// 	infowindow = new google.maps.InfoWindow();
			
			// 	scope.request = {
			// 		radius: radius,
			// 		type: scope.googleType
			// 	};

			// 	element.html(getTemplate()).show();
			// 	$compile(element.contents())(scope);
			// 	/**
			// 	 * Disabled browser geolocation
			// 	 */
			// 	//Checked for saved coordinates
			// 	// if(!scope.data.lat && !scope.data.lng) {
			// 	// 	//Initial search with user's location
			// 	// 	LocationService.currentLocation().then(function (position) {
			// 	// 		var pointLocation = {
			// 	// 			lat: position.latitude,
			// 	// 			lng: position.longitude
			// 	// 		};
			// 	// 		zoom = 12;
			// 	// 		scope.request.location = pointLocation;
			// 	// 		scope.reverseGeocode(pointLocation);
			// 	// 		initMap();
			// 	// 	}, function () {
			// 	// 		//Use default location
			// 	// 		var defaultLocation = {
			// 	// 			lat: 39.833333,
			// 	// 			lng: -98.583333
			// 	// 		};
			// 	// 		zoom = 4;
			// 	// 		scope.request.location = defaultLocation;
			// 	// 		scope.reverseGeocode(defaultLocation);
			// 	// 		initMap();
			// 	// 	});
			// 	// } else {
			// 	// 	var savedLocation = {
			// 	// 		lat: scope.data.lat,
			// 	// 		lng: scope.data.lng
			// 	// 	};
			// 	// 	zoom = 12;
			// 	// 	scope.request.location = savedLocation;
			// 	// 	initMap();
			// 	// }

			// 	scope.isLoaded = true;
			// 	scope.doSearch();

			// }, function () {
			// 	console.error("Error loading Google Maps");
			// });

			// function initMap() {
			// 	scope.isLoaded = true;
			// 	map = new google.maps.Map(document.getElementById('map_canvas'), {
			// 		center: scope.request.location,
			// 		zoom: zoom
			// 	});
			// 	initialize();
			// }

			// function initialize() {
			// 	initQuery();
			// }
			// // Search is initialized once user presses search button
			// scope.doSearch = function () {
			// 	scope.searchError = null;
			// 	scope.data.query = scope.request.query;
			// 	scope.request.radius = scope.data.radius * milesToMeters;
			// 	var zipCode = scope.data.zipCode;
			// 	if (!zipCode || zipCode.length !== 5) {
			// 		scope.searchError = 'Your Zip Code is invalid!';
			// 	} else {
			// 		geocoder = new google.maps.Geocoder();
			// 		geocoder.geocode({
			// 			'address': zipCode
			// 		}, function (results, status) {
			// 			if (status == google.maps.GeocoderStatus.OK) {
			// 				scope.$apply(function () {
			// 					var LatLng = {
			// 						lat: results[0].geometry.location.lat(),
			// 						lng: results[0].geometry.location.lng()
			// 					};
			// 					scope.request.location = LatLng;
			// 					scope.reverseGeocode(LatLng);
			// 					initMap();
			// 				});
			// 			} else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
			// 				console.log("search was not successful for the following reason: " + status);
			// 			} else {
			// 				console.log("search was not successful for the following reason:" + status);
			// 			}
			// 		});
			// 	}
			// };

			// function initQuery() {
			// 	scope.isMapLoading = true;
			// 	scope.clearSearch();

			// 	/*  DEV NOTES: Hack to ensure that most all results fall within our original radius
			// 	 TEXT SEARCH URL: https://developers.google.com/maps/documentation/javascript/places#place_search_responses
			// 	 DOCUMENTATION: "You may bias results to a specified circle by passing a location and a radius parameter.
			// 	 Results outside the defined area may still be displayed!"    - Google Maps */
			// 	var request = jQuery.extend(true, {}, scope.request);
			// 	request.radius = 0.5*request.radius;

			// 	var service = new google.maps.places.PlacesService(map); 
			// 	service.textSearch(request, function(results, status, pagination) {
			// 		var currentMilesInMeters = (scope.request.radius / milesToMeters);
			// 		var currentMileIndex = scope.supportedRaduis.indexOf(currentMilesInMeters);

			// 		if (status == google.maps.places.PlacesServiceStatus.OK) {
			// 			createMarkers(results);
			// 			if (scope.boundaries.length > 0) {
			// 				clearOverlays();
			// 			}
			// 			if (scope.markers.length > 0) {
			// 				removeMarkers();
			// 			}

			// 			// Get next page results
			// 			scope.getNextPage = pagination.hasNextPage && function() {
			// 				pagination.nextPage();
			// 			};

			// 			$timeout(function() {
			// 				if (scope.getNextPage) {
			// 					console.log('Getting additional results.');
			// 					scope.getNextPage();
			// 				} else {
			// 					// Results are greater than threshold or exceeded 30Mile Range
			// 					if (results.length >= 20 || currentMileIndex >= 6) {
			// 						console.log('Displaying results.');
			// 						scope.isMapLoading = false;
			// 						createCircle();
			// 						displayMarkers();
			// 						listSearchResults();
			// 						console.log('Reached treshold on: ' + currentMilesInMeters);
			// 						scope.data.radius = scope.supportedRaduis[currentMileIndex];
			// 					} else {
			// 						console.log('Increasing mile range');
			// 						scope.request.radius = (milesToMeters * scope.supportedRaduis[currentMileIndex+1]);
			// 						initQuery();
			// 					}
			// 				}
			// 			}, 500);
					
			// 		} else {
			// 			if (currentMileIndex <= 6) {
			// 				console.log('Increasing mile range');
			// 				scope.request.radius = (milesToMeters * scope.supportedRaduis[currentMileIndex+1]);
			// 				initQuery();
			// 			} else {
			// 				// Results exceeded 30Mile Range
			// 				console.log("search was not successful for the following reason: " + status);
			// 			}
			// 		}
			// 	});
			// }

			// scope.reverseGeocode = function (coordinates) {
			// 	geocoder = new google.maps.Geocoder();
			// 	geocoder.geocode({'location': coordinates}, function (results, status) {
			// 		if (status === google.maps.GeocoderStatus.OK) {
			// 			if (results[0]) {
			// 				var resultPlaceId = {
			// 					placeId: results[0].place_id
			// 				};
			// 				scope.getAdditionPlaceInformation(resultPlaceId, function(error, place) {
			// 					if (error) return;
			// 					for(var i = 0; i < place.address_components.length; i++) {
			// 						if(place.address_components[i].types[0] == "postal_code") {
			// 							scope.data.zipCode = place.address_components[i].short_name;
			// 						}
			// 					}
			// 					scope.data.phoneNumber = place.formatted_phone_number || scope.data.phoneNumber;
			// 				});
			// 			} else {
			// 				console.log("search was not successful for the following reason: " + status);
			// 			}
			// 		} else {
			// 			console.log("search was not successful for the following reason: " + status);
			// 		}
			// 	});
			// };

			// function createMarkers(results) {
			// 	if (infowindow) {
			// 		infowindow.close();
			// 	}
			// 	for (var i = 0; i < results.length; i++) {
			// 		scope.searchResults.push(results[i]);
			// 		var text = "Location:  " + results[i].name;
			// 		var placeId = results[i].place_id;
			// 		var marker = new google.maps.Marker({
			// 			map: map,
			// 			position: results[i].geometry.location,
			// 		});
			// 		google.maps.event.addListener(marker, 'click', (function(marker, text) {
			// 			return function() {
			// 				markerLocation = marker.getPosition();
			// 				infowindow.setContent(text);
			// 				infowindow.open(map, marker);
			// 				scope.initialLoad = false;
			// 				if(!scope.disabled) scope.getClickedMarker(markerLocation, placeId);
			// 			}
			// 		})(marker, text));
			// 		scope.markers.push(marker);
			// 	}
			// }

			// function removeMarkers() {
			// 	for (var i = 0; i < scope.markers.length; i++) {
			// 		scope.markers[i].setMap(null);
			// 	}
			// }

			// function createCircle() {
			// 	// circle for display
			// 	scope.circle = new google.maps.Circle({
			// 		center: scope.request.location,
			// 		radius: scope.request.radius,
			// 		fillOpacity: 0.15,
			// 		fillColor: "#FF0000",
			// 		map: map
			// 	});
			// 	scope.boundaries.push(scope.circle);
			// }

			// function displayMarkers() {
			// 	var bounds = new google.maps.LatLngBounds(); // Set initial bounds for markers
			// 	for (var i = 0; i < scope.markers.length; i++) {
			// 		var marker = scope.markers[i];
			// 		var result = scope.searchResults[i];
			// 		var distance = google.maps.geometry.spherical.computeDistanceBetween(marker.getPosition(), scope.circle.center);
			// 		if (distance < scope.request.radius) {
			// 			bounds.extend(marker.getPosition());	
			// 			scope.displayedMarkers.push(marker);
			// 			// Display markers
			// 			marker.setMap(map);

			// 			result.highlight = false;
			// 			result.disabled = true;
			// 			result.address = result.formatted_address;				
			// 			//Adds correct results to list view
			// 			scope.displayedSearchResults.push(result);
			// 		} else {
			// 			// Hide the markers outside of the boundary
			// 			marker.setMap(null);
			// 		}
			// 	}

			// 	map.fitBounds(bounds);
			// 	if (scope.displayedMarkers.length == 0) {
			// 		scope.searchError = "Couldn't find any locations matching the search criteria!";
			// 	}
			// 	if (scope.data.placeId) { // pre-select point if exist
			// 		perviouslySavedLatLng = new google.maps.LatLng(scope.data.lat, scope.data.lng);
			// 		scope.getClickedMarker(perviouslySavedLatLng, scope.data.placeId);
			// 	}
			// }

			// function listSearchResults() {
			// 	// for (var i = 0; i < scope.searchResults.length; i++) {
			// 	// 	var result = scope.searchResults[i];
			// 	// 	var distance = google.maps.geometry.spherical.computeDistanceBetween(result.geometry.location, scope.circle.center);
			// 	// 	if (distance < scope.request.radius) {
			// 	// 		result.highlight = false;
			// 	// 		result.disabled = true;
			// 	// 		result.address = result.formatted_address;				
			// 	// 		//Adds correct results to list view
			// 	// 		scope.displayedSearchResults.push(result);
			// 	// 	}
			// 	// }
			// 	// if (scope.data.placeId) { // pre-select point if exist
			// 	// 	perviouslySavedLatLng = new google.maps.LatLng(scope.data.lat, scope.data.lng);
			// 	// 	scope.getClickedMarker(perviouslySavedLatLng);
			// 	// }
			// }

			// function clearOverlays() {
			// 	for (var i = 0; i < scope.boundaries.length; i++) {
			// 		scope.boundaries[i].setMap(null);
			// 		scope.boundaries.length = 0;
			// 	}
			// }

			//  scope.updateData = function(item) {
			// 	scope.data.phoneNumber = item.phoneNumber;
			// 	scope.data.address = item.address;
			// 	scope.data.name = item.name;
			// }

			// scope.getClickedMarker = function(markerLocation, placeId) {
			// 	if(scope.displayedSearchResults) {
			// 		for(var i = 0; i < scope.displayedSearchResults.length; i++) {
			// 			if(
			// 					google.maps.geometry.spherical.computeDistanceBetween(markerLocation, scope.displayedSearchResults[i].geometry.location) == 0 &&
			// 					scope.data.placeId === scope.displayedSearchResults[i].place_id
			// 				) {
			// 				scope.displayedSearchResults[i].checked = true;
			// 				scope.displayedSearchResults[i].highlight = true;
			// 				scope.displayedSearchResults[i].disabled = false;
			// 				scope.displayedSearchResults[i].name = scope.data.name;							
			// 				scope.displayedSearchResults[i].formatted_address = scope.data.address;
			// 				scope.displayedSearchResults[i].address = scope.data.address;
			// 				scope.displayedSearchResults[i].phoneNumber = scope.data.phoneNumber;
			// 				if (!scope.initialLoad) {
			// 					scope.getSelectResultData(scope.displayedSearchResults[i]);
			// 				}
			// 			} else {
			// 				scope.displayedSearchResults[i].checked = false;
			// 				scope.displayedSearchResults[i].highlight = false;
			// 				scope.displayedSearchResults[i].disabled = true;
			// 			}

			// 			if (placeId === scope.displayedSearchResults[i].place_id) {
			// 				scope.displayedSearchResults[i].highlight = true;
			// 			}
			// 		}
			// 		scope.$digest();
			// 	}
			// };


			// scope.clearSearch = function () {
			// 	removeMarkers();
			// 	clearOverlays();
			// 	scope.searchResults = [];
			// 	scope.displayedMarkers = [];
			// 	scope.displayedSearchResults = [];
			// 	scope.markers = [];
			// };

			// scope.getAdditionPlaceInformation = function (placeRequest, callback) {
			// 	service = new google.maps.places.PlacesService(map);
			// 	service.getDetails(placeRequest, function(place, status) {
			// 		if (status == google.maps.places.PlacesServiceStatus.OK) {
			// 			callback(null, place);
			// 			return;
			// 		} else {
			// 			callback(new Error('The selection made does not exist'));
			// 			return;
			// 		}
			// 	});
			// };

			// scope.getSelectResultData = function (item) {
			// 	if (item) {
			// 		var placeRequest = {
			// 			placeId: item.place_id
			// 		};
			// 		scope.data.address = item.formatted_address;
			// 		scope.data.lat = item.geometry.location.lat();
			// 		scope.data.lng = item.geometry.location.lng();
			// 		scope.data.name = item.name;
			// 		scope.data.placeId = placeRequest.placeId;
			// 		//Calls getDetails to get extra information
			// 		scope.getAdditionPlaceInformation(placeRequest, function(error, place) {
			// 			if (error) return;
			// 			for(var i = 0; i < place.address_components.length; i++) {
			// 				if(place.address_components[i].types[0] == "postal_code") {
			// 					scope.data.zipCode = place.address_components[i].short_name;
			// 				}
			// 			}
			// 			scope.data.phoneNumber = place.formatted_phone_number;
			// 			item.phoneNumber = place.formatted_phone_number;
			// 		});
			// 	}
			// };

			// scope.updateInfoWindow = function(checkedLocation) {
			// 	var text = "Location:  " + checkedLocation.name;
			// 	var marker = new google.maps.Marker({
			// 		map: map,
			// 		position: checkedLocation.geometry.location
			// 	});
			// 	infowindow.setContent(text);
			// 	infowindow.open(map, marker);
			// };
			// // Prevents more than one checkbox at a time
			// scope.updateSelection = function (selectedIdx, displayedSearchResults) {
			// 	if(scope.disabled) return;
			// 	angular.forEach(displayedSearchResults, function (item, index) {
			// 		item.highlight = false;
			// 		if (selectedIdx != index) {
			// 			item.checked = false;
			// 			item.disabled = true;
			// 		} else {
			// 			item.checked = true;
			// 			item.disabled = false;
			// 			scope.updateInfoWindow(item);
			// 			scope.getSelectResultData(item);
			// 		}
			// 	});
			// };
		}
	};
})

;
