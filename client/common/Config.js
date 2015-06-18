angular.module('dashboard.Config', [
])

.constant('Config', {
  apiBaseUrl: '/api/' || window.config.apiBaseUrl,
  serverParams: window.config
});
