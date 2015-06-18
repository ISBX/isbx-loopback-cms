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

var app;


/**
 * Recursively update all records for a model given the sort order
 * @param modelName
 *  The name of the model that is being updated
 * @param key
 *  The primary key field name for the model
 * @param sortField
 *  The field name for the numerical column containing the sort order
 * @param sortData
 *  An Array containing primary key ID values in the sort order
 * @param callback
 *  The callback function ( error, result )
 */
function sort(modelName, key, sortField, sortData, callback) {
  var model = app.models[modelName];
  if (!model) {
    var message = "model not found in post body __model = '"+data.__model+"'";
    console.error("ERROR: " + message);
    callback({ error: message });
    return;
  }
  
  next(model, key, sortField, sortData, 0, callback);
  
}

/**
 * The recursive helper function for processing the sort 
 * @param model
 *  The loopback Model object
 * @param key
 * @param sortField
 * @param sortData
 * @param index
 * @param callback
 */
function next(model, key, sortField, sortData, index, callback) {
  
  if (index >= sortData.length) {
    callback(null, sortData);
    return;
  }
  
  var id = sortData[index];
  var where = {};
  var data = {};
  where[key] = id;
  data[sortField] = index+1; //sortField uses 1-based index
  model.update(where, data, function(error, count) {
    if (error) {
      callback(error);
      return;
    }
    index++;
    next(model, key, sortField, sortData, index, callback);
  });
}


module.exports.setLoopBack = function(loopback) {
  app = loopback;
};
 
module.exports.sort = sort;
