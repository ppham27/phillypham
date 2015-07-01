var expect = require('chai').expect;
var sinon = require('sinon');

var path = require('path');
var crypto = require('crypto');
var Promise = require('bluebird');

var config = require('config');
var db = require('../../models');
var passport = require('../../lib/passport');
var fs = require('fs');

var random = require('../../lib/random');

var FakeRequest = require('../support/fakeRequest');
var encryptPassword = require('../support/encryptPassword');

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
        // autofail captcha
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

    it('should reject when email address is not unique', function(done) {
      var req = new FakeRequest({displayName: 'phil', 
                                 email: 'admin@admin.com', 
                                 password: encryptPassword('password'), 
                                 passwordConfirmation: encryptPassword('password'),
                                 biography: 'hello'});
      var callback = function(err, user, message) {
        expect(user).to.be.false;
        var uniqueError = false;
        req.session.flash.forEach(function(flashMessage) {
          if (flashMessage.type === 'error' && /already exists/.test(flashMessage.message)) uniqueError = true;
        });
        expect(uniqueError).to.be.true;
        done();
      };
      passport._strategies.localRegistration._verify(req, undefined, undefined, callback);
    });

    it('should reject when email is not properly formatted', function(done) {
      var req = new FakeRequest({displayName: 'phil', 
                                 email: 'admin.com', 
                                 password: encryptPassword('password'), 
                                 passwordConfirmation: encryptPassword('password'),
                                 biography: 'hello'});
      var callback = function(err, user, message) {
        expect(user).to.be.false;
        var emailError = false;
        req.session.flash.forEach(function(flashMessage) {
          if (flashMessage.type === 'error' && /not properly formatted/.test(flashMessage.message)) emailError = true;
        });
        expect(emailError).to.be.true;
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
        db.User.findOne({where: {email: user.email}})
        .then(function(user) {
          expect(user).to.not.be.null;
          expect(user.displayName).to.equal('user name');
          done();
        });       
      }      
      passport._strategies.facebook._verify(undefined, undefined, profile, callback);
    });        
    
    it('should create unverified user if he or she has no email', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/facebookProfile.json'), 'ascii'));
      profile.emails.shift();
      var callback = function(err, user, message) {
        expect(user.displayName).to.equal('user name');
        db.User.findOne({where: {displayName: user.displayName}})
        .then(function(user) {
          expect(user).to.not.be.null;
          expect(user.email).to.be.null;
          expect(user.emailVerified).to.be.false;
          done();
        });       
      }      
      passport._strategies.facebook._verify(undefined, undefined, profile, callback);            
    });

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

    it('should overwrite the profiles of old users', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/facebookProfile.json'), 'ascii'));
      profile.emails[0].value = 'power@gmail.com';
      db.User.findOne({where: {email: 'power@gmail.com'}})
      .then(function(oldUser) {
        expect(oldUser.displayName).to.equal('power');
        var callback = function(err, user, message) {
          db.User.findOne({where: {email: 'power@gmail.com'}})
          .then(function(newUser) {
            expect(newUser.displayName).to.equal('user name');
            done();
          });
        }   
        passport._strategies.facebook._verify(undefined, undefined, profile, callback);          
      });
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
            expect(user.familyName).to.equal('maiden'); // make sure data is updated and not overwritten
            done();
          }
          passport._strategies.google._verify(undefined, undefined, profile, callback);      
        });       
      }      
      passport._strategies.google._verify(undefined, undefined, profile, callback);      
    });

    it('should overwrite the profiles of old users', function(done) {
      var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/googleProfile.json'), 'ascii'));
      profile.emails[0].value = 'power@gmail.com';
      db.User.findOne({where: {email: 'power@gmail.com'}})
      .then(function(oldUser) {
        expect(oldUser.displayName).to.equal('power');
        var callback = function(err, user, message) {
          db.User.findOne({where: {email: 'power@gmail.com'}})
          .then(function(newUser) {
            expect(newUser.displayName).to.equal('Tester1 Phillypham');
            done();
          });
        }   
        passport._strategies.google._verify(undefined, undefined, profile, callback);          
      });      
    });

    it('should respect facebook profile info', function(done) {
      var facebookProfile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/facebookProfile.json'), 'ascii'));
      facebookProfile.emails[0].value = 'power@gmail.com';
      var callback = function(err, user, message) {
        var profile = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/googleProfile.json'), 'ascii'));
        profile.emails[0].value = 'power@gmail.com';
        var callback = function(err, user, message) {
          expect(user.displayName).to.equal('user name');
          done();          
        }
        passport._strategies.google._verify(undefined, undefined, profile, callback);          
      }          
      passport._strategies.facebook._verify(undefined, undefined, facebookProfile, callback);                    
    });
  });

  describe('emailVerify', function(done) {
    it('should given an error message when the token is invalid', function(done) {
      var callback = function(err, user, message) {
        expect(user).to.be.false;
        expect(message).to.match(/expired/);
        done();        
      }
      passport._strategies.emailVerify._verify('nonsense token', callback);
    });

    it('should set the email verification flag to true', function(done) {
      var emailVerifier = require('../../lib/emailVerifier');
      var stub = sinon.stub(random, 'token');
      stub.returns('mytoken');
      db.User.create({displayName: 'phil', email: 'phil@abc.com', password: 'longpassword', userGroupId: 2})
      .then(function(user) {
        expect(user.emailVerified).to.be.false;
        return emailVerifier.createToken(user.email);
      })
      .then(function(token) {
        var callback = function(err, user, message) {          
          expect(user.emailVerified).to.be.true;
          random.token.restore();
          done();
        }
        passport._strategies.emailVerify._verify('mytoken', callback);
      });
    });
  });
});

