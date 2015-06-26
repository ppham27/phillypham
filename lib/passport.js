var config = require('config');
var url = require('url');
var Promise = require('bluebird');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var crypto = require('crypto');

var db = require('../models');
var sweetCaptcha = require('./sweetCaptcha');
var emailVerifier = require('./emailVerifier');

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

passport.use('localRegistration',
             new LocalStrategy({
               usernameField: 'email',
               passwordField: 'password',
               passReqToCallback: true
             }, function(req, email, encryptedPassword, done) {                  
                  var user = req.body;                  
                  // validation
                  var isError = false;
                  var decryptedPassword, decryptedPasswordConfirmation;
                  try {
                    decryptedPassword = crypto.privateDecrypt(config.rsaPrivateKey,
                                                                  new Buffer(user.password, 'base64')).toString();
                    decryptedPasswordConfirmation = crypto.privateDecrypt(config.rsaPrivateKey,
                                                                          new Buffer(user.passwordConfirmation, 'base64')).toString();
                  } catch(err) {
                    req.flash('error', 'passwords could not be decrypted');
                    isError = true;
                  }
                  if (decryptedPassword !== decryptedPasswordConfirmation) {
                    req.flash('error', 'passwords do not match');
                    isError = true;
                  } else {
                    user.password = decryptedPassword;
                  }                 
                  // trim everything but password
                  Object.keys(user).forEach(function(key) { 
                    if (key !== 'password') user[key] = user[key].trim(); 
                  });
                  // we can safely assume there is an email thanks to passport
                  user.email = user.email.toLowerCase().trim();
                  if (!user.email) { // will only fire if email is all white space
                    req.flash('error', 'missing email address'); 
                    isError = true;
                  }
                  sweetCaptcha.api('check', {sckey: user.sckey, scvalue: user.scvalue, scvalue2: user.scvalue2}, function(err, valid) {
                    // note that valid is a string here, very non intuitive
                    if (err) {
                      isError = true;
                      req.flash('error', err.toString());
                    }                      
                    if (valid === 'false') {
                      isError = true;
                      req.flash('error', 'you failed the captcha');
                    }
                    if (isError) {
                      // store in temporary user for partially filled form
                      req.session.temporaryUser = user;
                      return done(null, false);  
                    }
                    user.userGroupId = db.ApplicationSettings.defaultUserGroupId;
                    return db.User.findOrCreate({where: {email: user.email}, defaults: user})
                           .spread(function(user, created) {
                             if (created) {
                               // success
                               req.user = user;
                               req.flash('info', 'You have successfully registered!');
                               req.flash('info', 'To complete registration, click on the link in the confirmation email. If you do not receive one, check your spam folder or request a new one by going to user settings.'); 
                               var session = req.session;
                               emailVerifier.verify(user)	                           
                               .catch(function(err) {                                        
                                        // assume success and silently fail
                                        console.error(err);
                                      });
                               delete req.session.temporaryUser; // we don't need this anymore
                               done(null, user);
                             } else {
                               req.flash('error', 'an account with this email already exists');
                               // store in temporary user for partially filled form
                               req.session.temporaryUser = user;
                               return done(null, false);
                             }
                           })
                           .catch(function(err) {
                                    if (!err.errors) return done(null, false, err);
                                    err.errors.forEach(function(err) {
                                      if (err.message === 'Validation len failed') {
                                        req.flash('error', 'username and/or password is too short');
                                      } else if (err.message === 'Validation isEmail failed') {
                                        req.flash('error', 'your email is address is not properly formatted');
                                      } else {
                                        req.flash('error', err.message);
                                      }                                   
                                    });
                                    // store in temporary user for partially filled form
                                    req.session.temporaryUser = user;
                                    return done(null, false);
                                  });
                  });
                  
                }
                              ));
                               



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
                             return db.User.find({where: {email: profile.emails[0].value}});
                           } else {                                  
                             return createNewFacebookUser(profile);
                           }
                         })
                         .then(function(user) {
                           // check for old user
                           if (user !== null && user.id && user.facebookId !== profile.id) {
                             // user needs to be merged, facebook info is the best, force it
                             user = profileUser(user, profile, true);
                             return user.save();
                           } else if (user === null) {
                             // either new user or facebook user
                             return createNewFacebookUser(profile);
                           } else {
                             // old user
                             return Promise.resolve(user);
                           }
                         })
                         .then(function(user) {
                           done(null, user);
                         });      
                  function createNewFacebookUser(profile) {
                    var newUser = profileUser(db.User.build(), profile, true);
                    newUser.userGroupId = db.ApplicationSettings.defaultUserGroupId;
                    return newUser.save();
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
                             // new user
                             return createNewGoogleUser(profile);
                           } if (user.googleId === profile.id) {
                             // old user
                             return Promise.resolve(user);
                           } else {
                             // exist but first time logging in with google
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
                  function createNewGoogleUser(profile) {
                    var newUser = profileUser(db.User.build(), profile, true);
                    newUser.userGroupId = db.ApplicationSettings.defaultUserGroupId;
                    return newUser.save();
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

