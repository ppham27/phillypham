var expect = require('chai').expect;
var Sequelize = require('sequelize');
var Promise = require('bluebird');

describe('User', function() {
  beforeEach(function(done) {
    this.db = require('./support/db');
    this.User = this.db.sequelize.import('../models/User');
    this.User.sync({force: true}).then(function() {
      done();
    });
  });  

  it('should build user', function() {
    var u = this.User.build({displayName: 'phil', email: 'phil@phillypham.com', password: 'a'});
    expect(u.displayName).to.equal('phil');
  }); 

  it('should not allow duplicate names', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', email: 'phil@phillypham.com', password: 'phil'})
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
    User.create({displayName: 'phil', email: 'phil@phillypham.com', password: '1234567'})
    .then(function(user) {
      throw new Error('this should not be called');
    })
    .catch(function(err) {
      expect(err).to.be.instanceOf(db.sequelize.ValidationError);
      done();
    });
  });

  it('should add salt and hash passwords', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', email: 'phil@phillypham.com', password: '123456789'})
    .then(function(user) {
      expect(user.salt).to.be.not.null;
      expect(user.password).to.not.equal('123456789');
      done();
    });
  });

  it('should only allow well-formed email address', function(done) {
    var db = this.db;
    var User = this.User;
    var p1 = User.create({displayName: 'phil', email: 'dsafsadfsd', password: '123456789'})
             .then(function(user) {
               throw new Error('this should not be called');
             })
             .catch(function(err) {
                      expect(err).to.be.instanceOf(db.sequelize.ValidationError);
                      return true;
                    });
    var p2 = User.create({displayName: 'phil', email: 'a@a.com', password: '123456789'})
             .then(function(user) {
               expect(user.email).to.equal('a@a.com');
               return true;
             });
    Promise.all([p1,p2]).then(function() { done(); });
  });  

  it('should lower case email addresses', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', email: 'PP@doMain.cOm', password: '123456789'})
    .then(function(user) {
      expect(user.email).to.equal('pp@domain.com');
      done();
    });
  });

  it('should authenticate user', function(done) {
    var db = this.db;
    var User = this.User;
    User.create({displayName: 'phil', email: 'phil@abc.com', password: '123456789'})
    .then(function(user) {
      var p1 = User.authenticate('phil@abc.com', '123456789')
               .then(function(user) {
                 expect(user.email).to.equal('phil@abc.com');
                 expect(user.displayName).to.equal('phil');
               });
      var p2 = User.authenticate('phi@abc.com', '123456789')
               .then(function(user) {
                 throw new Error('this should not be called');
               })
               .catch(function(err) {
                        expect(err).to.be.instanceOf(Sequelize.ValidationError);
                        expect(err.message).to.match(/does not exist/);
                      });
      var p3 = User.authenticate('phil@abc.com', '12345678')
               .then(function(user) {
                 throw new Error('this should not be called');
               })
               .catch(function(err) {
                        expect(err).to.be.instanceOf(Sequelize.ValidationError);
                        expect(err.message).to.match(/invalid password/);
                      });
      return Promise.all([p1, p2, p3]);
    })
    .then(function() {
      done();
    });
  });
});