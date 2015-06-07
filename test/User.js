var expect = require('chai').expect;

describe('User', function() {
  beforeEach(function(done) {
    this.db = require('./support/db');
    this.User = this.db.sequelize.import('../models/User');
    this.User.sync({force: true}).then(function() {
      done();
    });
  });  

  it('should build user', function() {
    var u = this.User.build({displayName: 'phil', password: 'a'});
    expect(u.displayName).to.equal('phil');
  }); 

  it('should not allow duplicate names', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', password: 'phil'})
    .then(function(user) {
      return User.create({displayName: 'phil', password: 'chris'})
    })    
    .catch(function(err) {
      expect(err).to.be.instanceOf(db.Sequelize.ValidationError);
      done();
    });    
  }); 

  
});