// fake request object to test forms
module.exports = function(body, authorized, acceptTypes)  {
  this.body = body;
  acceptTypes = acceptTypes || [];
  var session = this.session = {flash: []}
  this.flash = function(type, message) {
    session.flash.push({type: type, message: message});
  };
  this.accepts = function(type) {
    if (acceptTypes.indexOf(type) !== -1) return true;
    return false;
  };
  if (authorized) {
    this.isAuthorized = true;
    this.session.roles = {poster: true, commenter: true, editor: true, post_editor: true,
                          user_manager: true, settings_manager: true};
    this.user = {displayName: 'person', emailVerified: true};
    this.params = {displayName: 'person'};
  }
  return this;
};

