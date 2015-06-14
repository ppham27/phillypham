var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
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


module.exports = passport;