angular.module('dashboard.Profile', [
  'ui.bootstrap',
  'ui.bootstrap.modal',
  'dashboard.Dashboard.Model.Edit'
])

.controller('ProfileCtrl', function ProfileCtrl($scope, $modalInstance, $translate) {

  
  function init() {
    $translate('user_profile.title').then(function(translated) {
        $scope.modalTitle = translated;
      }, function() { // gracefully fallback to a default value if no override provided
        $scope.modalTitle = 'User Profile';
      }
    );
  }
  
  init();
})

;
