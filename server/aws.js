/**
 The MIT License (MIT)

 Copyright (c) 2015 ISBX

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

var uuid = require('node-uuid');
var moment = require("moment");
var crypto = require("crypto");

var awsConfig;

/**
 * Generates S3 Upload Credentials (Policy and Signature)
 * @param path
 *  path to upload and must be defined in the config.json under private.aws.s3.path object
 * @param fileType
 *  The MIME type of the file being uploaded and must be defined in the config.json under private.asws.s3.path[path][fileType]
 */
function getS3Credentials(path, fileType, callback) {
  var acceptableFileTypes = awsConfig.s3.path[path];
  if (!acceptableFileTypes) {
    callback({translate: 'cms.error.aws.invalid_path', message: "Invalid path value"});
    return;
  }
  if (fileType == undefined || fileType == null) {
    callback({translate: 'cms.error.aws.no_filetype', message: "Please provide a fileType"});
    return;
  }
  var fileExtension = acceptableFileTypes[fileType];
  if (!fileExtension) {
    callback({translate: 'cms.error.aws.invalid_filetype', message: "Invalid fileType for path"});
    return;
  } 
  var expirationLength = 900; //15min
  var expirationDate = moment().add(expirationLength, 'seconds').toISOString();
  var maxFileSize = awsConfig.s3.maxFileSize ? awsConfig.s3.maxFileSize : 5242880; //default to 5MB
  var policy = {
          expiration: expirationDate,
          conditions: [{ bucket: awsConfig.s3.bucket },
                       { acl: "private" },
                       { success_action_status: "201" },
                       ["starts-with", "$key", path + "/"],
                       //["starts-with", "$Content-Type", fileType],
                       ["starts-with", "$Cache-Control", "max-age=31536000"], // 1 year
                       ["content-length-range", 0, maxFileSize]
          ]
  };

  var base64Policy = new Buffer(JSON.stringify(policy)).toString('base64');
  var hmac = crypto.createHmac("sha1", awsConfig.secretAccessKey);
  var hash2 = hmac.update(base64Policy);
  var signature = hmac.digest(encoding="base64");
  var uploadUrl = awsConfig.s3.uploadUrl ? awsConfig.s3.uploadUrl : "https://"+awsConfig.s3.bucket+".s3.amazonaws.com";
  var credentials = {
          uploadUrl: uploadUrl,
          expirationDate: expirationDate,
          uniqueFilePath: path + "/" + uuid.v1() + "." + fileExtension,
          AWSAccessKeyId: awsConfig.accessKeyId,
          success_action_status: "201",
          "Content-Type": fileType,
          policy: base64Policy,
          signature: signature
  };
  callback(null, credentials);
};

module.exports = {
  setConfig: function(config) {
    awsConfig = config.aws;
  },
  getS3Credentials: function(cmsKey, fileExtension, callback) {
    getS3Credentials(cmsKey, fileExtension, callback);
  }
};