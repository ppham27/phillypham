var crypto = require('crypto');
var config = require('config');

module.exports = function(password)  {
  return crypto.publicEncrypt(config.rsaPublicKey, new Buffer(password, 'utf8')).toString('base64');
}