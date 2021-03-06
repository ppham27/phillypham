var expect = require('chai').expect;
var sinon = require('sinon');
var http = require('http');
var url = require('url');
var config = require('config');
var random = require('../../lib/random');
var transporter = require('../../lib/smtpTransporter');

describe('registration', function() {  
  before(function(done) {    
    var sweetCaptcha = this.sweetCaptcha = require('../../lib/sweetCaptcha');
    var emailVerifier = this.emailVerifier = require('../../lib/emailVerifier');
    sinon.stub(sweetCaptcha, 'api', function(method, sweetCaptchaKeys, callback) {        
      if (method === 'check') return callback(null, 'true');
      if (method === 'get_html') return sweetCaptchaKeys(null, '');
    });      
    sinon.stub(emailVerifier, 'verify').returns(Promise.resolve(true));
    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app');
    this.db = require('../../models');
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    if (this.app.isReady) {
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {        
        return db.loadFixtures(config.fixtures);        
      })
      .then(function() {
        done();
      });
    } else {
      this.app.once('ready', function() {
        done();
      });    
    }
  });

  beforeEach(function(done) {
    this.browser = require('../support/browser')(); 
    this.browser.init()
    .timeoutsImplicitWait(1000)
    .url(this.siteUrl)
    .then(function() {
      done();
    });
  });
  
  afterEach(function(done) {
    this.browser.end()
    .then(function() {
      done();
    });
  });

  after(function(done) {
    this.sweetCaptcha.api.restore();
    this.emailVerifier.verify.restore();
    this.server.close(function(err) {
      done(err);
    });
  });

  it('should register a user', function(done) {
    var browser = this.browser;
    var siteUrl = this.siteUrl;
    var db = this.db;
    browser.click('a.topbar-link[href="/register"]')
    .pause(1000)
    .setValue('input[name="displayName"]', 'im a new user')
    .setValue('input[name="email"]', 'newuser@gmail.com')
    .setValue('input[name="password"]', 'newpassword')
    .setValue('input[name="passwordConfirmation"]', 'newpassword')
    .click('button[type="submit"]')
    .pause(1000)
    .url()
    .then(function(res) {
      expect(url.parse(res.value).path).to.equal('/');
      return browser.getText('#topbar');      
    })
    .then(function(text) {
      expect(text).to.match(/Hello, im a new user/);
    })
    .url(url.resolve(siteUrl, 'register'))
    .getText('input[name="displayName"]')
    .then(function(text) {
      expect(text).to.equal('');
      db.User.findOne({where: {email: 'newuser@gmail.com'}})
      .then(function(user) {
        expect(user.displayName).to.equal('im a new user');
        done();
      });
    });
  });

  it('on error it should flash error message and refill forms', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('a.topbar-link[href="/register"]')
    .pause(1000)
    .setValue('input[name="displayName"]', 'im a new user')
    .setValue('input[name="email"]', 'newuser1@gmail.com')
    .setValue('input[name="password"]', 'new')
    .setValue('input[name="passwordConfirmation"]', 'new')
    .setValue('input[name="givenName"]', 'my first name')
    .click('button[type="submit"]')
    .url()
    .then(function(res) {
      expect(url.parse(res.value).path).to.equal('/register');
      return browser.getText('#flash');      
    })
    .then(function(text) {
      expect(text).to.match(/too short/);
      return browser.getAttribute('input[name="givenName"]','value');
    })
    .then(function(text) {
      expect(text).to.equal('my first name');
      done();
    });
  });
});

describe('email verification', function() {
  before(function(done) {    
    var sweetCaptcha = this.sweetCaptcha = require('../../lib/sweetCaptcha');    
    sinon.stub(sweetCaptcha, 'api', function(method, sweetCaptchaKeys, callback) {        
      if (method === 'check') return callback(null, 'true');
      if (method === 'get_html') return sweetCaptchaKeys(null, '');
    });      
    sinon.stub(random, 'token').returns('simpleToken');
    sinon.stub(transporter, 'sendMail', function(mailOptions, callback) {
      callback(null, true);      
    });

    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app');
    this.db = require('../../models');
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    if (this.app.isReady) {
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {        
        return db.loadFixtures(config.fixtures);        
      })
      .then(function() {
        done();
      });
    } else {
      this.app.once('ready', function() {
        done();
      });    
    }
  });

  beforeEach(function(done) {
    this.browser = require('../support/browser')(); 
    this.browser.init()
    .url(this.siteUrl)
    .then(function() {
      done();
    });
  });
  
  afterEach(function(done) {
    this.browser.end()
    .then(function() {
      done();
    });
  });

  after(function(done) {
    this.sweetCaptcha.api.restore();
    random.token.restore();
    transporter.sendMail.restore();
    this.server.close(function(err) {
      done(err);
    });
  });

  it('should verify a user after going to link', function(done) {
    var browser = this.browser;
    var siteUrl = this.siteUrl;
    var db = this.db;
    browser.click('a.topbar-link[href="/register"]')
    .pause(1000)
    .setValue('input[name="displayName"]', 'im a new user')
    .setValue('input[name="email"]', 'newuser@gmail.com')
    .setValue('input[name="password"]', 'newpassword')
    .setValue('input[name="passwordConfirmation"]', 'newpassword')
    .click('button[type="submit"]')
    .pause(2000)
    .then(function() {
      db.User.findOne({where: {email: 'newuser@gmail.com'}})
      .then(function(user) {
        expect(user.emailVerified).to.be.false;
        browser.url(url.resolve(siteUrl, '/register/verify/simpleToken'))
        .pause(1000)
        .then(function() {
          user.reload()
          .then(function(user) {
            expect(user.emailVerified).to.be.true;
            done();
          });          
        });
      });
    });
  });  
});