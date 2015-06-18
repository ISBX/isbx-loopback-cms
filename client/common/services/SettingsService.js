angular.module('dashboard.services.Settings', [
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies'
])

.service('SettingsService', function($cookies, $http, Config, Utils) {

  this.saveNav = function(nav) {
    var path = Config.serverParams.cmsBaseUrl + '/settings/config/nav?access_token=' + $cookies.accessToken;
    return Utils.apiHelper('POST', path, nav);
  };
  
})

;
