var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


passport.use('local', 
             new LocalStrategy({
               usernameField: 'email',
               passwordField: 'password',
               passReqToCallback: true
             }),
             function(req, email, password, done) {
               email = email.toLowerCase();
             });


