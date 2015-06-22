var crypto = require('public-encrypt');
var publicKey;
publicKey = process.env.RSA_PUBLIC_KEY;

global.encryptPassword = function(form) {
  var inputsToEncrypt = Array.prototype.slice.call(form.querySelectorAll('input.encrypt'));  
  inputsToEncrypt.forEach(function(input) {
    input.value = crypto.publicEncrypt(publicKey, new Buffer(input.value)).toString('base64');
  });
  return true;
}

