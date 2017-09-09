// https://hassantariqblog.wordpress.com/2016/07/27/angularjs-textarea-auto-resize-directive

angular.module('dashboard.directive.AutoSize', [
])

.directive('autoSize', function($timeout, $window) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      scope.minTextAreaHeight = 150;

      element.css({ 'height': 'auto', 'overflow-y': 'hidden' });
      $timeout(function() {
        var scrollHeight = element[0].scrollHeight;
        var height = Math.max(scrollHeight, scope.minTextAreaHeight);
        element.css('height', height + 'px');
      }, 100);

      function update() {
        element.css({ 'height': 'auto', 'overflow-y': 'hidden' });
        element.css('height', element[0].scrollHeight + 'px');
      }

      element.on('input', update);
      element.on('load', update);
      angular.element($window).bind('resize', update);
    }
  }
});