/**!
 * AngularJS SignaturePad directive
 * @author Javier Martínez <ecentinela@gmail.com>
 * @version 0.1.0
 */

/* global angular */

(function () {
  'use strict';

  angular.module('ngSignaturePad', []).directive(
    'ngSignaturePad',
    [
      '$window',
      '$timeout',
      function ($window, $timeout) {
        return {
          scope: {
            ngSignaturePad: '='
          },
          link: function ($scope, $element, $attrs) {
            $timeout(function () {
              if ($attrs.ngSignaturePadBefore) {
                $scope.$parent.$apply(function (self) {
                  self[$attrs.ngSignaturePadBefore]($element, $attrs);
                });
              }

              if (!$attrs.ngSignaturePadDotSize) {
                $attrs.$set('ngSignaturePadDotSize', null);
              }

              if (!$attrs.ngSignaturePadMinWidth) {
                $attrs.$set('ngSignaturePadMinWidth', null);
              }

              if (!$attrs.ngSignaturePadBackgroundColor) {
                $attrs.$set('ngSignaturePadBackgroundColor', null);
              }

              if (!$attrs.ngSignaturePadPenColor) {
                $attrs.$set('ngSignaturePadPenColor', null);
              }

              if (!$attrs.ngSignaturePadVelocityFilterWeight) {
                $attrs.$set('ngSignaturePadVelocityFilterWeight', null);
              }

              if (!$attrs.ngSignaturePadOnBegin) {
                $attrs.$set('ngSignaturePadOnBegin', null);
              }

              if (!$attrs.ngSignaturePadOnEnd) {
                $attrs.$set('ngSignaturePadOnEnd', null);
              }

              $scope.ngSignaturePad = new $window.SignaturePad($element[0], {
                dotSize: $attrs.ngSignaturePadDotSize,
                minWidth: $attrs.ngSignaturePadMinWidth,
                backgroundColor: $attrs.ngSignaturePadBackgroundColor,
                penColor: $attrs.ngSignaturePadPenColor,
                velocityFilterWeight: $attrs.ngSignaturePadVelocityFilterWeight,
                onBegin: $attrs.ngSignaturePadOnBegin,
                onEnd: $attrs.ngSignaturePadOnEnd
              });

              var oldAddPoint = $scope.ngSignaturePad._addPoint;

              $scope.ngSignaturePad._addPoint = function (point) {
                oldAddPoint.call(this, point);

                $scope.$apply();
              };

              if ($attrs.ngSignaturePadAfter) {
                $scope.$parent.$apply(function (self) {
                  self[$attrs.ngSignaturePadAfter]($element, $attrs, $scope.ngSignaturePad);
                });
              }
            });
          }
        };
      }
    ]
  );

})();
