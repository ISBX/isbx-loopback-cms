angular.module('dashboard.services.Image', [
	'dashboard.Config',
	'dashboard.Utils'
])

.service('ImageService', function($q) {
	var self = this;

	this.base64ToArrayBuffer = function(base64) {
		var binaryString = window.atob(base64);
		var len = binaryString.length;
		var bytes = new Uint8Array( len );

		for (var i = 0; i < len; i++)        {
			bytes[i] = binaryString.charCodeAt(i);
		}

		return bytes.buffer;
	};

	this.setTransform = function(transform, element) {
		element.css('-webkit-transform', transform);
		element.css('-moz-transform', transform);
		element.css('-ms-transform', transform);
		element.css('-o-transform', transform);
		element.css('transform', transform);
	};

	this.reOrient = function(orientation, element, isCanvas, width, height) {
		var width = width || element.width();
		var height = height || element.height();

		switch (orientation) {
			case 2:
				if (isCanvas) element.transform(-1, 0, 0, 1, width, 0);
				else self.setTransform('rotateY(180deg)', element);
				break;
			case 3:
				if (isCanvas) element.transform(-1, 0, 0, -1, width, height);
				else self.setTransform('rotate(180deg)', element);
				break;
			case 4:
				if (isCanvas) element.transform(1, 0, 0, -1, 0, height);
				else self.setTransform('rotateX(180deg)', element);
				break;
			case 5:
				if (isCanvas) element.transform(0, 1, 1, 0, 0, 0);
				else self.setTransform('rotateZ(90deg) rotateX(180deg)', element);
				break;
			case 6:
				if (isCanvas) element.transform(0, 1, -1, 0, height, 0);
				else self.setTransform('rotate(90deg)', element);
				break;
			case 7:
				if (isCanvas) element.transform(0, 1, -1, 0, height, 0);
				else self.setTransform('rotateZ(90deg) rotateY(180deg)', element);
				break;
			case 8:
				if(isCanvas) element.transform(0, -1, 1, 0, 0, width);
				else self.setTransform('rotate(-90deg)', element);
				break;
		}
	};

	this.getOrientation = function(imageUrl) {
		var deferred = $q.defer();

		if (imageUrl.indexOf('data:image') === 0) {
			var base64 = imageUrl.split(',')[1];
			var exifData = EXIF.readFromBinaryFile(self.base64ToArrayBuffer(base64));
			deferred.resolve(parseInt(exifData.Orientation || 1, 10));
		} else {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", imageUrl, true);
			xhr.responseType = "arraybuffer";
			xhr.onload = function(e) {
				var arrayBuffer = new Uint8Array(this.response);
				var exifData = EXIF.readFromBinaryFile(arrayBuffer.buffer);
				deferred.resolve(parseInt(exifData.Orientation || 1, 10));
			};
			xhr.send();
		}

		return deferred.promise;
	};

	this.fixOrientation = function(imageUrl, element, isCanvas, width, height) {
		self.getOrientation(imageUrl).then(function(orientation) {
			self.reOrient(orientation, element, isCanvas, width, height);
		});
	};
})

;