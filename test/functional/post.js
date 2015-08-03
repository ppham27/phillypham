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
      .timeoutsImplicitWait(1000)
      .url(siteUrl)
      .click('a.topbar-link[href="/login"]')
      .setValue('input[name="email"]', 'admin@admin.com')
      .setValue('input[name="password"]', 'password')
      .click('button[type="submit"]')   
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

  it('should create a post', function(done) {
    this.browser
    .click('a.topbar-link[href="/post"]')
    .setValue('input[name="title"]', 'New Post')
    .setValue('input[name="tags"]', 'matthew, mark, math')
    .click('#wmd-editor')
    .keys('Post body $2+2$')    
    .click('.submit-button.publish')
    .pause(2000)
    .url()
    .then(function(res) {
      return expect(url.parse(res.value).path).to.equal('/' + encodeURIComponent('New Post'));      
    })
    .getText('h1')
    .then(function(text) {
      expect(text).to.include.something.that.equals('New Post');
      done();
    });
  });

  it('should save a post', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .click('a.topbar-link[href="/post"]')
    .setValue('input[name="title"]', 'New Post')
    .setValue('input[name="tags"]', 'matthew, mark, math')
    .click('#wmd-editor')
    .keys('Post body $2+2$')    
    .click('.submit-button.save')
    .pause(2000)
    .url()
    .then(function(res) {
      db.Post.findOne({where: {title: 'New Post'}})
      .then(function(post) {
        expect(url.parse(res.value).path).to.equal('/post/' + post.id);
        browser.click('a[href="/"]')
        .getText('h1')
        .then(function(text) {
          return expect(text).to.not.include.something.that.equals('New Post'); 
        })
        .click('a.topbar-link[href="/post/list"]')
        .isExisting('a[href="/' + encodeURIComponent('New Post') + '"]')
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          done();
        });
      });      
    })
  });

  it('should flash an error message', function(done) {
    this.browser
    .click('a.topbar-link[href="/post"]')
    .setValue('input[name="title"]', 'First Post')
    .setValue('input[name="tags"]', 'matthew, mark, math')
    .click('#wmd-editor')
    .keys('Post body $2+2$')    
    .click('.submit-button.publish')
    .pause(2000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/title must be unique/);
      done();
    });
  });

  it('should save a post', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .click('a.topbar-link[href="/post"]')
    .setValue('input[name="title"]', 'New Post')
    .setValue('input[name="tags"]', 'matthew, mark, math')
    .click('#wmd-editor')
    .keys('Post body $2+2$')    
    .click('.submit-button.save')
    .pause(2000)
    .url()
    .then(function(res) {
      db.Post.findOne({where: {title: 'New Post'}})
      .then(function(post) {
        expect(url.parse(res.value).path).to.equal('/post/' + post.id);
        browser.click('a[href="/"]')
        .pause(1000)
        .getText('h1')
        .then(function(text) {
          return expect(text).to.not.include.something.that.equals('New Post'); 
        })
        .click('a.topbar-link[href="/post/list"]')
        .pause(1000)
        .isExisting('a[href="/' + encodeURIComponent('New Post') + '"]')
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          done();
        });
      });      
    })
  });

  it('should update a published post', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .click('a[href="/post/1"]')
    .setValue('input[name="title"]', 'Updated Post')
    .setValue('input[name="tags"]', 'matthew, mark, math')
    .click('#wmd-editor')
    .keys('added to Post body')    
    .click('.submit-button.save')
    .pause(2000)
    .url()
    .then(function(res) {
      return expect(url.parse(res.value).path).to.equal('/' + encodeURIComponent('Updated Post'));      
    })
    .getText('.post .wmd-preview p')
    .then(function(text) {
      return expect(text).to.include.something.that.matches(/added to Post body/);
    })
    .click('a[href="/"]')
    .pause(1000)
    .getText('h1')
    .then(function(text) {
      expect(text).to.include.something.that.equals('Updated Post');
      done();
    });
  });

  it('should flash an error message on bad update', function(done) {
    this.browser
    .click('a[href="/post/1"]')
    .setValue('input[name="title"]', '')
    .click('.submit-button.save')
    .pause(2000)
    .getText('#flash')
    .then(function(text) {
      expect(text).to.match(/title cannot be empty/);
      done();
    });
  });
  
  it('should publish an unpublished post', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser
    .pause(1000)
    .getText('h1')
    .then(function(text) {
      return expect(text).to.not.include.something.that.equals('Unpublished Title');
    })
    .click('a.topbar-link[href="/post/list"]')
    .then(function() {
      db.Post.findOne({where: {title: 'Unpublished Title'}})
      .then(function(post) {
        browser.click('a[href="/post/' + post.id + '"]')
        .click('.submit-button.publish')
        .pause(2000)
        .click('a[href="/"]')
        .pause(1000)
        .getText('h1')
        .then(function(text) {
          expect(text).to.include.something.that.equals('Unpublished Title');
          done();
        });
      });
    });
  });  
});