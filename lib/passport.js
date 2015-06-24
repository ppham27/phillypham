var config = require('config');
var url = require('url');
var Promise = require('bluebird');
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
                  return db.User.findOne({where: {facebookId: profile.id}})
                         .then(function(user) {
                           if (user) return Promise.resolve(user);
                           if (profile.emails.length) {
                             // merge accounts by email
                             return db.User.findOne({where: {email: profile.emails[0].value}});                      
                           } else {                      
                             return createNewFacebookUser();
                           }
                         })
                         .then(function(user) {
                           if (user !== null && user.id && user.facebookId !== profile.id) {
                             // user needs to be merged, facebook info is the best, force it
                             user = profileUser(user, profile, true);
                             return user.save();
                           } else {
                             // either new user or facebook user
                             if (user === null) user = createNewFacebookUser();
                             return Promise.resolve(user);
                           }
                         })
                         .then(function(user) {
                           done(null, user);
                         });                  
                  function createNewFacebookUser() {
                    return db.UserGroup.findById(db.ApplicationSettings.defaultUserGroupId)
                           .then(function(userGroup) {
                             var newUser = profileUser(db.User.build(), profile, true);
                             return userGroup.addUser(newUser);
                           });
                  } 
                })
            );

passport.use('google', 
             new GoogleStrategy({
               clientID: config.appKeys.google.clientID,
               clientSecret: config.appKeys.google.clientSecret,
               callbackURL: url.resolve(config.siteUrl, 'auth/google/callback')
             }, function(accessToken, refreshToken, profile, done) {                                    
                  return db.User.findOne({where: {googleId: profile.id}})
                         .then(function(user) {
                           if (user) return Promise.resolve(user);
                           // google always gives an email
                           return db.User.findOne({where: {email: profile.emails[0].value}})
                         })
                         .then(function(user) {
                           if (user === null) {
                             user = createNewGoogleUser();
                             return Promise.resolve(user);
                           } else {
                             // user with that email already exists
                             if (!user.facebookId) {
                               // prefer google
                               user = profileUser(user, profile, true);
                             } else {
                               // if the facebook id exists just fill in missing information
                               user = profileUser(user, profile, false);
                             }
                             return user.save();
                           }
                         })
                         .then(function(user) {
                           done(null, user);
                         });
                  function createNewGoogleUser() {
                    return db.UserGroup.findById(db.ApplicationSettings.defaultUserGroupId)
                           .then(function(userGroup) {
                             var newUser = profileUser(db.User.build(), profile, true);
                             return userGroup.addUser(newUser);
                           });
                  }
                })
            );

module.exports = passport;

function profileUser(user, profile, force) {
  switch (profile.provider) {
    case 'facebook':
    user.facebookId = profile.id;
    break;
    case 'google':
    user.googleId = profile.id;
    // google puts a query string ?sz=50 that we want to strip
    profile.photos[0].value = profile.photos[0].value.split('?')[0];
    break;    
  }
  if (force === true) {
    user.displayName = profile.displayName;
    user.givenName = profile.name.givenName;
    if (profile.name.middleName) user.middleName = profile.name.middleName;
    user.familyName = profile.name.familyName;
    user.photoUrl = profile.photos.length ? profile.photos[0].value : '/images/default-profile.jpg';
    if (profile.emails.length) {
      // assume third party services verifies emails
      user.email = profile.emails[0].value;
      user.emailVerified = true;
    }
  } else {
    user.displayName = user.displayName || profile.displayName;
    user.givenName = user.givenName || profile.givenName;
    if (profile.name.middleName && !user.middleName) user.middleName = profile.name.middleName;
    user.familyName = user.familyName || profile.name.familyName;
    if ((!user.photoUrl || user.photoUrl === '/images/default-profile.jpg')
      && profile.photos.length) user.photoUrl = profile.photos[0].value;
    if ((!user.email || !user.emailVerified) && profile.emails.length) {
      user.email = profile.emails[0].value;
      user.emailVerified = true;
    }  
  }  
  return user;
}

