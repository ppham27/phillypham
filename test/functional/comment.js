/*global isVisible */
var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var sinon = require('sinon');
var http = require('http');
var url = require('url');
var config = require('config');

var random = require('../../lib/random');
var transporter = require('../../lib/smtpTransporter');
var sweetCaptcha = require('../../lib/sweetCaptcha');

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
      browser.init()
      .timeoutsImplicitWait(2000)
      .url(siteUrl)      
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

  it('should only have two unpublished post and 5 edit posts', function(done) {
    var browser = this.browser;
    browser
    .getText('.unposted-comments button.edit')
    .then(function(text) {
      expect(text.length).to.equal(2);
      return browser.getText('.posted-comments button.edit');
    })
    .then(function(text) {    
      expect(text.length).to.equal(5);
      done();
    });
  });

  it('should flash error message when comment doesn\'t exist', function(done) {
    var browser = this.browser;
    browser
    .url(url.resolve(this.siteUrl, '/' + encodeURIComponent('First Post') + '#edit-comment-100'))
    .refresh()
    .pause(1000)
    .getText('.comments #flash')
    .then(function(text) {
      expect(text).to.match(/does not exist/);
      done();
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
    .click('button.submit-button.save-draft')
    .pause(2000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      db.Comment.findOne({where: {body: 'newly created comment'}})
      .then(function(comment) {
        expect(comment.published).to.be.false;
        expect(parsedUrl.hash).to.equal('#edit-comment-' + comment.id);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
        browser.isExisting('.unposted-comments button.edit[data-comment-id="' + comment.id + '"]')
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          done();
        });
      });
    });
  });
  
  it('should display a comment if hash is specified', function(done) {
    var browser = this.browser;
    browser
    .isVisible('.posted-comments .comment.comment-4')
    .then(function(isVisible) {
      expect(isVisible).to.be.false;
    })
    .url(this.siteUrl + '/' + encodeURIComponent('First Post') + '#comment-4')
    .refresh()
    .pause(3000)
    .isVisible('.posted-comments .comment.comment-4')
    .then(function(isVisible) {
      expect(isVisible).to.be.true;
      done();
    });
  });
  

  it('should display and fill in input if edit hash', function(done) {
    var browser = this.browser;
    browser
    .isVisible('.posted-comments .comment.comment-4')
    .then(function(isVisible) {
      expect(isVisible).to.be.false;
    })
    .url(this.siteUrl + '/' + encodeURIComponent('First Post') + '#edit-comment-4')
    .refresh()
    .pause(3000)
    .isVisible('.posted-comments .comment.comment-4')
    .then(function(isVisible) {
      expect(isVisible).to.be.true;
      return browser.getAttribute('#wmd-input-comment', 'value');
    })
    .then(function(value) {
      expect(value).to.equal('super nested comment');
      done();
    });
  });
  
  it('should delete a comment', function(done) {
    var browser = this.browser;
    browser
    .isExisting('.posted-comments .comment.comment-2')
    .then(function(isExisting) {
      expect(isExisting).to.be.true;
    })
    .click('.posted-comments button.destroy[data-comment-id="2"]')
    .pause(1000)
    .alertAccept()
    .pause(3000)
    .isExisting('.posted-comments .comment.comment-2')
    .then(function(isExisting) {
      expect(isExisting).to.be.false;
      done();
    });
  });

  it('should reply to a comment', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-2 button.reply')
    .click('#wmd-editor-comment')
    .keys('newly created nested comment')
    .click('button.submit-button.comment')
    .pause(2000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
      db.Comment.findOne({where: {body: 'newly created nested comment'}})
      .then(function(comment) {
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.commentId).to.equal(2);
        browser.isExisting('.comment.comment-2 .children .comment.comment-' + comment.id)
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          done();
        });
      });
    });    
  });

  describe('edit', function() {
    describe('unpublished', function() {
      beforeEach(function(done) {
        var browser = this.browser;
        browser.pause(1000)
        .click('.unposted-comments button.edit[data-comment-id="7"]')
        .pause(2000)
        .then(function() {
          done();
        });
      });

      it('should edit and save unpublished comment and not redirect', function(done) {
        var browser = this.browser;
        var db = this.db;
        browser.click('#wmd-editor-comment')
        .keys('newly added comment updates')
        .click('button.submit-button.save')
        .pause(1000)
        .getText('.comments #flash')
        .then(function(text) {
          expect(text).to.match(/Comment was updated!/);
        })
        .url()
        .then(function(res) {
          var parsedUrl = url.parse(res.value);
          expect(parsedUrl.hash).to.equal('#edit-comment-7');
        })
        .getText('.unposted-comments button.edit')
        .then(function(text) {
          expect(text.length).to.equal(2);
          db.Comment.findById(7)
          .then(function(comment) {
            expect(comment.body).to.match(/newly added comment updates/)
            done();
          });
        });
      });

      it('should edit and publish unpublished comment and redirect', function(done) {
        var browser = this.browser;
        var db = this.db;
        browser.click('#wmd-editor-comment')
        .keys('newly added comment updates')
        .click('button.submit-button.publish')
        .pause(2000)
        .url()
        .then(function(res) {
          var parsedUrl = url.parse(res.value);
          expect(parsedUrl.hash).to.equal('#comment-7');
          expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
        })
        .getText('.posted-comments .comment.comment-3 .children .comment.comment-7 .wmd-preview')
        .then(function(text) {                 
          expect(text).to.match(/newly added comment updates/);                
          done();
        });
      });
    });

    describe('published', function() {
      beforeEach(function(done) {
        var browser = this.browser;
        browser.pause(1000)
        .click('.posted-comments button.edit[data-comment-id="2"]')
        .pause(2000)
        .then(function() {
          done();
        });
      });

      it('should update a comment', function(done) { 
        var browser = this.browser;
        browser
        .click('#wmd-editor-comment')
        .keys('newly updated comment')
        .click('.comment-editor button.submit-button.save')
        .pause(3000)
        .url()
        .then(function(res) {
          var parsedUrl = url.parse(res.value);
          expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
          expect(parsedUrl.hash).to.equal('#comment-2');
          return browser.getText('.posted-comments .comment.comment-2 .wmd-preview');
        })
        .then(function(text) {
          expect(text).match(/newly updated comment/);
          done();
        })
        .catch(function(err) {
          done(err);
        });
      });

      it('should destroy a comment', function(done) { 
        var browser = this.browser;
        browser
        .click('.comment-editor button.submit-button.destroy')
        .pause(1000)
        .alertAccept()
        .pause(3000)
        .url()
        .then(function(res) {
          var parsedUrl = url.parse(res.value);
          expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
          return browser.isExisting('.posted-comments .comment.comment-2');
        })
        .then(function(isExisting) {
          expect(isExisting).be.false;
          return browser.getText('#flash');
        })
        .then(function(text) {
          expect(text).to.match(/Comment was successfully deleted!/);        
        })
        .click('.comment-editor button.submit-button.comment')
        .pause(1000)
        .isExisting('.comments #flash')        
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          return browser.getText('#flash')
        })
        .then(function(text) {
          expect(text).to.match(/body cannot be empty/);
          done();
        });
      });

      it('should reset', function(done) { 
        var browser = this.browser;
        browser
        .getText('.comments h2')
        .then(function(text) {
          expect(text).to.include.something.that.matches(/Edit Comment/);
          expect(text).to.not.include.something.that.matches(/New Comment/);
          return browser.click('.comment-editor button.submit-button.reset')
        })
        .pause(2000)
        .getText('.comments h2')
        .then(function(text) {
          expect(text).to.not.include.something.that.matches(/Edit Comment/);
          expect(text).to.include.something.that.matches(/New Comment/);
          done();
        });
      });
    });
  });
});

