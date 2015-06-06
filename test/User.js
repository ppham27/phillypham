var expect = require('chai').expect;
var db = require('./support/db');

describe('User', function() {
  beforeEach(function(done) {
    this.User = db.sequelize.import('../models/User');
    this.User.sync({force: true}).then(function() {
      done();
    });
  });  

  it('should build user', function() {
    var u = this.User.build({displayName: 'phil'});
    expect(u.displayName).to.equal('phil');
  });

  it('should save user', function(done) {
    var User = this.User;
    var u = User.build({displayName: 'phil'});
    u.save().then(function() {
      User.findOne({where: {displayName: 'phil'}}).then(function(u) {
        expect(u.displayName).to.equal('phil');
        done();
      });
    });
  });
 
});