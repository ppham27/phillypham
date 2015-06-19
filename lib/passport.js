var config = require('config');
var url = require('url');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var db = require('../models');

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
             function(email, password, done) {
               email = email.toLowerCase();
               db.User.authenticate(email, password)
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
                    var newUser = profileUser(profile);
                    db.UserGroup.findById(db.ApplicationSettings.defaultUserGroupId)
                    .then(function(userGroup) {
                      return userGroup.addUser(newUser);
                    })
                    .then(function(user) {
                      done(null, user);
                    });
                  });                 
                }));

module.exports = passport;

function profileUser(profile) {
  var newUser = db.User.build();
  newUser.displayName = profile.displayName;
  newUser.facebookId = profile.id;
  newUser.givenName = profile.name.givenName;
  if (profile.name.middleName) newUser.middleName = profile.name.middleName;
  newUser.familyName = profile.name.familyName;
  newUser.photoUrl = profile.photos.length ? profile.photos[0].value : '/images/default-profile.jpg';
  if (profile.emails.length) {
    newUser.email = profile.emails[0].value;
    newUser.emailVerified = true;
  }
  return newUser;
}