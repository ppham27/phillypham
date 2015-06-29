module.exports = function(options) {
  options = options || {};
  options.userId = options.userId || false;
  options.loggedIn = options.loggedIn || false;
  options.emailVerified = options.emailVerified || false;
  options.role = options.role || false;
  return function(req, res, next) {    
    var fail = function() {
      // do nothing let the next middleware handle the failure      
      if (options.failureSilent) return next();      
      if (options.failureRedirect) {        
        if (options.failureFlash) req.flash('error', 'Not authorized. You may need to verify your email address.');
        res.redirect(options.failureRedirect);
      } 
      return next(new Error('Not authorized. You may need to verify your email address.'));
    }
    var success = function() {
      req.authorized = true;
      return next();
    }
    if (!req.user) return fail();
    if (options.loggedIn) return success(); // it's enough just to be logged in
    if (options.userId && req.user.displayName === req.params.displayName) return success();
    // every thing below here requires email verification
    if (req.user.emailVerified) return success();
    if (options.role && req.session.roles[options.role]) {
      if (req.user.emailVerified) return success();      
    }
    return fail();
  }
}