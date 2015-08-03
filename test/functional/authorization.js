var expect = require('chai').expect;
var sinon = require('sinon');
var http = require('http');
var url = require('url');
var config = require('config');

describe('authorization', function() {
  before(function(done) {    
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
    this.server.close(function(err) {
      done(err);
    });
  });
  
  it('should let the admin go everywhere', function(done) {
    var browser = this.browser;
    browser.click('a.topbar-link[href="/login"]')
    .setValue('input[name="email"]', 'admin@admin.com')
    .setValue('input[name="password"]', 'password')
    .click('button[type="submit"]')
    .pause(100)
    .url(url.resolve(this.siteUrl, '/user/edit/admin'))
    .getValue('input[name="email"]')
    .then(function(value) {
      expect(value).to.equal('admin@admin.com');    
    })
    .pause(100)
    .url(url.resolve(this.siteUrl, '/user/edit/power'))
    .getValue('input[name="email"]')
    .then(function(value) {
      expect(value).to.equal('power@gmail.com');
      done();
    })
  });

  it('should restrict other user', function(done) {
    var browser = this.browser;
    browser.click('a.topbar-link[href="/login"]')
    .setValue('input[name="email"]', 'power@gmail.com')
    .setValue('input[name="password"]', 'powerpower')
    .click('button[type="submit"]')
    .pause(1000)
    .url(url.resolve(this.siteUrl, '/user/edit/admin'))
    .getText('.error-message')
    .then(function(text) {
      expect(text).to.match(/not authorized/i);    
    })
    .url(url.resolve(this.siteUrl, '/user/edit/power'))
    .getValue('input[name="email"]')
    .then(function(value) {
      expect(value).to.equal('power@gmail.com');
      done();
    })
  });

  it('should not allow anyone but admin to modify application settings', function(done) {
    var self = this;
    var stub = sinon.stub(self.db.ApplicationSettings, 'save');
    var browser = this.browser;
    browser.click('a.topbar-link[href="/login"]')
    .setValue('input[name="email"]', 'moderator@gmail.com')
    .setValue('input[name="password"]', 'moderator')
    .click('button[type="submit"]')    
    .url(url.resolve(this.siteUrl, '/settings'))
    .click('button[type="submit"]')    
    .pause(1000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/Not authorized/);
      expect(stub.callCount).to.equal(0);
      self.db.ApplicationSettings.save.restore();
      done();
    });
  });
});

