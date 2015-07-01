var expect = require('chai').expect;
var sinon = require('sinon');
var http = require('http');
var url = require('url');
var config = require('config');

var random = require('../../lib/random');
var transporter = require('../../lib/smtpTransporter');

describe('update user', function() {
  before(function(done) {    
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
      done();
    } else {
      this.app.once('ready', function() {
        done();
      });    
    }
  });

  beforeEach(function(done) {
    var db = this.db;
    this.browser = require('../support/browser')(); 
    var browser = this.browser;
    var siteUrl = this.siteUrl;
    db.sequelize.sync({force: true})
    .then(function() {        
      return db.loadFixtures(config.fixtures);        
    })
    .then(function() {
      browser.init().url(siteUrl)
      .click('a.topbar-link[href="/login"]')
      .setValue('input[name="email"]', 'moderator@gmail.com')
      .setValue('input[name="password"]', 'moderator')
      .click('button[type="submit"]')
      .click('a.topbar-link[href="/user/edit/moderator"]')
      .then(function() {
        done();
      });
    });
  });
  
  afterEach(function(done) {
    this.browser.end()
    .then(function() {
      done();
    });
  });

  after(function(done) {
    random.token.restore();
    transporter.sendMail.restore();
    this.server.close(function(err) {
      done(err);
    });
  });

  it('should send verification email and change email', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser
    .setValue('input[name="email"]', 'newemail@gmail.com')
    .click('fieldset.email button')
    .pause(1000)
    .then(function() {
      db.User.findOne({where: {email: 'newemail@gmail.com'}})
      .then(function(user) {
        expect(user.displayName).to.equal('moderator');
        expect(user.emailVerified).to.be.false;
        browser.url(url.resolve(siteUrl,'/register/verify/simpleToken'))
        .then(function() {
          db.User.findOne({where: {email: 'newemail@gmail.com'}})
          .then(function(user) {
            expect(user.emailVerified).to.be.true;
            done();
          });
        });
      });
    });
  });

  it('should flash error messages', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser
    .setValue('input[name="email"]', 'not an email')
    .setValue('input[name="oldPassword"]', 'moderator')
    .setValue('input[name="password"]', 'short')
    .setValue('input[name="passwordConfirmation"]', 'short')
    .click('#registration-form button[type="submit"]')
    .pause(1000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/too short/);
      expect(text).to.match(/not properly formatted/);
      done();
    });
  });


  it('should update user', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser
    .setValue('input[name="givenName"]', 'phil')
    .setValue('input[name="middleName"]', 'minh')
    .setValue('input[name="familyName"]', 'pham')
    .click('#wmd-editor')
    .keys('my bio')
    .setValue('input[name="email"]', 'newemail@gmail.com')
    .setValue('input[name="photoUrl"]', 'picture.jpg')
    .setValue('input[name="oldPassword"]', 'moderator')
    .setValue('input[name="password"]', 'newpassword')
    .setValue('input[name="passwordConfirmation"]', 'newpassword')
    .click('#registration-form button[type="submit"]')
    .pause(1000)
    .then(function() {
      db.User.findOne({where: {email: 'newemail@gmail.com'}})
      .then(function(user) {
        expect(user.givenName).to.equal('phil');
        expect(user.middleName).to.equal('minh');
        expect(user.familyName).to.equal('pham');
        expect(user.biographyHtml).to.equal('<p>my bio</p>');        
        expect(user.emailVerified).to.be.false;
        browser.url(url.resolve(siteUrl,'/register/verify/simpleToken'))
        .then(function() {
          db.User.authenticate('newemail@gmail.com', 'newpassword')
          .then(function(user) {
            expect(user.emailVerified).to.be.true;
            done();
          });
        });
      });
    });
  });

  it('should refresh page and flash messages on display name to change', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser
    .setValue('input[name="displayName"]', 'admin')
    .pause(100)
    .getText('fieldset.displayName span.field-sublabel')
    .then(function(text) {
      expect(text).to.match(/already taken/);
    })
    .setValue('input[name="displayName"]', 'moderator')
    .pause(100)
    .getText('fieldset.displayName span.field-sublabel')
    .then(function(text) {
      expect(text).to.match(/required/);
    })
    .setValue('input[name="displayName"]', ' ne^w_dis$la y_nam*e')
    .pause(100)
    .getText('fieldset.displayName span.field-sublabel')
    .then(function(text) {
      expect(text).to.match(/available/);
    })
    .click('#registration-form button[type="submit"]')
    .pause(1000)
    .url()
    .then(function(res) {
      expect(url.parse(res.value).path).to.equal('/user/edit/' + encodeURIComponent('ne^w_dis$la y_nam*e'));
      return browser.getText('#topbar');
    })
    .then(function(text) {
      expect(text).to.match(/Hello, ne\^w_dis\$la y_nam\*e/);
      return browser.getText('#flash');
    })
    .then(function(text) {
      expect(text).to.match(/display name/i);
      return true;
    })
    .then(function() {
      db.User.findOne({where: {email: 'moderator@gmail.com'}})
      .then(function(user) {
        expect(user.displayName).to.equal('ne^w_dis$la y_nam*e');
        done();
      });
    });
  });
});