var redisClient = require('./redisClient');
var config = require('config');
var base64Url = require('base64-url');
var crypto = require('crypto');
var db = require('../models');
var Promise = require('bluebird');

var transporter = require('./smtpTransporter');

var emailVerifier = new Object();
emailVerifier.verify = function(user) {
  // make this more configurable later
  var from = db.ApplicationSettings.title + ' <' + 'registration@' + config.smtpOptions.fromDomain + '>';
  var subject = 'Welcome to ' + db.ApplicationSettings.title + '!'; // Subject line  
  var token = base64Url.escape(crypto.randomBytes(48).toString('base64'));
  var email = user.email;
  var mailOptions = {
    from: from,
    to: email,
    subject: subject,
    text: token, // plaintext body
    html: '<b>' + token + '</b>' // html body
  };
  return new Promise(function(resolve, reject) {
                       transporter.sendMail(mailOptions, function(err, info) {
                         if (err) {
                           console.error(err);
                         }
                         return resolve(info);
                       });  
                     });
}

module.exports = emailVerifier;