var expect = require('chai').expect;
var http = require('http');
var url = require('url');
var config = require('config');


describe('application settings', function() {
  before(function(done) {
    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app')
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
    var siteUrl = this.siteUrl;
    this.browser = require('../support/browser')(); 
    var browser = this.browser;
    this.db.ApplicationSettings.set(config.applicationSettings)
    .save()      
    .then(function() {
      browser.init()
      .timeoutsImplicitWait(2000)
      .url(siteUrl)
      .click('a.topbar-link[href="/login"]')
      .pause(1000)
      .setValue('input[name="email"]', 'admin@admin.com')
      .setValue('input[name="password"]', 'password')
      .click('button[type="submit"]')
      .pause(1000)
      .click('a.topbar-link[href="/settings"]')
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
    var self = this;
    this.db.ApplicationSettings.set(config.applicationSettings)
    .save()      
    .then(function() {
      self.server.close(function(err) {
        done(err);
      });
    });
  });

  it('should update application settings', function(done) {
    var browser = this.browser;
    var db = this.db;
    expect(db.ApplicationSettings['contact:email']).to.equal('');
    browser
    .setValue('input[name="contact:email"]', 'phil@pp.com')
    .click('#wmd-editor-sidebar')
    .keys('my bio')
    .click('button[type="submit"]')
    .pause(1000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/settings have been updated/);
      expect(db.ApplicationSettings['contact:email']).to.equal('phil@pp.com');
      expect(db.ApplicationSettings['sidebar:info']).to.match(/my bio/);
      done();
    });
  });

  it('should flash error message if field is empty', function(done) {
    var browser = this.browser;
    var db = this.db;
    var oldPhotoUrl = db.ApplicationSettings['sidebar:photoUrl'];
    expect(oldPhotoUrl.length).to.be.greaterThan(0);
    browser
    .setValue('input[name="sidebar:photoUrl"]', '')
    .click('button[type="submit"]')
    .pause(1000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/must be a nonempty string/);
      expect(db.ApplicationSettings['sidebar:photoUrl']).to.equal(oldPhotoUrl);
      done();
    });
  });
});