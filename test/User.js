var expect = require('chai').expect;
var Sequelize = require('sequelize');

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

  it('should not allow short passwords', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', password: '1234567'})
    .catch(function(err) {
      expect(err).to.be.instanceOf(db.sequelize.ValidationError);
      done();
    });
  });

  it('should add salt and hash passwords', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', password: '123456789'})
    .then(function(user) {
      expect(user.salt).to.be.not.null;
      expect(user.password).to.not.equal('123456789');
      done();
    });
  });

  
});