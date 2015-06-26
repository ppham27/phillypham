var expect = require('chai').expect;
var sinon = require('sinon');

var path = require('path');
var crypto = require('crypto');
var Promise = require('bluebird');

var config = require('config');
var db = require('../../models');
var passport = require('../../lib/passport');
var fs = require('fs');

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

  describe('localRegistration captcha fail', function() {
    before(function() {
      var sweetCaptcha = this.sweetCaptcha = require('../../lib/sweetCaptcha');
      var emailVerifier = this.emailVerifier = require('../../lib/emailVerifier');
      sinon.stub(sweetCaptcha, 'api', function(method, sweetCaptchaKeys, callback) {        
        expect(method).to.equal('check');
        // just make the captcha true
        callback(null, 'false');
      });      
      sinon.stub(emailVerifier, 'verify').returns(Promise.resolve(true));
    });

    after(function() {      
      this.sweetCaptcha.api.restore();
      this.emailVerifier.verify.restore();
    });

    it('should reject if the captcha is false', function(done) {
      var req = new FakeRequest({displayName: 'phil', 
                                 email: ' phiL@abc.com ', 
                                 password: encryptPassword('abcabcabc'), 
                                 passwordConfirmation: encryptPassword('abcabcabc'),
                                 biography: 'hello'});
      var self = this;
      var callback = function(err, user, message) {
        expect(user).be.false;
        var captchaError = false;
        req.session.flash.forEach(function(flashMessage) {
          if (flashMessage.type === 'error' && /failed the captcha/.test(flashMessage.message)) captchaError = true;
        });
        expect(captchaError).to.be.true;
        done();
      };      
      passport._strategies.localRegistration._verify(req, undefined, undefined, callback);
    });
  });

  describe('localRegistration', function() {
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

    it('should reject when password is too short', function(done) {
      var req = new FakeRequest({displayName: 'phil', 
                                 email: ' phiL@abc.com ', 
                                 password: encryptPassword('abc'), 
                                 passwordConfirmation: encryptPassword('abc'),
                                 biography: 'hello'});
      var callback = function(err, user, message) {
        expect(user).to.be.false;
        var foundPasswordLengthError = false;
        req.session.flash.forEach(function(flashMessage) {
          if (flashMessage.type === 'error' && /too short/.test(flashMessage.message)) foundPasswordLengthError = true;
        });
        expect(foundPasswordLengthError).to.be.true;
        done();
      };
      passport._strategies.localRegistration._verify(req, undefined, undefined, callback);
    });

    it('should reject when there is no username', function(done) {
      var req = new FakeRequest({displayName: '',
                                 email: ' phiL@abc.com ', 
                                 password: encryptPassword('abcabcabc'), 
                                 passwordConfirmation: encryptPassword('abcabcabc'),
                                 biography: 'hello'});
      var callback = function(err, user, message) {
        expect(user).to.be.false;
        var displayNameLengthError = false;
        req.session.flash.forEach(function(flashMessage) {
          if (flashMessage.type === 'error' && /too short/.test(flashMessage.message)) displayNameLengthError = true;
        });
        expect(displayNameLengthError).to.be.true;
        done();
      };
      passport._strategies.localRegistration._verify(req, undefined, undefined, callback);
    });
  });

  describe('facebook', function() {
    it('should make a new user', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/facebookProfile.json'), 'ascii'));
      var callback = function(err, user, message) {
        expect(user.email).to.equal('pp@gmail.com');
        db.User.findOne({where: {email: 'pp@gmail.com'}})
        .then(function(user) {
          expect(user).to.not.be.null;
          expect(user.displayName).to.equal('user name');
          done();
        });       
      }      
      passport._strategies.facebook._verify(undefined, undefined, profile, callback);
    });        
    
    // make a test for users with no    
    it('should log in old users without changing their data', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/facebookProfile.json'), 'ascii'));
      var callback = function(err, user, message) {
        user.givenName = 'new name';
        user.save()
        .then(function(user) {
          var callback = function(err, user, message) {
            expect(user.email).to.equal('pp@gmail.com');
            expect(user.displayName).to.equal('user name'); 
            expect(user.givenName).to.equal('new name'); //make sure we get new data from user
            done();
          }
          passport._strategies.facebook._verify(undefined, undefined, profile, callback);          
        }); 
      }   
      passport._strategies.facebook._verify(undefined, undefined, profile, callback);          
    });
  });

  describe('google', function() {
    it('should make a new user', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/googleProfile.json'), 'ascii'));
      var callback = function(err, user, message) {
        expect(user.email).to.equal('phillyphamtest@gmail.com');
        db.User.findOne({where: {email: user.email}})
        .then(function(user) {
          expect(user).to.not.be.null;
          expect(user.displayName).to.equal('Tester1 Phillypham');
          done();
        });       
      }      
      passport._strategies.google._verify(undefined, undefined, profile, callback);
    });        

    it('should relogin old user keeping their changes', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/googleProfile.json'), 'ascii'));
      var callback = function(err, user, message) {        
        user.familyName = 'maiden';
        user.save()
        .then(function(user) {
          var callback = function(err, user, message) {
            expect(user.email).to.equal('phillyphamtest@gmail.com');
            expect(user.displayName).to.equal('Tester1 Phillypham');
            expect(user.familyName).to.equal('maiden'); // make sure data is updated
            done();
          }
          passport._strategies.google._verify(undefined, undefined, profile, callback);      
        });       
      }      
      passport._strategies.google._verify(undefined, undefined, profile, callback);      
    });
  });
});

function encryptPassword(password)  {
  return crypto.publicEncrypt(config.rsaPublicKey, new Buffer(password, 'utf8')).toString('base64');
}



