var config = require('config');
var url = require('url');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var db = require('../models');
var crypto = require('crypto');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.User.findById(id)
  .then(function(user) {
    done(null, user);
  })
  .catch(function(err) {
           done(err);
         });
});

passport.use('local', 
             new LocalStrategy({
               usernameField: 'email',
               passwordField: 'password'
             },
             function(email, encryptedPassword, done) {
               email = email.toLowerCase();
               var decryptedPassword;
               try {
                 decryptedPassword = crypto.privateDecrypt(config.rsaPrivateKey,
                                                           new Buffer(encryptedPassword, 'base64')).toString();
               } catch(err) {
                 return done(null, false, 'password could not be decrypted');
               }               
               return db.User.authenticate(email, decryptedPassword)
                      .then(function(user) {
                        done(null, user);  
                      })
                      .catch(function(err) {                      
                               done(null, false, err.message);  
                             });
             }));



passport.use('facebook',
             new FacebookStrategy({
               clientID: config.appKeys.facebook.clientID,
               clientSecret: config.appKeys.facebook.clientSecret,
               callbackURL: url.resolve(config.siteUrl, 'auth/facebook/callback'),
               profileFields: ['id', 'name', 'displayName', 'picture.type(large)', 'emails']
             }, function(accessToken, refreshToken, profile, done) {
                  db.User.findOne({where: {facebookId: profile.id}})
                  .then(function(user) {
                    if (user) return done(null, user);
                    var newUser = profileUser(db.User.build(), profile);
                    db.UserGroup.findById(db.ApplicationSettings.defaultUserGroupId)
                    .then(function(userGroup) {
                      return userGroup.addUser(newUser);
                    })
                    .then(function(user) {
                      done(null, user);
                    });
                  });                 
                })
            );

passport.use('google', 
             new GoogleStrategy({
               clientID: config.appKeys.google.clientID,
               clientSecret: config.appKeys.google.clientSecret,
               callbackURL: url.resolve(config.siteUrl, 'auth/google/callback')
             }, function(accessToken, refreshToken, profile, done) {                  
                  // google puts a query string ?sz=50 that we want to strip
                  profile.phtotos[0].value = profile.phtotos[0].value.split('?')[0];                  
                  return true;
                })
            );

module.exports = passport;

function profileUser(user, profile, force) {
  user.displayName = profile.displayName;
  user.facebookId = profile.id;
  user.givenName = profile.name.givenName;
  if (profile.name.middleName) user.middleName = profile.name.middleName;
  user.familyName = profile.name.familyName;
  user.photoUrl = profile.photos.length ? profile.photos[0].value : '/images/default-profile.jpg';
  if (profile.emails.length) {
    user.email = profile.emails[0].value;
    user.emailVerified = true;
  }
  return user;
}

