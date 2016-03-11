/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  build_dir: 'build',
  compile_dir: 'dist',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `less` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  app_files: {
    js: [ 'client/**/*.js', '!client/**/*.spec.js', '!client/assets/**/*.js' ],
    jsunit: [ 'client/**/*.spec.js' ],
    
    atpl: [ 'client/app/**/*.tpl.html' ],
    ctpl: [ 'client/common/**/*.tpl.html' ],

    html: [ 'client/index.jade' ],
    stylus: 'src/css/main.stylus'
  },

  /**
   * This is a collection of files used during testing only.
   */
  test_files: {
    js: [
      'vendor/angular-mocks/angular-mocks.js'
    ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   *
   * The `vendor_files.assets` property holds any assets to be copied along
   * with our app's assets. This structure is flattened, so it is not
   * recommended that you use wildcards.
   */
  vendor_files: {
    js: [
      'vendor/lodash/dist/lodash.min.js',
      'vendor/jquery/dist/jquery.min.js',
      'vendor/jquery-ui/jquery-ui.min.js',
      'vendor/ace-builds/src-min-noconflict/ace.js',
      'vendor/ace-builds/src-min-noconflict/mode-json.js',
      'vendor/ace-builds/src-min-noconflict/mode-html.js',
      'vendor/json-editor/dist/jsoneditor.js',
      "vendor/danialfarid-angular-file-upload/dist/angular-file-upload-shim.min.js", //Note: shim.js MUST BE PLACED BEFORE angular.js and angular-file-upload.js AFTER angular.js
      'vendor/angular/angular.js',
      "vendor/danialfarid-angular-file-upload/dist/angular-file-upload.min.js",
      'vendor/angular-ui-router/release/angular-ui-router.js',
      'vendor/angular-ui-utils/ui-utils.js',
      'vendor/angular-ui-select/dist/select.min.js',
      'vendor/angular-ui-sortable/sortable.min.js',
      'vendor/angular-ui-calendar/src/calendar.js',
      'vendor/angular-grid/ng-grid-2.0.14.debug.js',
      'vendor/angular-grid/plugins/ng-grid-flexible-height.js',
      'vendor/angular-grid/plugins/ng-grid-csv-export.js',
      'vendor/angular-sanitize/angular-sanitize.min.js',
      'vendor/angular-cookies/angular-cookies.js',
      'vendor/angular-bootstrap/ui-bootstrap.min.js',
      'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'vendor/bootstrap/js/modal.js',
      'vendor/bootstrap/js/collapse.js',
      'vendor/bootstrap/js/transition.js',
      'vendor/oclazyload/dist/ocLazyLoad.min.js',
      'vendor/angular-google-chart/ng-google-chart.js',
      'vendor/moment/min/moment.min.js',
      'vendor/fullcalendar/dist/fullcalendar.min.js',
      'vendor/fullcalendar/dist/gcal.js',
      'vendor/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
      'vendor/ng-slider/dist/ng-slider.min.js',
      'vendor/bootstrap-wysiwyg/bootstrap-wysiwyg.js',
      'vendor/jquery.hotkeys/jquery.hotkeys.js',
      'vendor/spectrum/spectrum.js',
      'vendor/js-beautify/js/lib/beautify-html.js',
      'vendor/signature_pad/signature_pad.min.js',
      'vendor/ng-signature-pad/dist/ng-signature-pad.min.js',
      'vendor/angular-libphonenumber/dist/libphonenumber.js',
      'vendor/angular-libphonenumber/dist/angular-libphonenumber.js'
    ],
    css: [
      'vendor/jquery-resizable-columns/dist/jquery.resizableColumns.css',
      'vendor/bootstrap/dist/css/bootstrap.css',
      'vendor/bootstrap/dist/css/bootstrap-theme.css',
      'vendor/angular-grid/ng-grid.min.css',
      'vendor/angular-ui-select/dist/select.min.css',
      'vendor/fullcalendar/dist/fullcalendar.css',
      'vendor/bootstrap3-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
      'vendor/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css',
      'vendor/ng-slider/dist/css/ng-slider.min.css',
      'vendor/spectrum/spectrum.css'
    ],
    assets: [
      'vendor/bootstrap/fonts/glyphicons-halflings-regular.eot',
      'vendor/bootstrap/fonts/glyphicons-halflings-regular.svg',
      'vendor/bootstrap/fonts/glyphicons-halflings-regular.ttf',
      'vendor/bootstrap/fonts/glyphicons-halflings-regular.woff'
    ]
  },
};
