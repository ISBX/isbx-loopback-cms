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
						scope.onClickItem(place); // bind onclickmarker
					})
				});
			};

			/**
			 * Create a cicle for specific map
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
					console.log(scope.request);					
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
								place.highlight = false;
								place.disabled = true;
								place.checked = false;
								scope.list.push(place);
							}
						});
						scope.selectItem();
						createMarkers(map, scope.list);
						scope.list.push({
							name: 'Add new pharmacy',
							highlight: false,
							disabled: true,
							checked: false,
							place_id: 0
						});
						scope.$digest();
					}).catch(function (error) {
						alert(error);
					});
					
				});
			};

			scope.onClickItem = function(item) {
				if (!item.place_id) {
					scope.list = scope.list.map(function (place) {
						if (!place.place_id) {
							place.highlight = true;
							place.checked = true;
							place.disabled = false;
						} else {
							place.disabled = true;
							place.checked = false;
							place.highlight = false;
						}
						return place;
					});
				} else {
					getAdditionalPlaceInformation(item.place_id).then(function (placeInformation) {
						scope.list = scope.list.map(function (place) {
							if (place.place_id === item.place_id) {
								place = placeInformation;
								place.highlight = true;
								place.checked = true;
								place.disabled = false;
								scope.updateData(place);
							} else {
								place.disabled = true;
								place.checked = false;
								place.highlight = false;
							}
							return place;
						});
						scope.$digest();
					});
				}
			};

			scope.updateData = function(place) {
				scope.data.address = place.formatted_address;
				scope.data.name = place.name;
				scope.data.placeId = place.place_id;
				scope.data.lat = place.geometry ? place.geometry.location.lat() : scope.data.lat;
				scope.data.lng = place.geometry ? place.geometry.location.lng(): scope.data.lng;
				scope.data.phoneNumber = place.formatted_phone_number;
			};

			scope.selectItem = function() {
				// respect data in scope.data
				// replace the one on the item
				scope.list = scope.list.map(function(place) {
					if (scope.data.placeId === place.place_id) {
						place.highlight = true;
						place.checked = true;
						place.disabled = false;
						place.formatted_phone_number = scope.data.phoneNumber || place.formatted_phone_number;
						place.formatted_address = scope.data.address || place.formatted_address;
						place.name = scope.data.name || place.name;
					}
					return place;
				});
				scope.$digest();
			}

			// main
			loadScript(googleApiKey).then(function () {
				console.log('scope.data', scope.data);
				element.html(getTemplate()).show();
				$compile(element.contents())(scope);

				// create services
				geocoder = new google.maps.Geocoder();
				infowindow = new google.maps.InfoWindow();

				scope.data = scope.data || {};

				// set default values
				scope.request.zipcode = scope.data.zipCode || '90712';
				scope.request.radius = scope.data.radius || 1;
				scope.request.type = convertStringToGoogleTypeFormat(scope.property.display.options.placeType);
				scope.request.query = scope.data.query || '';

				scope.isLoaded = true;
				scope.onSearch();

			}).catch(function () {
				console.log('oops loading script, maybe google map error.');
			});
		}
	};
})

;
