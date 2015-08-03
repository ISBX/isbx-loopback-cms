angular.module('dashboard.services.FileUpload', [
  'dashboard.Config',
  'dashboard.Utils',
  'ngCookies',
  "angularFileUpload"
])

.service('FileUploadService', function($cookies, $http, $q, $upload, Config, Utils) {

  var self = this;
  
  this.getS3Credentials = function(path, fileType) {
    var params = {
        access_token: $cookies.accessToken,
        path: path,
        fileType: fileType
    };
    return Utils.apiHelper('GET', Config.serverParams.cmsBaseUrl + '/aws/s3/credentials', params);
  };
  
  this.getFileUploadData = function(credentials) {
    return {
      key: credentials.uniqueFilePath, // the key to store the file on S3, could be file name or customized
      AWSAccessKeyId: credentials.AWSAccessKeyId, 
      acl: "public-read", // sets the access to the uploaded file in the bucker: private or public 
      policy: credentials.policy, // base64-encoded json policy (see article below)
      signature: credentials.signature, // base64-encoded signature based on policy string (see article below)
      //"Content-Type": file.type != '' ? file.type : 'application/octet-stream', // content type of the file (NotEmpty),
      success_action_status: "201"//,
      //filename:  credentials.uniqueFilePath // this is needed for Flash polyfill IE8-9
    };
  };
  
  this.uploadFile = function(file, path) {
    //Get S3 credentials from Server
    var deferred = $q.defer();
    self.getS3Credentials(path, file.type ? file.type : "").then(function(credentials) {
      $upload.upload({
        url: credentials.uploadUrl, //S3 upload url including bucket name,
        method: 'POST',
        data : self.getFileUploadData(credentials),
        file: file
      }).progress(function(event) {
        //progress
        var progress = (event.position) / file.size;
        deferred.notify(progress);
      }).success(function(data) {
        //success
        var locationUrl;
        var xmldoc = new DOMParser().parseFromString(data, 'text/xml');

        try {
          var locationPath = xmldoc.evaluate('/PostResponse/Location', xmldoc, null, XPathResult.STRING_TYPE, null);
          locationUrl = locationPath.stringValue;
        } catch(e) { // IE
          var list = xmldoc.documentElement.childNodes;
          for (var i=0; i<list.length; i++) {
            var node = list[i];
            if (node.nodeName == 'Location') {
              locationUrl = node.firstChild.nodeValue;
              break;
            }
          }
        }

        deferred.resolve({
          filename: file.name,
          size: file.size,
          fileUrl: locationUrl
        });
      }).error(function(error) {
        //error
        console.log(error);
        deferred.reject(error);
      }); 
    }, function(error) {
      console.log(error);
      deferred.reject(error);
    });   
    
    return deferred.promise;    
  };

  
  var uploadFilePath = null;
  this.uploadImages = function(imageFiles) {
    //Try to get index, results, and deferred objects from recursion
    //otherwise init the variables 
    var fileIndex = arguments[1];
    var exportIndex = arguments[2];
    var imageUploadResults = arguments[3];
    var deferred = arguments[4];
    if (!fileIndex) fileIndex = 0;
    if (!exportIndex) exportIndex = 0;
    if (!deferred) deferred = $q.defer();
    var fileKey = null; //the file key represents the model (table) column key used for reference 
    var exportKey = null; //the export key represents the various sizes of the image
    var file = null;
    var currentUploadedSize = 0;
    var totalUploadSize = 0;
    
    //Get next file to process
    if (imageFiles && imageFiles instanceof Array && fileIndex < imageFiles.length) {
      //Array of File

      fileIndex++;
      exportIndex = 0;
      if (exportKey == 1) {
        //Array of files have no exportKeys so recurse to next file
        self.uploadImages(imageFiles, fileIndex, exportIndex, imageUploadResults, deferred);
        return;
      }
      
      if (imageFiles[fileIndex] && imageFiles[fileIndex].file) {
        uploadFilePath = imageFiles[fileIndex].path;
        file = imageFiles[fileIndex].file;
      } else {
        file = imageFiles[fileIndex];
      }
      if (!imageUploadResults) imageUploadResults = []; //initialize results object
      //Calculate File Size
      for (var i = 0; i < imageFiles.length; i++) {
        var imageFile = imageFiles[i].file ? imageFiles[i].file : imageFiles[i];
        if (i < fileIndex) currentUploadedSize += imageFile.size;
        totalUploadSize += imageFile.size;
      }
    } else if (typeof imageFiles === 'object' && !imageFiles.file && fileIndex < Object.keys(imageFiles).length) {
      //Object containing key/value pairs for various key sizes
      var fileKeys = Object.keys(imageFiles);
      fileKey = fileKeys[fileIndex];
      var exports = imageFiles[fileKey].file ? imageFiles[fileKey].file : imageFiles[fileKey];
      if (imageFiles[fileKey].path) uploadFilePath = imageFiles[fileKey].path;
      if (exports && exports.type && exports.size) {
        //exports is a file object
        if (exportIndex > 0) {
          //Processed all export keys so move to next file
          fileIndex++;
          exportIndex = 0;
          self.uploadImages(imageFiles, fileIndex, exportIndex, imageUploadResults, deferred);
          return;
        }
        file = exports; //the case where no exports are specified in options
      } else {
        //exports contains various export file objects
        var exportKeys = Object.keys(exports);
        if (exportIndex >= exportKeys.length) {
          //Processed all export keys so move to next file
          fileIndex++;
          exportIndex = 0;
          self.uploadImages(imageFiles, fileIndex, exportIndex, imageUploadResults, deferred);
          return;
        }
        exportKey = exportKeys[exportIndex];
        if (exports[exportKey] && exports[exportKey].file) {
          uploadFilePath = exports[exportKey].path;
          file = exports[exportKey].file;
        } else {
          file = exports[exportKey];
        }
      }
      
      
      if (!imageUploadResults) imageUploadResults = {}; //initialize results object
      //Calculate File Size
      for (var i = 0; i < fileKeys.length; i++) {
        var fkey = fileKeys[i];
        var exports = imageFiles[fkey];
        if (exports && exports.type && exports.size) {
          //exports is a file object
          var imageFile = exports;
          if (i < fileIndex) {
            currentUploadedSize += imageFile.size;
          }
          totalUploadSize += imageFile.size;
        } else if (exports && exports.file) {
          var imageFile = exports.file;
          if (i < fileIndex) {
            currentUploadedSize += imageFile.size;
          }
          totalUploadSize += imageFile.size;
        } else {
          //exports contains various export file objects
          for (var k = 0; k < exportKeys.length; k++) {
            var ekey = exportKeys[k];
            var imageFile = exports[ekey].file ? exports[ekey].file : exports[ekey];
            if (i < fileIndex || (i == fileIndex && k < exportIndex)) {
              currentUploadedSize += imageFile.size;
            }
            totalUploadSize += imageFile.size;
          }
        }
      }
    }
    
    if (!file) {
      //No more files to upload
      deferred.resolve(imageUploadResults);
      return deferred.promise;
    }
    
    //Get S3 credentials from Server
    self.getS3Credentials(uploadFilePath, file.type).then(function(credentials) {
      $upload.upload({
        url: credentials.uploadUrl, //S3 upload url including bucket name,
        method: 'POST',
        data : self.getFileUploadData(credentials),
        file: file
      }).progress(function(event) {
        //progress
        var progress = (currentUploadedSize + event.position) / totalUploadSize;//event.total;
        deferred.notify(progress);
      }).success(function(data) {
        //success
        var locationUrl;
        var xmldoc = new DOMParser().parseFromString(data, 'text/xml');

        try {
          var locationPath = xmldoc.evaluate('/PostResponse/Location', xmldoc, null, XPathResult.STRING_TYPE, null);
          locationUrl = locationPath.stringValue;
        } catch(e) { // IE
          var list = xmldoc.documentElement.childNodes;
          for (var i=0; i<list.length; i++) {
            var node = list[i];
            if (node.nodeName == 'Location') {
              locationUrl = node.firstChild.nodeValue;
              break;
            }
          }
        }

        if (fileKey) {
          if (exportKey) {
            if (!imageUploadResults[fileKey]) imageUploadResults[fileKey] = {};
            imageUploadResults[fileKey][exportKey] = locationUrl; //results store in key/value pair
          } else {
            //no exportKey so directly assign to imageUploadResults
            imageUploadResults[fileKey] = locationUrl;
          }
        } else {
          imageUploadResults.push(locationUrl); //results store in array
        }
        
        //recurse through all imageFiles
        exportIndex++;
        self.uploadImages(imageFiles, fileIndex, exportIndex, imageUploadResults, deferred); 
      }).error(function(error) {
        //error
        console.log(error);
        deferred.reject(error);
      }); 
    }, function(error) {
      //get credentials error
      console.log(error);
      deferred.reject(error);
      
    });   
    
    return deferred.promise;
  };
  
  

});

