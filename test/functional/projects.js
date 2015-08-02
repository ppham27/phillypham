var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var http = require('http');
var url = require('url');
var config = require('config');


describe('projects', function() {
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

  describe('create', function() {
    beforeEach(function(done) {
      this.browser
      .click('a.topbar-link[href="/projects/create"]')
      .then(function() {
        done();
      });
    });
    
    it('should publish a new project', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .setValue('input[name="title"]', 'New Project')
      .setValue('input[name="url"]', 'http://google.com')
      .setValue('input[name="thumbnail"]', 'thumbnail.png')
      .setValue('input[name="photoUrl"]', 'photo.png')
      .click('#wmd-editor-summary')
      .keys('This is a project summary')
      .click('#wmd-editor-description')
      .keys('This is a project description')
      .click("button.submit-button.publish")
      .pause(1000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects');
        return browser.getText('.project-title');        
      })
      .then(function(text) {
        // it should be the first listed
        expect(text[0]).to.equal('New Project');
        db.Project.findOne({where: {title: 'New Project'}})
        .then(function(project) {
          expect(project.url).to.equal('http://google.com');
          expect(project.thumbnail).to.equal('thumbnail.png');
          expect(project.photoUrl).to.equal('photo.png');
          expect(project.summary).to.equal('This is a project summary');
          expect(project.description).to.equal('This is a project description');
          done();          
        });
      });
    });

    it('should save a new project', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .setValue('input[name="title"]', 'New Project')
      .setValue('input[name="url"]', 'http://google.com')
      .setValue('input[name="thumbnail"]', 'thumbnail.png')
      .setValue('input[name="photoUrl"]', 'photo.png')
      .click('#wmd-editor-summary')
      .keys('This is a project summary')
      .click('#wmd-editor-description')
      .keys('This is a project description')
      .click("button.submit-button.save")
      .pause(1000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects/edit/' + encodeURIComponent('New Project'));
        return browser.click('.header-link[href="/projects"]');
      })
      .pause(1000)
      .getText('.project-title')
      .then(function(text) {
        expect(text).to.not.include('New Project');
        db.Project.findOne({where: {title: 'New Project'}})
        .then(function(project) {
          expect(project.published).to.be.false;
          expect(project.url).to.equal('http://google.com');
          expect(project.thumbnail).to.equal('thumbnail.png');
          expect(project.photoUrl).to.equal('photo.png');
          expect(project.summary).to.equal('This is a project summary');
          expect(project.description).to.equal('This is a project description');
          done();          
        });
      });
    });

    it('should flash error messages', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .setValue('input[name="title"]', 'First Project')
      .setValue('input[name="url"]', 'http://google.com')
      .setValue('input[name="thumbnail"]', 'thumbnail.png')
      .setValue('input[name="photoUrl"]', 'photo.png')
      .click('#wmd-editor-summary')
      .keys('This is a project summary')
      .click('#wmd-editor-description')
      .keys('This is a project description')
      .click("button.submit-button.save")
      .pause(1000)
      .getText('#flash')
      .then(function(text) {
        expect(text).to.match(/title must be unique/);
        done();
      });
    });
  });

  describe('delete', function() {
    it('should delete published project and redirect to projects', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .pause(1000)
      .click('.header-link[href="/projects"]')
      .pause(1000)
      .click('.footer .right a') // edit link, for second project
      .pause(1000)
      .click('button.submit-button.destroy')
      .pause(2000)
      .alertAccept()
      .pause(1000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects');     
        return browser.getText('.project-title');
      })
      .then(function(text) {
        expect(text).to.not.match(/Second Project/);
        db.Project.findOne({where: {title: 'Second Project'}})
        .then(function (project) {
          expect(project).to.equal.null;
          done();
        });
      });
    });
    
    it('should delete unpublished project and redirect to create page', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .click('a.topbar-link[href="/projects/create"]')
      .click('a[href="/projects/edit/Unpublished%20First%20Project"]')
      .click('button.submit-button.destroy')
      .pause(2000)
      .alertAccept()
      .pause(1000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects/create');     
        return browser.getText('a');
      })
      .then(function(text) {
        expect(text).to.not.include.something.that.matches(/Unpublished First Project/);
        db.Project.findOne({where: {title: 'Unpublished First Project'}})
        .then(function (project) {
          expect(project).to.equal.null;
          done();
        });
      });
    });
  });

  describe('update', function() {
    it('should update published project', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .pause(1000)
      .click('.header-link[href="/projects"]')
      .pause(1000)
      .click('.footer .right a') // edit link, for second project
      .setValue('input[name="title"]', 'New Project Title')
      .setValue('input[name="url"]', 'http://google.com')
      .setValue('input[name="thumbnail"]', 'thumbnail.png')
      .setValue('input[name="photoUrl"]', 'photo.png')
      .click('#wmd-editor-summary')
      .keys('This is a new project summary')
      .click('#wmd-editor-description')
      .keys('This is a new project description')
      .click('button.submit-button.save')
      .pause(2000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects');
        return browser.getText('.wmd-preview');
      })
      .then(function(text) {
        expect(text).to.include.something.that.matches(/This is a new project summary/);        
        done();
      });
    });

    it('should flash error messages on improper updates', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .pause(1000)
      .click('.header-link[href="/projects"]')
      .pause(1000)
      .click('.footer .right a') // edit link, for second project
      .setValue('input[name="title"]', '')
      .click('button.submit-button.save')
      .pause(2000)
      .getText('#flash')
      .then(function(text) {
        expect(text).to.match(/title cannot be null/);
        done();
      });
    });

    it('should unpublish projects', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .pause(1000)
      .click('.header-link[href="/projects"]')
      .pause(1000)
      .click('.footer .right a') // edit link, for second project
      .setValue('input[name="title"]', 'New Project Title')
      .click('button.submit-button.unpublish')
      .pause(2000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects/edit/' + encodeURIComponent('New Project Title'));        
        return browser.getText('a');
      })
      .then(function(text) {        
        // make sure one of the unpublished project links is a link to this project
        expect(text).to.include.something.that.matches(/New Project Title/);
        done();
      });
    });

    it('should publish projects', function(done) {
      var browser = this.browser;
      var db = this.db;
      browser
      .click('.topbar-link[href="/projects/create"]')
      .click('a[href="/projects/edit/Unpublished%20Second%20Project"]')
      .setValue('input[name="title"]', 'Updated Project')
      .click('button.submit-button.publish')
      .pause(2000)
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/projects');        
        return browser.getText('.project-title');
      })
      .then(function(text) {        
        // make sure one of the unpublished project links is a link to this project
        expect(text).to.include.something.that.matches(/Updated Project/);
        done();
      });
    });
  });
});