describe('comment view', function() {
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
      .setValue('input[name="email"]', 'power@gmail.com')
      .setValue('input[name="password"]', 'powerpower')
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

  it('should only have one unpublished post and two edit posts', function(done) {
    var browser = this.browser;
    browser
    .getText('.unposted-comments button.edit')
    .then(function(text) {
      expect(text).to.be.a('string');
      return browser.getText('.posted-comments button.edit');
    })
    .then(function(text) {
      expect(text.length).to.equal(2);
      done();
    });
  });

  it('should flash error message when comment doesn\'t exist', function(done) {
    var browser = this.browser;
    browser
    .url(url.resolve(this.siteUrl, '/' + encodeURIComponent('First Post') + '#edit-comment-1'))
    .refresh()
    .pause(1000)
    .getText('.comments #flash')
    .then(function(text) {
      expect(text).to.match(/not authorized/i);
      done();
    });
  });
});

describe('comment as an unverified user', function() {
  before(function(done) {    
    sinon.stub(random, 'token').returns('simpleToken');
    sinon.stub(transporter, 'sendMail', function(mailOptions, callback) {
      callback(null, true);      
    });

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
      .setValue('input[name="email"]', 'phil@phillypham.com')
      .setValue('input[name="password"]', 'unverified')
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
    random.token.restore();
    transporter.sendMail.restore();
    this.server.close(function(err) {
      done(err);
    });
  });
  
  it('should flash error message on empty comment', function(done) {
    var browser = this.browser;
    browser.pause(1000)
    .click('button.submit-button.comment')
    .pause(1000)
    .getText('.comments #flash')
    .then(function(text) {
      expect(text).to.match(/body cannot be empty/);
      done();
    });
  });

  it('should make a published reply', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .click('button.verify-email')
    .pause(2000)
    .url(url.resolve(this.siteUrl, '/register/verify/simpleToken'))
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.User.displayName).to.equal('unverified');
        browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly unverified comment/);
          done();
        });
      });
    });
  });

  it('should make an unpublished reply', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.save-draft')
    .pause(1000)
    .click('button.verify-email')
    .pause(2000)
    .url(url.resolve(this.siteUrl, '/register/verify/simpleToken'))
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#edit-comment-' + comment.id);
        expect(comment.User.displayName).to.equal('unverified');
        browser.isExisting('.unposted-comments button.edit[data-comment-id="' + comment.id + '"]')
        .then(function(isExisting) {
          expect(isExisting).to.be.true;
          done();
        });
      });
    });
  });  
});

