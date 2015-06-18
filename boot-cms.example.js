// This file goes in your LoopBack /server/boot/ directory

module.exports = function mountCMS(server) {
  var cms;
  try {
    cms = require('isbx-loopback-cms');
  } catch(err) {
    console.log(
      'Run `npm install isbx-loopback-cms` to enable the ISBX CMS for LoopBack'
    );
    return;
  }

  var restApiRoot = server.get('restApiRoot');

  var cmsApp = cms(server, { basePath: restApiRoot, modelPath: __dirname + '/../../common/models/', configPath: __dirname + '/../../CMS/config.json' });
  server.use('/cms', cmsApp);
  server.once('started', function() {
    var baseUrl = server.get('url').replace(/\/$/, '');
    // express 4.x (loopback 2.x) uses `mountpath`
    // express 3.x (loopback 1.x) uses `route`
    var cmsPath = cmsApp.mountpath || cmsApp.route;
    console.log('Browse your CMS at %s%s', baseUrl, cmsPath);
  });
};

