angular.module('dashboard.services.Location', [
  'dashboard.Config',
  'dashboard.Utils'
])

.service('LocationService', function(Config, Utils, $q, $rootScope) {
  "ngInject";

  var d = $q.defer();
  this.currentLocation = function() {
    // HTML5 geolocator
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        $rootScope.$apply(function () {
            d.resolve(position.coords);
        });
      }, function(error) {
        d.reject(error);
      });
    } else {
      // Browser doesn't support Geolocation
      d.reject('location services not allowed');
    }
    return d.promise;
  };
});
