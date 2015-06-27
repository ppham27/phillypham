var crypto = require('crypto');
var base64Url = require('base64-url');

var random = new Object();

random.int = function(bytes) {
  return parseInt(crypto.randomBytes(bytes).toString('hex'), 16);
}

random.token = function(bytes) {
  return base64Url.escape(crypto.randomBytes(bytes).toString('base64'));
}

module.exports = random;