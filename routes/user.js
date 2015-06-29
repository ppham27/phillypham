var express = require('express');
var router = express.Router();

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

var emailVerifier = require('../lib/emailVerifier');

var config = require('config');


router.get('/:displayName', authorize({userId: true, loggedIn: true}), function(req, res, next) {
  var displayName = decodeURIComponent(req.params.displayName);
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (req.accepts('html')) {
      if (user === null) {
        req.flash('error', 'The requested user does not exist');
        res.redirect('/');
      } else {
        res.render('user/index', {title: user.displayName, displayedUser: user});
      }
    } else if (req.accepts('json')) {
      if (user === null) {
        res.json({error: 'requested user does not exist'});
      } else {
        res.json({displayName: user.displayName, email: user.email,
                  givenName: user.givenName, familyName: user.familyName,
                  middleName: user.middleName});
      }
    }
  });
});

router.get('/edit/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = decodeURIComponent(req.params.displayName);
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    res.render('user/edit', {title: user.displayName, temporaryUser: user, update: true});
  });
});

router.put('/edit/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = decodeURIComponent(req.params.displayName);
  // expect json object of users
  var errors = [];
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    var newUser = req.body;
    Object.keys(newUser).forEach(function(key) {
      if (key === 'password' || key === 'oldPassword' || key === 'passwordConfirmation') {
        newUser[key] = crypto.privateDecrypt(config.rsaPrivateKey,
                                             new Buffer(newUser[key], 'base64')).toString();
      } else {
        newUser[key] = newUser[key].trim();
        if (key === 'email') newUser[key] = newUser[key].toLowerCase();
      }
    });
    if (newUser.givenName) user.biograpy = newUser.givenName;
    if (newUser.biography) user.biograpy = newUser.biography;
    if (newUser.password) {
      // logic for updating password
    }
    if (newUser.email && newUser.email !== user.email) {
      // logic for updating email
    }
    if (newUser.displayName && newUser.displayName !== user.displayName) {
      // logic for updating display name
      db.User.findOne({where: { displayName: newUser.displayName}})
    } else {
      // displayName stays the same
      if (errors.length) {
      }
      
    }
  });
});

router.post('/verify/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = decodeURIComponent(req.params.displayName);
  // expect an email in the form of json {email: 'a@a.com'}
  if (!req.body.email) return res.json({error: 'no email was found in request'});
  var email = req.body.email.trim().toLowerCase();
  req.checkBody('email').isEmail();
  if (req.validationErrors().length) return res.json({error: req.validationErrors()[0].msg});
  Promise.join(db.User.findOne({where: { displayName: displayName}}), db.User.findOne({where: { email: email}}))
  .spread(function(userA, userB) {
    if (userB && userA.id !== userB.id) return res.json({error: 'this email has already been taken'});      
    if (userB && userA.id === userB.id && userA.emailVerified) return res.json({error: 'this email is already verified'});      
    // email address is available 
    userA.email = email;
    userA.emailVerified = false; // make it unverified
    return userA.save()
           .then(function() {
             return emailVerifier.resetToken(userA.email)
                    .then(function(token) {
                      return emailVerifier.verify(userA, token);
                    })
                    .then(function() {
                      res.json({success: true, message: 'Email address has been updated and verification email has been sent.'});
                    });
           });    
  });
});

module.exports = router;