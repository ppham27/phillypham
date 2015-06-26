// fake request object to test forms
module.exports = function(body)  {
  this.body = body;
  var session = this.session = {flash: []}
  this.flash = function(type, message) {
    session.flash.push({type: type, message: message});
  }
  return this;
};