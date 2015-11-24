angular.module('dashboard.services.String', [
  'dashboard.Config',
  'dashboard.Utils'
])

.service('StringService', function(Config, Utils, $http) {
  var storedStrings = {};
  var promise = $http.get('/strings.json')
  .success(function(data) {
    storedStrings = data;
  });
  return {
    promise: promise,
    setStringData: function (data) {
      storedStrings = data;
    }, 
    useStingData: function () {
      return storedStrings;
    }
  };
})

;