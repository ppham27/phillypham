var expect = require('chai').expect;
var Promise = require('bluebird');

describe('associations', function() {
  before(function(done) {
    this.db = require('../../models');
    this.db.once('ready', done);
  });

  beforeEach(function(done) {
    this.db.sequelize.sync({force: true})
    .then(function() {
      done();
    });
  });

  describe('User belongs to UserGroup', function() {
    it('should enforce that every user belongs to a group', function(done) {
      var db = this.db;
      db.User.create({displayName: 'phil'})
      .then(function(user) {
        throw new Error('this should not be called');
      })
      .catch(function(err) {
               expect(err).to.be.instanceOf(db.Sequelize.ValidationError);
               done();
             });
    });
    
    it('should not allow deletion of groups with users', function(done) {
      var db = this.db;
      db.UserGroup.create({name: 'A'})
      .then(function(userGroup) {
        return userGroup.createUser({name: 'phil', password: 'a'});
      })
      .then(function(user) {
        return db.UserGroup.create({name: 'B'});
      })
      .then(function(userGroup) {
        return db.UserGroup.findOne({where: {name: 'A'}});
      })
      .then(function(userGroup) {
        return userGroup.destroy();
      })
      .catch(function(err) {
               expect(err).to.be.instanceOf(Error, /must have no users/);
               return db.UserGroup.findOne({where: {name: 'B'}});
             })
      .then(function(userGroup) {
        return userGroup.destroy();
      })
      .then(function(userGroup) {
        expect(userGroup).to.be.empty;
        done();
      });      
    });      
  });  
  
  describe('Roles', function() {
    beforeEach(function(done) {
      var db = this.db;
      var user;
      db.UserGroup.create({name: 'standard'})
      .then(function(userGroup) {
        return Promise.all([userGroup.createRole({name: 'poster'}),
                            userGroup.createUser({displayName: 'phil', password: 'a'}), 
                            userGroup.createUser({displayName: 'jobin', password: 'b'})]);
      })
      .then(function(instances) {
        user = instances[1];
        var role = db.Role.build({name: 'commenter'});
        return role.save();
      })
      .then(function(role) {
        return user.addRole(role);        
      })
      .then(function(role) {
        done();
      });
    });

    it('should get user roles through the group', function(done) {
      done();
    });
  });
});

