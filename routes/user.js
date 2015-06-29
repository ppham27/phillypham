var express = require('express');
var router = express.Router();

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

var emailVerifier = require('../lib/emailVerifier');


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

router.post('/verify/:displayName', authorize({userId: true, role: 'user_manager'}), function(req, res, next) {
  var displayName = decodeURIComponent(req.params.displayName);
  // expect an email in the form of json {email: 'a@a.com'}
  if (!req.body.email) return res.json({error: 'no email was found in request'});
  req.checkBody('email').isEmail();
  if (req.validationErrors().length) return res.json({error: req.validationErrors()[0].msg});
  Promise.join(db.User.findOne({where: { displayName: displayName}}), db.User.findOne({where: { email: req.body.email}}))
  .spread(function(userA, userB) {
    if (userB && userA.id !== userB.id) return res.json({error: 'this email has already been taken'});      
    if (userB && userA.id === userB.id && userA.emailVerified) return res.json({error: 'this email is already verified'});      
    userA.email = req.body.email;
    return userA.save()
           .then(function() {
             return emailVerifier.resetToken(userA.email)
                    .then(function(token) {
                      return emailVerifier.verify(userA, token);
                    })
                    .then(function() {
                      res.json({success: true, message: 'email address has been updated and verification email has been sent.'});
                    });
           });    
  });
});

module.exports = router;