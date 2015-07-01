var express = require('express');
var router = express.Router();
var crypto = require('crypto');

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

var emailVerifier = require('../lib/emailVerifier');

var config = require('config');


router.get('/:displayName', authorize({userId: true, loggedIn: true}), function(req, res, next) {
  var displayName = req.params.displayName;
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (req.accepts('html')) {
      if (user === null) {
        res.render('error', {message: 'User does not exist', error: {}});
      } else {
        res.render('user/profile', {title: user.displayName, displayedUser: user});
      }
    } else if (req.accepts('json')) {
      if (user === null) {
        res.json({error: 'requested user does not exist.'});
      } else {
        res.json({displayName: user.displayName, email: user.email,
                  givenName: user.givenName, familyName: user.familyName,
                  middleName: user.middleName});
      }
    }
  });
});

router.get('/edit/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = req.params.displayName;
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (user === null) {
      res.render('error', {message: 'User does not exist', error: {}});
    } else {
      res.render('user/edit', {title: user.displayName, temporaryUser: user, update: true});
    }
  });
});

router.put('/edit/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = req.params.displayName;
  // expect json object of user
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  var errors = [];
  var userToUpdate;
  var updates = {};
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (user === null) return res.json({error: 'user does not exist'})
    var promises = [];
    var newUser = req.body;
    Object.keys(newUser).forEach(function(key) {
      if (key === 'password' || key === 'oldPassword' || key === 'passwordConfirmation') {
        newUser[key] = crypto.privateDecrypt(config.rsaPrivateKey,
                                             new Buffer(newUser[key], 'base64')).toString();
      } else {
        newUser[key] = newUser[key].trim() || '';
        if (key === 'email') newUser[key] = newUser[key].toLowerCase();
      }
    });

   
    updates.givenName = newUser.givenName || null;
    updates.middleName = newUser.middleName || null;
    updates.familyName = newUser.familyName || null;
    updates.biography = newUser.biography || null;
    updates.photoUrl = newUser.photoUrl || db.User.tableAttributes.photoUrl.defaultValue;
    
    
    if (newUser.password) {
      // logic for updating password      
      if (newUser.passwordConfirmation === newUser.password) {
        promises.push(db.User.authenticate(user.email, newUser.oldPassword)
                      .then(function(authenticatedUser) {
                        user.salt = null
                        updates.password = newUser.password || '';
                        return Promise.resolve(user);
                      })
                      .catch(function(err) {
                               errors.push('invalid old password');
                               return Promise.reject(err);
                             }));
      } else {
        promises.push(Promise.reject(new Error('passwords do not match')));
        errors.push('passwords do not match');
      }
    } 
    
    if (newUser.email !== user.email) {
      promises.push(db.User.findOne({where: { email: newUser.email}})
                    .then(function(foundUser) {
                      if (foundUser === null) {
                        updates.emailVerified = false;
                        updates.email = newUser.email;
                        return Promise.resolve(true);
                      }
                      errors.push('user with that email already exists')
                      return Promise.reject(new Error('user already exists'));
                    }));
    }

    if (newUser.displayName !== user.displayName) {
      // logic for updating display name
      updates.displayName = newUser.displayName;
      promises.push(db.User.findOne({where: { displayName: newUser.displayName}})
                    .then(function(user) {
                      if (user === null) return Promise.resolve(true);
                      errors.push('user with that name already exists')
                      return Promise.reject(new Error('user already exists'));
                    }));
    } 
    userToUpdate = user;
    return Promise.all(promises);
  })
  .then(function() {
    return userToUpdate.update(updates);
  })
  .then(function(user) {
    var resJSON = {success: true, message: ['User settings have been updated!']};
    if (updates.password) {
      resJSON.message.push('Password has been changed.');
      if (updates.displayName) req.flash('info', 'Password has been changed.');
    }

    if (updates.displayName) {
      req.flash('info', 'Display name changed.');
      req.flash('info', 'User settings have been updated!');
      resJSON.redirect = true;
      resJSON.redirectLink = '/user/edit/' + encodeURIComponent(updates.displayName);
    }
    if (updates.email) {
      resJSON.message.push('Email changed: a verification email has been sent.');
      if (updates.displayName) req.flash('info', 'Email changed: a verification email has been sent.');
      return emailVerifier.resetToken(updates.email)
             .then(function(token) {
               return emailVerifier.verify(user, token);
             })
             .then(function() {
               return res.json(resJSON);
             });
    } else {
      return res.json(resJSON);
    }
  })
  .catch(function(err) {
           if (err.errors) {
             err.errors.forEach(function(err) {
               errors.push(err.message);
             });
           } else if (!errors.length) {
             errors.push(err.toString());
           }
           return res.json({error: errors});
         });
});

router.post('/verify/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = req.params.displayName;
  // expect an email in the form of json {email: 'a@a.com'}
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  if (!req.body.email) return res.json({error: 'no email was found in request'});
  var email = req.body.email.trim().toLowerCase();
  req.checkBody('email').isEmail();
  if (req.validationErrors().length) return res.json({error: req.validationErrors()[0].msg});
  Promise.join(db.User.findOne({where: { displayName: displayName}}), db.User.findOne({where: { email: email}}))
  .spread(function(userA, userB) {
    if (userA === null) return res.json({error: 'user does not exist'});
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