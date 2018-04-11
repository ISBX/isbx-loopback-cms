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
		var template = '\
			<div ng-show="isLoaded">\
			<accordion close-others="oneAtATime">\
			<accordion-group class="accordion-group" heading="Location Search" is-open="true">\
			<div class="row">\
				<div class="col-xs-6">\
					<input id="zipCode" class="field form-control" placeholder="Zip Code" ng-model="request.zipcode" ng-disabled="disabled">\
				</div>\
				<div class="col-xs-6">\
					<select id="radius" ng-model="request.radius" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled="disabled">\
						<option value="1" label="1 Mile">1 Mile</option>\
						<option value="2" label="2 Miles">2 Miles</option>\
						<option value="3" label="3 Miles" selected>3 Miles</option>\
						<option value="5" label="5 Miles">5 Miles</option>\
						<option value="10" label="10 Miles">10 Miles</option>\
						<option value="20" label="20 Miles">20 Miles</option>\
						<option value="30" label="30 Miles">30 Miles</option>\
					</select>\
				</div>\
			</div>\
			<input class="field form-control" placeholder="Search Location" ng-model="request.query" ng-disabled="disabled">\
			<button class="btn btn-default" ng-click="onSearch()" ng-disabled="disabled">Search</button>\
			<span class="search-error" ng-if="searchError">{{ searchError }}</span>\
			</accordion-group>\
			</accordion>\
			<div class="loading" ng-if="isMapLoading"><i class="fa fa-spin fa-spinner"></i>Search results are loading...</div>\
			<div class="sticky">\
				<div class="map-canvas" id="map_canvas"></div>\
			</div>\
			<br>\
			<accordion id="locationList" class="list">\
				<div class="pharmacy-item" ng-repeat="item in list">\
					<div class="pharmacy-checkbox">\
						<input type="checkbox" ng-attr-id="{{ item }}" ng-model="item.checked" ng-click="onClickItem(item)" class="field" ng-disabled="disabled">\
						<label class="checkbox-label" ng-attr-for="{{ item }}" ></label>\
					</div>\
					<div>\
						<accordion-group is-open="item.isOpen" ng-class="{ highlight: item.highlight }">\
							<accordion-heading>\
								<span>{{ $index + 1 }}. {{ item.newPharmacy ? "Add new pharmacy" : item.name }}</span>\
								<i class="pull-right glyphicon" ng-class="{"glyphicon-chevron-down": item.isOpen, "glyphicon-chevron-right": !item.isOpen}"></i>\
							</accordion-heading>\
							<div class="form-group">\
								<label class="control-label">Name</label>\
								<input id="name" class="field form-control" placeholder="Name" ng-model="item.name" ng-change="updateData(item)" ng-disabled="item.disabled">\
							</div>\
							<div class="form-group">\
								<label class="control-label">Address</label>\
								<input id="address" class="field form-control" placeholder="Address" ng-model="item.formatted_address" ng-change="updateData(item)" ng-disabled="item.disabled">\
							</div>\
							<div class="form-group">\
								<label class="control-label">Phone Number</label>\
								<input id="phoneNumber"phone-number country-code="us"\
											maxlength="14" class="field form-control" placeholder="Phone Number" ng-model="item.formatted_phone_number" ng-change="updateData(item)" ng-disabled="item.disabled">\
							</div>\
						</accordion-group>\
					</div>\
				</div>\
			</accordion>';
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
				var defer = $q.defer();
				service.getDetails({ placeId: placeId }, function(place, status) {
					if (status !== google.maps.places.PlacesServiceStatus.OK) {
						return defer.reject('Cannot get details for place ID.');
					}
					defer.resolve(place);
				});
				return defer.promise;
			};

			/**
			 * Get places for specific radius, location and type
			 * @param {object} location 
			 * @param {number} radius 
			 * @param {string} type 
			 */
			var getPlaces = function(request) {
				var data = [];
				var getNextPage = null;
				var defer = $q.defer();
				service.textSearch({
					location: request.location,
					type: request.type,
					radius: request.radius,
					query: request.query
				}, function(places, status, pagination){
					data.push(...places);
					getNextPage = pagination.hasNextPage && function() {
						pagination.nextPage();
					};
					if (status !== google.maps.places.PlacesServiceStatus.OK) {
						return defer.reject('Cannot get places');
					}
					if (!pagination.hasNextPage) {
						defer.resolve(data);
					} else {
						getNextPage();
					}
				});
				return defer.promise;
			};

			/**
			 * Get place using zip code
			 * @param {string} zipcode 
			 */
			var getPlaceByZipcode = function(zipcode) {
				var defer = $q.defer();
				geocoder.geocode({
					address: zipcode
				}, function(places, status) {
					if (status !== google.maps.GeocoderStatus.OK) {
						return defer.reject('Cannot get location');
					}
					defer.resolve(places[0]);
				});
				return defer.promise;
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

			/**
			 * Generate unique id for place that don't have place_id
			 * more like new place of added place
			 */
			var uuidv4 = function() {
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
					return v.toString(16);
				});
			}
			
			// render variables
			scope.isLoaded = false;
			scope.isMapLoading = false;
			scope.radiuses = [1, 2, 3, 5, 10, 20, 30];
			scope.list = [];
			scope.request = {};

			scope.onSearch = function() {
				scope.isMapLoading = true;
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
					getPlaces({
						location: scope.request.location,
						query: scope.request.query,
						radius: radius,
						type: scope.request.type
					}).then(function (places) {
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
						scope.isMapLoading = false;
						createMarkers(map, scope.list);
						scope.selectItem();						
						scope.list.push({
							name: '',
							highlight: false,
							disabled: true,
							checked: false,
							place_id: uuidv4(),
							newPharmacy: true
						});
						scope.$digest();
					}).catch(function (error) {
						scope.isMapLoading = false;
						alert(error);
					});
					
				});
			};

			scope.onClickItem = function(item) {
				if (item.newPharmacy) {
					scope.list = scope.list.map(function (place) {
						if (place.place_id === item.place_id) {
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
				scope.data.placeId = place.newPharmacy ? null : place.place_id; // if new pharmacy remove place id
				scope.data.lat = place.geometry ? place.geometry.location.lat() : scope.data.lat;
				scope.data.lng = place.geometry ? place.geometry.location.lng(): scope.data.lng;
				scope.data.phoneNumber = place.formatted_phone_number;
			};

			scope.selectItem = function() {
				// respect data in scope.data
				// replace the one on the item
				var dataIsOnList = false;
				scope.list = scope.list.map(function(place) {
					if (scope.data.placeId === place.place_id) {
						place.highlight = true;
						place.checked = true;
						place.disabled = false;
						place.formatted_phone_number = scope.data.phoneNumber || place.formatted_phone_number;
						place.formatted_address = scope.data.address || place.formatted_address;
						place.name = scope.data.name || place.name;
						dataIsOnList = true;
					}
					return place;
				});
				if (!dataIsOnList && scope.data.name) {
					scope.list.push({
						name: scope.data.name,
						formatted_address: scope.data.address,
						formatted_phone_number: scope.data.phoneNumber,
						place_id: uuidv4(),
						highlight: true,
						disabled: false,
						checked: true
					});
				}
 				scope.$digest();
			}

			// main
			loadScript(googleApiKey).then(function () {
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
