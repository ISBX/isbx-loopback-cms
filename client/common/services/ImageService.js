angular.module('dashboard.services.Image', [])

.service('ImageService', function($q) {
	var self = this;

  this.loadImageURI = function(imageUrl, callback) {
    var image = new Image();
    image.onload = function() {
      callback(null, image);
    };
    image.onerror = function(error) {
      callback(error);
    };

    image.src = imageUrl;
  };

  this.fixOrientationWithDataURI = function(dataURI, callback) {
    self.loadImageURI(dataURI, function(error, image) {
      if (error) return callback(error);
      EXIF.getData(image, function(exif) {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        //console.log('EXIF', EXIF.pretty(this))
        canvas.width = image.width;
        canvas.height = image.height;
        context.save();
        switch (EXIF.getTag(this, "Orientation")) {
          case 2:
            // horizontal flip
            context.translate(image.width, 0);
            context.scale(-1, 1);
            break;
          case 3:
            // 180° rotate left
            context.translate(image.width, image.height);
            context.rotate(Math.PI);
            break;
          case 4:
            // vertical flip
            context.translate(0, image.height);
            context.scale(1, -1);
            break;
          case 5:
            // vertical flip + 90 rotate right
            canvas.width = image.height;
            canvas.height = image.width;
            context.rotate(0.5 * Math.PI);
            context.scale(1, -1);
            break;
          case 6:
            // 90° rotate right
            canvas.width = image.height;
            canvas.height = image.width;
            context.rotate(0.5 * Math.PI);
            context.translate(0, -image.height);
            break;
          case 7:
            // horizontal flip + 90 rotate right
            canvas.width = image.height;
            canvas.height = image.width;
            context.rotate(0.5 * Math.PI);
            context.translate(image.width, -image.height);
            context.scale(-1, 1);
            break;
          case 8:
            // 90° rotate left
            canvas.width = image.height;
            canvas.height = image.width;
            context.rotate(-0.5 * Math.PI);
            context.translate(-image.width, 0);
            break;
        }
        context.drawImage(image, 0, 0);
        context.restore();
        var dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        callback(null, dataUrl);
      });

    });
  };

})

;