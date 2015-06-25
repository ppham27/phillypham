var config = require('config');
module.exports = new require('sweetcaptcha')(config.appKeys.sweetCaptcha.id, 
                                             config.appKeys.sweetCaptcha.key, 
                                             config.appKeys.sweetCaptcha.secret);