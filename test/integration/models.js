var expect = require('chai').expect;
var Promise = require('bluebird');

describe('associations', function() {
  before(function(done) {
    this.db = require('../../models');
    if (this.db.isReady) {
      done();
    } else {
      this.db.once('ready', done);
    }
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
      db.User.create({displayName: 'phil', email: 'a@aabc.com'})
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
        return userGroup.createUser({displayName: 'phil', email: 'phil@abc.com', password: 'aaaaaaaaaaa'});
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
      var phil;
      var mark;
      db.UserGroup.create({name: 'standard'})
      .then(function(userGroup) {
        return Promise.all([userGroup.createRole({name: 'poster'}),
                            userGroup.createUser({displayName: 'phil', email: 'phil@a.com', emailVerified: true, password: 'aaaaaaaaaaaa'}), 
                            userGroup.createUser({displayName: 'jobin', email: 'jobin@b.com', emailVerified: true, password: 'bbbbbbbbbbbb'}),
                            userGroup.createUser({displayName: 'mark', email: 'mark@c.com', emailVerified: false, password: 'bbbbbbbbbbbb'})]);
      })
      .then(function(instances) {
        phil = instances[1];
        mark = instances[3];
        var role = db.Role.build({name: 'commenter'});
        return role.save();
      })
      .then(function(role) {
        return Promise.all([phil.addRole(role), mark.addRole(role)]);
      })
      .then(function(role) {
        done();
      });
    });

    it('should get user roles through the group', function(done) {
      var db = this.db;
      Promise.all([db.User.find({where: {displayName: 'phil'}})
                   .then(function(user) {
                     return Promise.map(['poster', 'commenter'], function(role) {
                              return user.hasPermission(role);
                            });
                   })
                   .each(function(hasPermission) {
                     expect(hasPermission).to.be.true;
                   }), 
                   db.User.find({where: {displayName: 'jobin'}})
                   .then(function(user) {
                     return Promise.props({poster: user.hasPermission('poster'), 
                                           commenter: user.hasPermission('commenter') });
                   })
                   .then(function(userPermissions) {
                     expect(userPermissions.poster).to.be.true;
                     expect(userPermissions.commenter).to.be.false;
                   })])
      .then(function() { done(); });
    });

    it('should return false for unverified users', function(done) {
      var db = this.db;
      db.User.find({where: {displayName: 'mark'}})
      .then(function(user) {
        return Promise.map(['poster', 'commenter'], function(role) {
                 return user.hasPermission(role);
               });
      })
      .each(function(hasPermission) {
        expect(hasPermission).to.be.false;
      })
      .then(function() {
        done();
      });
    });
  });
});

