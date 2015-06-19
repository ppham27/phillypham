var expect = require('chai').expect;
var Promise = require('bluebird');
var http = require('http');
var url = require('url');

var config = require('config');

describe('middleware', function() {  
  before(function(done) {
    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app');
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    this.browser = require('../support/browser')();
    var browser = this.browser;    
    this.app.once('ready', function() {
      browser.init()
      .then(function() {
        done();
      });
    });
  });
  after(function(done) {
    this.browser.end()
    .then(function() {
      done();
    });
  });
  
  describe('user login', function() {    
    beforeEach(function(done) {
      var siteUrl = this.siteUrl;
      var browser = this.browser;
      this.db = require('../../models');
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {
        return db.loadFixtures(config.fixtures);
      })
      .then(function() {
        browser.url(siteUrl)
        .then(function() {
          done();
        });
      });
    });        

    afterEach(function(done) {
      this.browser.url(url.resolve(this.siteUrl, 'logout'), function(err) {
        done(err);
      });
    });
    
    // it('should log the admin in and display his privileges', function(done) {
    //   var browser = this.browser;
    //   var siteUrl = this.siteUrl;
    //   browser.url(url.resolve(siteUrl, 'login'))
    //   .setValue('input[name="email"]', 'admin@admin.com')
    //   .setValue('input[name="password"]', 'password')
    //   .click('input[value="Login"]')
    //   .url()
    //   .then(function(res) {
    //     expect(url.parse(res.value).path).to.equal('/');
    //     return browser.getText('#topbar');
    //   })
    //   .then(function(text) {
    //     expect(text).to.match(/Hello, admin/);
    //     expect(text).to.match(/Application Settings/);
    //     return done();
    //   })
    // });

    // it('should log the power user in and display his privileges', function(done) {
    //   var browser = this.browser;
    //   var siteUrl = this.siteUrl;
    //   browser.url(url.resolve(siteUrl, 'login'))
    //   .setValue('input[name="email"]', 'power@gmail.com')
    //   .setValue('input[name="password"]', 'powerpower')
    //   .click('input[value="Login"]')
    //   .url()
    //   .then(function(res) {
    //     expect(url.parse(res.value).path).to.equal('/');
    //     return browser.getText('#topbar');
    //   })
    //   .then(function(text) {
    //     expect(text).to.match(/Hello, power/);
    //     expect(text).to.match(/Post/);
    //     expect(text).to.not.match(/Application Settings/);
    //     return done();
    //   })
    // });

    // it('should reject bad credentials and flash error message', function(done) {
    //   var browser = this.browser;
    //   var siteUrl = this.siteUrl;
    //   browser.url(url.resolve(siteUrl, 'login'))
    //   .setValue('input[name="email"]', 'standard@gmail.com')
    //   .setValue('input[name="password"]', 'wrongpassword')
    //   .click('input[value="Login"]')
    //   .url()
    //   .then(function(res) {
    //     expect(url.parse(res.value).path).to.equal('/login');
    //     return browser.getText('#flash');
    //   })
    //   .then(function(text) {
    //     expect(text).to.match(/invalid password/);
    //     return done();
    //   })
    // });
    
    // it('should redirect a user to his or her location before login', function(done) {
    //   var browser = this.browser;
    //   var siteUrl = this.siteUrl;
    //   browser.url(url.resolve(siteUrl, 'post'))
    //   .click('a.topbar-link[href="/login"]')
    //   .setValue('input[name="email"]', 'moderator@gmail.com')
    //   .setValue('input[name="password"]', 'moderator')
    //   .click('input[value="Login"]')
    //   .url()
    //   .then(function(res) {
    //     expect(url.parse(res.value).path).to.equal('/post');
    //     done();
    //   });
    // });

    // it('should even on wrong email/password redirect you to your pre-login page', function(done) {
    //   var browser = this.browser;
    //   var siteUrl = this.siteUrl;
    //   browser.url(url.resolve(siteUrl, 'post'))      
    //   .click('a.topbar-link[href="/login"]')
    //   .setValue('input[name="email"]', 'moderator@gmail.com')
    //   .setValue('input[name="password"]', 'wrongpassword')
    //   .click('input[value="Login"]')
    //   .setValue('input[name="email"]', 'wrongusername@gmail.com')
    //   .setValue('input[name="password"]', 'moderator')
    //   .click('input[value="Login"]')
    //   .setValue('input[name="email"]', 'moderator@gmail.com')
    //   .setValue('input[name="password"]', 'moderator')
    //   .click('input[value="Login"]')
    //   .url()
    //   .then(function(res) {
    //     expect(url.parse(res.value).path).to.equal('/post');
    //     return done();
    //   });
    // });

    it('should login with facebook', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      var db = this.db;
      browser.click('a.topbar-link[href="/login"]')
      .click('#facebook-button')
      .setValue('#email', 'rourzea_qinstein_1434678793@tfbnw.net')
      .setValue('#pass', 'password123')
      .click('input[name="login"]')
      .then(function() {
        db.User.findOne({where: {email: 'rourzea_qinstein_1434678793@tfbnw.net'}})
        .then(function(user) {
          expect(user).to.not.be.null;
          done();
        });
      });
    });
  });
});