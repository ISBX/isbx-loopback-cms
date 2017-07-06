angular.module('dashboard.filters', [
])

/**
 * Display a decimal value with the supplied decimal scale (number to the right of the decimal)
 */
.filter('decimalWithScale', function() {
"ngInject";

  return function(number, scale) {
    if (typeof number === 'undefined') return '';
    value = number + ''; //force into a string
    var indexOfDecimal = value.indexOf('.');
    if (indexOfDecimal === -1) value += '.0'; //no decimal so add it
    else if (indexOfDecimal === 0) value = '0' + value; //no leading zero
    var valueComponents = value.split('.');
    if (valueComponents.length > 1) {
      if (!valueComponents[0] || valueComponents[0].length === 0) valueComponents[0] = 0;
      if (isNaN(parseInt(valueComponents[0]))) return NaN
      value = parseInt(valueComponents[0]) + '.';
      if (valueComponents[1].match(/[\D]/) !== null) {
        return NaN
      } else if (valueComponents[1].length > scale) {
        //Truncate value
        value += valueComponents[1].substring(0, scale);
      } else {
        value += valueComponents[1];
      }
      if (valueComponents[1].length < scale) {
        //Pad with zeros
        for (var i = 0; i < scale - valueComponents[1].length; i++) {
          value += '0';
        }
      }
    }
    return value;
  };
})
;