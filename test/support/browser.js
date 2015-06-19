module.exports = function () {
  var webdriverio = require('webdriverio');
  var options = {
    desiredCapabilities: {
      browserName: 'chrome'
    }
  }
  return webdriverio.remote(options);
}
