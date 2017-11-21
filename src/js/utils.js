/**
 * Created by feng.shen on 2017/10/30.
 */
// it only does '%s', and return '' when arguments are undefined
var utils = {
  sprintf: function (str) {
    var args = arguments,
      flag = true,
      i = 1;

    str = str.replace(/%s/g, function () {
      var arg = args[i++];

      if (typeof arg === 'undefined') {
        flag = false;
        return '';
      }
      return arg;
    });
    return flag ? str : '';
  }
}