describe('comment without being logged in at all', function() {
  before(function(done) {    
    sinon.stub(random, 'token').returns('simpleToken');
    sinon.stub(transporter, 'sendMail', function(mailOptions, callback) {
      callback(null, true);      
    });
    sinon.stub(sweetCaptcha, 'api', function(method, sweetCaptchaKeys, callback) {        
      if (method === 'check') return callback(null, 'true');
      if (method === 'get_html') return sweetCaptchaKeys(null, '');
    });      
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
    random.token.restore();
    transporter.sendMail.restore();
    sweetCaptcha.api.restore();
    this.server.close(function(err) {
      done(err);
    });
  });
  
  it('should flash error message on empty comment', function(done) {
    var browser = this.browser;
    browser.click('button.submit-button.comment')
    .pause(1000)
    .getText('.comments #flash')
    .then(function(text) {
      expect(text).to.match(/body cannot be empty/);
      done();
    });
  });

  it('should comment after login', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      expect(parsedUrl.pathname).to.equal('/login');
    })
    .setValue('input[name="email"]', 'standard@gmail.com')
    .setValue('input[name="password"]', 'standard')
    .click('button[type="submit"]')
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.User.displayName).to.equal('standard');
        browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly unverified comment/);
          done();
        });
      });
    });
  });

  it('should flash link if user navigates elsewhere', function(done) {
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      expect(parsedUrl.pathname).to.equal('/login');
    })
    .click('a.header-link[href="/projects"]')
    .click('a.topbar-link[href="/login"]')
    .setValue('input[name="email"]', 'standard@gmail.com')
    .setValue('input[name="password"]', 'standard')
    .click('button[type="submit"]')
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/projects');
        expect(comment.User.displayName).to.equal('standard');
        browser.getAttribute('#flash a', 'href')
        .then(function(href) {
          var parsedUrl = url.parse(href);
          expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
          expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
          done();
        });
      });
    });
  });

  it('should not post comment if user is unverified but remind them to verify their email', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .url()
    .then(function(res) {
      var parsedUrl = url.parse(res.value);
      expect(parsedUrl.pathname).to.equal('/login');
    })
    .setValue('input[name="email"]', 'phil@phillypham.com')
    .setValue('input[name="password"]', 'unverified')
    .click('button[type="submit"]')
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'));
        expect(comment).to.be.null;
        browser.getAttribute('#flash a', 'href')
        .then(function(href) {
          var parsedUrl = url.parse(href);
          expect(parsedUrl.pathname).to.equal('/user/edit/unverified');          
        })
        .click('#flash a')
        .click('button.verify-email')
        .pause(2000)
        .url(url.resolve(siteUrl, '/register/verify/simpleToken'))
        .pause(1000)
        .url() 
        .then(function(res) {
          db.Comment.findOne({where: {body: 'newly unverified comment'},
                              include: [db.User]})
          .then(function(comment) {
            var parsedUrl = url.parse(res.value);
            expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
            expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
            expect(comment.User.displayName).to.equal('unverified');
            browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
            .then(function(text) {
              expect(text).to.match(/newly unverified comment/);
              done();
            });
          });
        });     
      });
    });    
  });

  it('should comment after registering and verifying', function(done) {
    var browser = this.browser;
    var db = this.db;
    var siteUrl = this.siteUrl;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')    
    .pause(1000)
    .click('#mainbar a[href="/register"]')
    .setValue('input[name="displayName"]', 'im a new user')
    .setValue('input[name="email"]', 'newuser@gmail.com')
    .setValue('input[name="password"]', 'newpassword')
    .setValue('input[name="passwordConfirmation"]', 'newpassword')
    .click('button[type="submit"]')
    .pause(2000)
    .url(url.resolve(siteUrl, '/register/verify/simpleToken'))
    .pause(1000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.User.displayName).to.equal('im a new user');
        browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly unverified comment/);
          done();
        });
      });
    });     
  });

  it('should comment after facebook login', function(done) {
    var testUser = config.appKeys.facebook.testUsers[0];
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .click('#facebook-button')
    .setValue('#email', testUser.email)
    .setValue('#pass', testUser.password)
    .click('button[name="login"]')
    .pause(2000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.User.displayName).to.equal(testUser.displayName);
        browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly unverified comment/);
          done();
        });
      });
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should comment after google login', function(done) {
    var testUser = config.appKeys.google.testUsers[0];    
    var browser = this.browser;
    var db = this.db;
    browser.click('.posted-comments .comment.comment-1 .reply-expander')
    .pause(1000)
    .click('.posted-comments .comment.comment-5 button.reply')
    .pause(1000)
    .click('#wmd-editor-comment')    
    .keys('newly unverified comment')
    .click('button.submit-button.comment')
    .pause(1000)
    .click('#google-button')
    .setValue('#Email', testUser.email)
    .click('#next')
    .pause(3000)
    .setValue('#Passwd', testUser.password)
    .click('#signIn')
    .pause(5000)            
    .click('#submit_approve_access') 
    .pause(3000)
    .url() 
    .then(function(res) {
      db.Comment.findOne({where: {body: 'newly unverified comment'},
                          include: [db.User]})
      .then(function(comment) {
        var parsedUrl = url.parse(res.value);
        expect(parsedUrl.pathname).to.equal('/' + encodeURIComponent('First Post'))
        expect(parsedUrl.hash).to.equal('#comment-' + comment.id);
        expect(comment.User.displayName).to.equal(testUser.displayName);
        browser.getText('.comment.comment-5 .comment.comment-' + comment.id + ' .wmd-preview')
        .then(function(text) {
          expect(text).to.match(/newly unverified comment/);
          done();
        });
      });
    })
    .catch(function(err) {
      done(err);
    });
  });
});