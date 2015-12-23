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
    googleMapsApiJS.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&key=AIzaSyAXb10b6Gq_DnFJ6qWqFtleyxK8Qqd3uGg&libraries=geometry,places';
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
    function getTemplate(matchTemplate, choiceTemplate) {
      var repeatExpression = '(index, item) in selectedList';
      var template = ' \
                <input id="searchInput" class="field form-control" placeholder="Search Location" style="margin-bottom: 10px;">\
                <input id="zipCode" class="field form-control" placeholder="Zip Code" style="margin-bottom: 10px;">\
                <select id="radius" ng-options="value as value for value in display.options" ng-required="" class="field form-control ng-pristine ng-valid ng-valid-required" ng-disabled="" style="margin-bottom: 10px;"> \
                  <option value="" disabled selected class="">Radius</option> \
                  <option value="1" label="1 Mile">1 Mile</option> \
                  <option value="5" label="5 Miles">5 Miles</option> \
                  <option value="10" label="10 Miles">10 Miles</option> \
                  <option value="20" label="20 Miles">20 Miles</option> \
                </select> \
                <div class="model-field-description" ng-if="display.description">{{ display.description }}</div>\
                <div id="map_canvas" style="height: 220px; background-color: #d3d3d3;"></div> \
                <ui-select on-select="onSelect($item, $model)" ng-model="selected.item" style="margin-bottom: 10px;"> \
                    <ui-select-match placeholder="{{ options.placeholder }}">'+ matchTemplate +' \
                        <span ng-bind="$select.selected.name"></span> \
                    </ui-select-match> \
                    <ui-select-choices repeat="item in (displayedSearchResults | filter: $select.search) track by item.id">' + choiceTemplate + ' \
                        <span ng-bind="item.name"></span> \
                    </ui-select-choices> \
                </ui-select> \
                <ul ui-sortable="sortableOptions" ng-model="displayedSearchResults"> \
                  <li ng-repeat="'+repeatExpression+'"> \
                    <i class="fa fa-reorder"></i>\
                    <div class="title">' + choiceTemplate + '</div> \
                    <div class="action"> \
                      <a href="" ng-click="removeItem(index)" class="remove" ng-hide="disabled"><i class="fa fa-times"></i></a> \
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
      link: function(scope, element, attrs, ngModel) {

        scope.selected = {};
        scope.selected.item = null; //for single select; initialize to null so placeholder is displayed
        scope.searchResults = []; //data for drop down list
        scope.selectedList = []; //used for tracking whats been selected and also allows for sorting
        var map;
        var pointLocation;
        var location;
        var meters = 0.00062137;
        var radius;
        var markers = [];
        var circles = [];
        var circle;
        scope.displayedMarkers = [];
        scope.displayedSearchResults = [];

        scope.sortableOptions = {
          placeholder: 'sortable-placeholder',
          disabled: scope.disabled
        }

        function initMap() {
          var geocoder = new google.maps.Geocoder();
          var infoWindow = new google.maps.InfoWindow({map: map});

          map = new google.maps.Map(document.getElementById('map_canvas'), {
            center: pointLocation,
            zoom: 8
          });

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

          document.getElementById('searchInput').onkeypress = function(e) {
            if(e.keyCode == 13) {
              var userSearchInput = document.getElementById('searchInput').value;
              var zipCode = document.getElementById('zipCode').value;
              var miles = document.getElementById('radius').value;
              radius = miles/meters;
      
              if (!zipCode && zipCode.length !== 5) {
                //use current location instead?
                console.log('Your zipcode is invalid');
              } else {
                geocoder.geocode({ 
                  'address': zipCode 
                }, function(results, status) {
                  if (status == google.maps.GeocoderStatus.OK) {
                    location = results[0].geometry.location;

                    var request = {
                      location: location,
                      radius: radius,
                      types: ['pharmacy'],
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

              markers.push(marker);
            }
            if (circles.length > 0) {
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

            circles.push(circle);
            var bounds = new google.maps.LatLngBounds();
              for (var i = 0; i < markers.length; i++) {
                if (google.maps.geometry.spherical.computeDistanceBetween(markers[i].getPosition(),location) < radius) {
                  bounds.extend(markers[i].getPosition())
                  scope.displayedMarkers.push(markers[i]);
                  // display it
                  markers[i].setMap(map);
                } else {
                  // hide the marker, it is outside the circle
                  markers[i].setMap(null);
                }
              }
              scope.listSearchResults(scope.searchResults);
          } else {
            console.log('something went wrong!');
          }
        }
        scope.listSearchResults = function(searchResults) {
          for (var i = 0; i < searchResults.length; i++) {
            if (google.maps.geometry.spherical.computeDistanceBetween(searchResults[i].geometry.location,location) < radius) {
              // adds results
              scope.displayedSearchResults.push(searchResults[i]);
            } else {
              // hide the marker, it is outside the circle
            }
          } 
        }

        function clearOverlays() {
          for (var i = 0; i < circles.length; i++ ) {
            circles[i].setMap(null);
          }
          circles.length = 0;
        }
        // Will need to be changed to checkbox
        scope.removeItem = function(index) {
          var item = scope.selectedList[index];
          scope.selectedList.splice(index, 1);
          scope.list.push(item);
        };

        var unwatch = scope.$watchCollection('[data, options, modelData]', function(results) {
          if (scope.data && scope.options && scope.options.model) {
            unwatch();
            scope.selectedList = scope.data;
          }
        });

        scope.onSelect = function(item, model) {
          var params = {};
          scope.$emit('onModelFieldLocationSortSelect', scope.modelData, scope.key, item);
          if (!item[scope.options.key] && item[scope.options.searchField]) {
            var value = element.find("input.ui-select-search").val();
            item[scope.options.key] = value;
            item[scope.options.searchField] = value;
          }
          params[scope.options.key] = item[scope.options.key];
          var selectedItem = _.find(scope.selectedList, params);
          if (!selectedItem) {
            scope.selectedList.push(item);
            scope.data = scope.selectedList;
          }
          $timeout(function() {
            delete scope.selected.item;
          });
        };

        element.html(getTemplate(scope.options.choiceTemplate, scope.options.matchTemplate)).show();
        $compile(element.contents())(scope);
        initMap();

      }
    };
  })

;
