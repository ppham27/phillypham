module.exports = function () {
  var webdriverio = require('webdriverio');
  var options = {
    desiredCapabilities: {
      browserName: 'chrome',
      chromeOptions: {
        prefs: {
          'profile.managed_default_content_settings.notifications': 1
        }
      }
    }
  }
  return webdriverio.remote(options);
}
