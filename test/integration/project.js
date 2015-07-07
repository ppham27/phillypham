var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var projectRoutes = require('../../routes/projects');
var config = require('config');
var FakeRequest = require('../support/fakeRequest');


describe('project routes', function() {
  before(function(done) {
    this.db = require('../../models');
    if (this.db.isReady) done();
    this.db.once('ready', function() {
      done();
    });
  });
  
  beforeEach(function(done) {
    var db = this.db;
    db.sequelize.sync({force: true})
    .then(function() {
      return db.loadFixtures(config.fixtures);
    })
    .then(function() {
      done();
    });
  });

  describe('create', function() {
    before(function() {
      this.handle = projectRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/create' && handle.route.methods.post;
                    });
      this.handle = this.handle[0].route.stack[1].handle; // index 1 to by pass the authorization
    });
    it('should make a published project', function(done) {
      var project = {
        title: 'new project',
        summary: 'summary',
        description: 'description',
        published: true
      }
      var db = this.db;
      var req = new FakeRequest(project, true, {accepts: ['json'], is: ['json']});
      var res = {
        json: function(json) {
          expect(json.success).to.be.true;
          expect(json.redirect).to.be.true;
          expect(json.redirectLink).to.equal('/projects');
          db.Project.findOne({where: {title: 'new project'}})
          .then(function(project) {
            expect(project.published).to.be.true;
            expect(project.summaryHtml).to.equal('<p>summary</p>');
            expect(project.descriptionHtml).to.equal('<p>description</p>');
            done();
          });
        }};
      this.handle(req, res);      
    });

    it('should return error on duplicate title', function(done) {
      var project = {
        title: 'First Project',
        summary: 'summary',
        description: 'description',
        published: true
      }
      var db = this.db;
      var req = new FakeRequest(project, true, {accepts: ['json'], is: ['json']});
      var res = {
        json: function(json) {
          expect(json.success).to.be.undefined;
          expect(json.error).to.be.instanceof(Array);
          expect(json.error).to.include.something.that.matches(/title must be unique/);
          db.Project.findOne({where: {title: 'First Project'}})          
          .then(function(project) {
            expect(project.summary).to.equal('My project summary');
            done();
          });
        }};
      this.handle(req, res);      
    });

    it('should return error on missing summary', function(done) {
      var project = {
        title: 'new project',
        summary: ' ',
        description: 'description',
        published: true
      }
      var db = this.db;
      var req = new FakeRequest(project, true, {accepts: ['json'], is: ['json']});
      var res = {
        json: function(json) {
          expect(json.success).to.be.undefined;
          expect(json.error).to.be.instanceof(Array);
          expect(json.error).to.include.something.that.matches(/summary cannot be null/);
          db.Project.findOne({where: {title: 'new project'}})          
          .then(function(project) {
            expect(project).to.be.null;
            done();
          });
        }};
      this.handle(req, res);      
    });

   it('should return error on missing description', function(done) {
      var project = {
        title: 'new project',
        summary: 'summary',
        description: '\t',
        published: true
      }
      var db = this.db;
      var req = new FakeRequest(project, true, {accepts: ['json'], is: ['json']});
      var res = {
        json: function(json) {
          expect(json.success).to.be.undefined;
          expect(json.error).to.be.instanceof(Array);
          expect(json.error).to.include.something.that.matches(/description cannot be null/);
          db.Project.findOne({where: {title: 'new project'}})          
          .then(function(project) {
            expect(project).to.be.null;
            done();
          });
        }};
      this.handle(req, res);      
    });

   it('should return error on bad url', function(done) {
      var project = {
        title: 'new project',
        summary: 'summary',
        url: 'not a url',
        description: 'description',
        published: true
      }
      var db = this.db;
      var req = new FakeRequest(project, true, {accepts: ['json'], is: ['json']});
      var res = {
        json: function(json) {
          expect(json.success).to.be.undefined;
          expect(json.error).to.be.instanceof(Array);
          expect(json.error).to.include.something.that.matches(/url is not properly formatted/);
          db.Project.findOne({where: {title: 'new project'}})          
          .then(function(project) {
            expect(project).to.be.null;
            done();
          });
        }};
      this.handle(req, res);      
    });
  });

  describe('delete', function() {
    before(function() {
      this.handle = projectRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/edit/:title' && handle.route.methods.delete;
                    });
      this.handle = this.handle[0].route.stack[1].handle; // index 1 to by pass the authorization
    }); 
    
    it('should destroy a project', function(done) {
      var db = this.db;
      var req = new FakeRequest(undefined, true);
      req.params.title = 'First Project';
      var res = {json: function(json) {
                   expect(json.success).to.be.true;
                   db.Project.findOne({where: {title: 'First Project'}})
                   .then(function(project) {
                     expect(project).to.be.null;
                     done();
                   });
                 }};
      this.handle(req, res);
    });

    it('should return an error on a missing project', function(done) {
      var db = this.db;
      var req = new FakeRequest(undefined, true);
      req.params.title = 'nonexistent project';
      var next = function(err) {
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.match(/project does not exist/);
        done();
      }
      this.handle(req, undefined, next);
    });
  });  
});