angular.module('dashboard.interceptor.versionInterceptor', [

])

.factory('versionInterceptor', function(CacheService) {
  return {
    response: function(response) {
      var serverVersion = response.headers()['x-version'];
      var lastVersion = CacheService.get('version');
      
      if (serverVersion) {
        if (!lastVersion) {
          CacheService.set('version', serverVersion);
        }
        if (lastVersion !== serverVersion) {
          // before reloading, update the stored version
          CacheService.set('version', serverVersion);
          window.location.reload();
        }
      }
      return response;
    }
  }
});