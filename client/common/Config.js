angular.module('dashboard.Config', [
])

.constant('Config', {
  apiBaseUrl: window.config.apiBaseUrl || '/api/',
  serverParams: window.config
});
