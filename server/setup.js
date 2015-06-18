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

var inflection = require('inflection');
/**
 * If authModel has no records, create a default "admin" user with password "password"
 * @param loopbackApplication
 * @param config
 */
function setupDefaultAdmin(loopbackApplication, config) {
  var authModelName = config["public"].authModel;
  if (!authModelName) authModelName = "User"; //if no authModel specified, use default "User" model
  authModelName = inflection.singularize(authModelName);

  //create relationships in built-in models
  var RoleMapping = loopbackApplication.models.RoleMapping; //built-in loopback Model
  var Role = loopbackApplication.models.Role; //built-in loopback Model
  var User = loopbackApplication.models[authModelName]; //ISBX projects uses "Account" model that overrides the User base model
  if (!User) User = loopbackApplication.models.User; //default base to base User class
  User.count(function(error, count) {
    if (error) {
      console.log("Error setting up default admin.");
      console.dir(error);
      return;
    }
    if (count == 0) {
      //Check if SuperAdmin Role exists
      Role.findOne({where: { name: "SuperAdmin" } }, function(error, result) {
        if (error) {
          console.log("Error setting up default SuperAdmin Role.");
          console.dir(error);
          return;
        }
        if (!result) {
          //Create role
          createSuperAdminRole(Role, function(error, role) {
            if (error) {
              console.log("Error creating SuperAdmin Role.");
              console.dir(error);
              return;
            }
            createDefaultAdmin(User, RoleMapping, role.id);
          });
        } else {
          createDefaultAdmin(User, RoleMapping, result.id);
        }
      });
    }
  });
}

function createSuperAdminRole(Role, callback) {
  var role = {
    "name": "SuperAdmin",
    "description": "Super Admin"
  };
  Role.create(role, callback);
}

function createDefaultAdmin(User, RoleMapping, roleId) {
  User.create({
    email: "admin@example.com",
    username: "admin",
    password: "password",
    created: new Date()
  }, function(error, user) {
    if (error) {
      console.log("Error creating 'admin' user.");
      console.dir(error);
      return;
    }
    RoleMapping.create({
      principalType: "USER",
      principalId: user.getId(),
      roleId: roleId
    }, function(error, result) {
      if (error) {
        console.log("Error creating 'admin' role mapping.");
        console.dir(error);
        return;
      }
      console.log("Created default 'admin' user with password 'password'.");
    });
  });
}

module.exports = {
  setupDefaultAdmin: setupDefaultAdmin
};