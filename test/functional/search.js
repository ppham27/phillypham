var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var http = require('http');
var url = require('url');
var config = require('config');


describe('posts', function() {
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
      browser.init()
      .timeoutsImplicitWait(2000)
      .url(url.resolve(siteUrl, 'search'))
      .pause(1000)
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

  it('should return to search page if empty field', function(done) {
    var browser = this.browser;
    browser.click('#blog-search-form button.submit-button')
    .pause(1000)
    .then(function() {
      return browser.isExisting('#blog-search-form');
    })
    .then(function(exists) {
      expect(exists).to.be.true;
      done();
    });
  });

  it('should return to search page if field of whitespace', function(done) {
    var browser = this.browser;
    browser
    .setValue('input[name="tsquery"]', '    ')
    .click('#blog-search-form button.submit-button')
    .pause(1000)
    .then(function() {
      return browser.isExisting('#blog-search-form');
    })
    .then(function(exists) {
      expect(exists).to.be.true;
      done();
    });
  });

  it('should return to search results ranked by relevance and id', function(done) {
    var browser = this.browser;
    browser
    .setValue('input[name="tsquery"]', 'integer')
    .click('#blog-search-form button.submit-button')
    .pause(1000)
    .then(function() {
      return browser.getText('ol.search-results li a');
    })
    .then(function(text) {
      expect(text.length).to.equal(3);
      expect(text[0]).to.equal('Third Post');
      return browser.getText('ol.search-results li .highlight')
    })
    .then(function(text) {
      expect(text[0]).to.match(/integer/i);
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('should not return unpublished posts', function(done) {
    var browser = this.browser;
    browser
    .setValue('input[name="tsquery"]', 'unpublished')
    .click('#blog-search-form button.submit-button')
    .pause(1000)
    .then(function() {      
      return browser.getText('#content p');
    })
    .then(function(text) {
      expect(text).to.include.something.that.matches(/no matching posts/);
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('should handle errors gracefully', function(done) {
    var browser = this.browser;
    browser
    .setValue('input[name="tsquery"]', '(invalid')
    .click('#blog-search-form button.submit-button')
    .pause(1000)
    .then(function() {      
      return browser.getText('#flash li');
    })
    .then(function(text) {
      expect(text).to.match(/syntax error/);
      done();
    }).catch(function(err) {
      done(err);
    });
  });
});