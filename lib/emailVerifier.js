var redisClient = require('./redisClient');
var config = require('config');
var Promise = require('bluebird');
var random = require('./random');
var db = require('../models');
var url = require('url');


var transporter = require('./smtpTransporter');

var emailVerifier = new Object();

emailVerifier.createToken = function(email, callback) {
  return new Promise(function(resolve, reject) {
                       var token = random.token(48);
                       redisClient.multi()
                       .set('emailVerifyToken:' + token, email)
                       .set('emailVerifyToken:' + email, token)
                       .expire('emailVerifyToken:' + token, 86400*3)
                       .expire('emailVerifyToken:' + email, 86400*3)
                       .exec(function(err, replies) {
                         if (err) return reject(err);
                         return resolve(token);
                       });                       
                     });
}

emailVerifier.resetToken = function(email) {  
  // overwriting tokens does the same thing, but we should delete the old token
  return (new Promise(function(resolve, reject) {
                        redisClient.get('emailVerifyToken:' + email, function(err, token) {
                          if (err) return reject(err);
                          if (token === null) return resolve(token);
                          redisClient.del('emailVerifyToken:' + token, function(err, numDeleted) {
                            if (err) return reject(err);
                            return resolve(numDeleted);
                          });
                        });                       
                      }))
         .then(function() {
           return emailVerifier.createToken(email);
         });
}

emailVerifier.deleteToken = function(email) {
  return new Promise(function(resolve, reject) {
                       redisClient.get('emailVerifyToken:' + email, function(err, token) {
                         if (err) return reject(err);
                         if (token === null) return resolve(0);
                         redisClient.del('emailVerifyToken:' + email,
                                         'emailVerifyToken:' + token,
                                         function(err, numDeleted) {
                                           if (err) return reject(err);                                           
                                           return resolve(numDeleted);
                                         });
                       });
                     });
}

var plainTextEmail = 'Hi #{displayName},\n\nYou can complete your registration and confirm your email by going to #{url}.\n\n- Phil';
var htmlTextEmail = "<p>Hi #{displayName},</p>\n\n<p>You can complete your registration and confirm your email by going to <a target=\"_blank\" href=\"#{url}\">#{url}</a>.</p>\n\n<p>- Phil</p>";

emailVerifier.verify = function(user, token) {
  // make this more configurable later with regards to the email text
  if (!user.email) return Promise.reject(new Error('please supply an email address'));
  if (token) return verifySync(user, token);
  return emailVerifier.createToken(user.email)
         .then(function(token) {
           return verifySync(user, token);
         });    
  function verifySync(user, token) {
    var from = db.ApplicationSettings.title + ' <' + 'registration@' + config.smtpOptions.fromDomain + '>';
    var subject = 'Welcome to ' + db.ApplicationSettings.title + '!'; // Subject line  
    var email = user.email;
    var verifyUrl = url.resolve(config.siteUrl, 'register/verify/' + token);
    var text = plainTextEmail.replace(/#{displayName}/g, user.displayName);
    var html = htmlTextEmail.replace(/#{displayName}/g, user.displayName);
    text = text.replace(/#{url}/g, verifyUrl);
    html = html.replace(/#{url}/g, verifyUrl);
    var mailOptions = {
      from: from,
      to: email,
      subject: subject,
      text: text,
      html: html
    };    
    return new Promise(function(resolve, reject) {
                         transporter.sendMail(mailOptions, function(err, info) {
                           if (err) console.error(err);                           
                           return resolve(info);
                         });  
                       });
  }
}

module.exports = emailVerifier;

