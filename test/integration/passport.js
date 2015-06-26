var expect = require('chai').expect;
var sinon = require('sinon');

var crypto = require('crypto');
var Promise = require('bluebird');

var config = require('config');
var db = require('../../models');
var passport = require('../../lib/passport');

var FakeRequest = require('../support/fakeRequest');

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

  describe.only('localRegistration', function() {
    before(function() {
      var sweetCaptcha = this.sweetCaptcha = require('../../lib/sweetCaptcha');
      var emailVerifier = this.emailVerifier = require('../../lib/emailVerifier');
      sinon.stub(sweetCaptcha, 'api', function(method, sweetCaptchaKeys, callback) {        
        expect(method).to.equal('check');
        // just make the captcha true
        callback(null, 'true');
      });      
      sinon.stub(emailVerifier, 'verify').returns(Promise.resolve(true));
    });
    after(function() {      
      this.sweetCaptcha.api.restore();
      this.emailVerifier.verify.restore();
    });
    it('should create a new user', function(done) {
      var req = new FakeRequest({displayName: 'phil', 
                                 email: ' phiL@abc.com ', 
                                 password: encryptPassword('abcabcabc'), 
                                 passwordConfirmation: encryptPassword('abcabcabc'),
                                 biography: 'hello'});
      var callback = function(err, user, message) {
        expect(user).to.not.be.null;
        expect(user.email).to.equal('phil@abc.com'); // make sure email is trimmed
        expect(user.photoUrl).to.equal('/images/default-profile.jpg'); // no image means default
        expect(user.biographyHtml).to.equal('<p>hello</p>'); // bio is converted
        done();
      };
      passport._strategies.localRegistration._verify(req, undefined, undefined, callback);
    });
  });
});

function encryptPassword(password)  {
  return crypto.publicEncrypt(config.rsaPublicKey, new Buffer(password, 'utf8')).toString('base64');
}
