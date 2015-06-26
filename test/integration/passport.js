var expect = require('chai').expect;
var sinon = require('sinon');

var crypto = require('crypto');

var config = require('config');
var db = require('../../models');
var passport = require('../../lib/passport');

describe('passport', function() {  
  beforeEach(function(done) {
    if (db.isReady) {
      syncAndLoad();
    } else {
      db.on('ready', syncAndLoad);
    }
    function syncAndLoad() {
      db.sequelize.sync({force: true})
      .then(function() {
        return db.loadFixtures(config.fixtures);
      })
      .then(function() {
        done();
      });
    }
  });  

  describe('local login', function() {
    it('should login user', function(done) {
      var callback = function(err, user) {
        expect(err).to.be.null;
        db.User.findOne({where: {email: 'admin@admin.com'}})
        .then(function(foundUser) {        
          expect(foundUser).to.not.be.null;
          expect(user.id).to.equal(foundUser.id);
          expect(user.displayName).to.equal(foundUser.displayName);
          return done();
        });
      }
      passport._strategies.local._verify('admin@admin.com', 
                                         encryptPassword('password'), 
                                         callback);
    });

    it('should fail login with bad credentials', function(done) {
      var callback = function(err, user, validationErrorMessage) {
        expect(err).to.be.null;
        expect(user).to.be.false;
        expect(validationErrorMessage).to.match(/invalid password/);
        done();
      }
      passport._strategies.local._verify('admin@admin.com', 
                                         encryptPassword('pasword'), 
                                         callback);
    });

    it('should detect tampered with passwords', function(done) {
      var callback = function(err, user, validationErrorMessage) {
        expect(err).to.be.null;
        expect(user).to.be.false;
        expect(validationErrorMessage).to.match(/password could not be decrypted/);
        done();
      }
      passport._strategies.local._verify('admin@admin.com', 
                                         encryptPassword('pasword') + 'a', 
                                         callback);
    });

    it('should detect non-existent user', function(done) {
      var callback = function(err, user, validationErrorMessage) {
        expect(err).to.be.null;
        expect(user).to.be.false;
        expect(validationErrorMessage).to.match(/user does not exist/);
        done();
      }
      passport._strategies.local._verify('amin@admin.com', 
                                         encryptPassword('password'), 
                                         callback);
    });
  });

  describe('localRegistration', function() {
    
  });
});

function encryptPassword(password)  {
  return crypto.publicEncrypt(config.rsaPublicKey, new Buffer(password, 'utf8')).toString('base64');
}
