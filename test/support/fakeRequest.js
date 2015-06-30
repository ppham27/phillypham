// fake request object to test forms
var expressValidator = require('express-validator');

module.exports = function(body, authorized, options)  {
  this.body = body;
  options = options || {};
  options.accepts = options.accepts || [];
  options.is = options.is || [];
  var session = this.session = {flash: []}
  this.flash = function(type, message) {
    session.flash.push({type: type, message: message});
  };
  this.accepts = function(type) {
    if (options.accepts.indexOf(type) !== -1) return true;
    return false;
  };
  this.is = function(type) {
    if (options.is.indexOf(type) !== -1) return true;
    return false;
  };
  if (authorized) {
    this.isAuthorized = true;
    this.session.roles = {poster: true, commenter: true, editor: true, post_editor: true,
                          user_manager: true, settings_manager: true};
    this.user = {displayName: 'person', emailVerified: true};
    this.params = {displayName: 'person'};
  }
  var res = {};
  var next = function() { return true; }
  expressValidator()(this, res, next);  
  return this;
};

