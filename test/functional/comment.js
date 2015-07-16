/*global isVisible */
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var http = require('http');
var url = require('url');
var config = require('config');


describe('comments', function() {
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
    var db = this.db;
    db.sequelize.sync({force: true})
    .then(function() {        
      return db.loadFixtures(config.fixtures);        
    })
    .then(function() {
      browser.init().url(siteUrl)
      .click('a.topbar-link[href="/login"]')
      .setValue('input[name="email"]', 'admin@admin.com')
      .setValue('input[name="password"]', 'password')
      .click('button[type="submit"]')   
      .click('a[href="/' + encodeURIComponent('First Post') + '"]')
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
    this.server.close(function(err) {
      done(err);
    });
  });

  it('should create a new comment', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .click('#wmd-editor-comment')
    .keys('newly created comment')
    .click('button.submit-button.comment')
    .pause(2000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      db.Comment.findOne({where: {body: 'newly created comment'}})
      .then(function(comment) {
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
        browser.getText('.comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly created comment/);
          done();
        });
      });
    });
  });

  it('should save a draft of a comment', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .click('#wmd-editor-comment')
    .keys('newly created comment')
    .click('button.submit-button.comment')
    .pause(2000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      db.Comment.findOne({where: {body: 'newly created comment'}})
      .then(function(comment) {
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
        browser.getText('.comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly created comment/);
          done();
        });
      });
    });
  });
});