var expect = require('chai').expect;
var Browser = require('zombie');
var Promise = require('bluebird');
var http = require('http');

var config = require('config');

describe('middleware', function() {  
  before(function(done) {
    this.app = require('../../app');
    this.app.once('ready', function() {
      done();
    });
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    this.browser = new Browser({site: 'http://localhost:8888', runScripts: false});
  });
  describe('user login', function() {    
    beforeEach(function(done) {
      var browser = this.browser;
      this.db = require('../../models');
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {
        return db.loadFixtures(config.fixtures);
      })
      .then(function() {
        browser.visit('/login', function(err) {
          done(err);
        });
      });      
    });        

    afterEach(function(done) {
      this.browser.visit('/logout', function(err) {
        done(err);
      });
    });
    
    it ('should log the admin in and display his privileges', function(done) {
      var browser = this.browser;
      browser.fill('email', 'admin@admin.com')
      .fill('password', 'password')
      .pressButton('Login', function(err) {
        expect(browser.location.pathname).equal('/');
        expect(browser.text('#topbar')).to.match(/Hello, admin/);
        expect(browser.text('#topbar')).to.match(/Application Settings/);
        done(err);
      });
    });

    it ('should log the power user in and display his privileges', function(done) {
      var browser = this.browser;
      browser.fill('email', 'power@gmail.com')
      .fill('password', 'powerpower')
      .pressButton('Login', function(err) {
        expect(browser.location.pathname).equal('/');
        expect(browser.text('#topbar')).to.match(/Hello, power/);
        expect(browser.text('#topbar')).to.match(/Post/);
        expect(browser.text('#topbar')).to.not.match(/Application Settings/);
        done(err);
      });
    });

    it ('should reject bad credentials and flash error message', function(done) {
      var browser = this.browser;
      browser.fill('email', 'standard@gmail.com')
      .fill('password', 'wrongpassword')
      .pressButton('Login', function(err) {
        expect(browser.location.pathname).equal('/login');
        expect(browser.text('#flash')).to.match(/invalid password/);
        done(err);
      });
    });
  });
});