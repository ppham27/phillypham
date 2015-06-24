var express = require('express');
var router = express.Router();
var config = require('config');
var crypto = require('crypto');

var db = require('../models');

router.get('/', require('../lib/middleware/preLogin'), function(req, res, next) {
  res.render('register', {title: 'Registration', 
                          temporaryUser: req.session.temporaryUser || {},
                          update: false});
});

router.post('/', function(req, res, next) {
  var user = req.body;
  // validation
  var isError = false;
  req.session.temporaryUser = user;
  var decryptedPassword = crypto.privateDecrypt(config.rsaPrivateKey,
                                                new Buffer(user.password, 'base64')).toString();
  var decryptedPasswordConfirmation = crypto.privateDecrypt(config.rsaPrivateKey,
                                                            new Buffer(user.passwordConfirmation, 'base64')).toString();
  if (decryptedPassword !== decryptedPasswordConfirmation) {
    req.flash('error', 'passwords do not match');
    isError = true;
  } else {
    user.password = decryptedPassword;
    delete user.passwordConfirmation;
  }
  // trim everything but password
  Object.keys(user).forEach(function(key) { 
    if (key !== 'password') user[key] = user[key].trim(); 
  });
  if (!user.email) {
    req.flash('error', 'missing email address'); 
    isError = true;
  }
  if (isError) return res.redirect('back');  
  user.userGroupId = db.ApplicationSettings.defaultUserGroupId;
  db.User.findOrCreate({where: {email: user.email}, defaults: user})
  .spread(function(user, created) {
    if (created) {
      // success
      req.user = user;
      // find out what passport does so i can be consistent here?
      next();
    } else {
      req.flash('error', 'an account with this email already exists');
      res.redirect('back');
    }
  })
  .catch(function(err) {
    err.errors.forEach(function(err) {
      res.flash('error', err.message);
    });
    res.redirect('back');
  });
}, require('../lib/middleware/postLogin'));

module.exports = router;