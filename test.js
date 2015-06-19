var webdriverio = require('webdriverio');
var options = {
    desiredCapabilities: {
        browserName: 'chrome'
    }
};
webdriverio
    .remote(options)
    .init()
    .url('http://www.google.com')
    .title(function(err, res) {
        console.log('Title was: ' + res.value);
    })
    .end();