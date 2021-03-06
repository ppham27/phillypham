var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var Sequelize = require('sequelize');

describe('Project', function() {
  beforeEach(function(done) {
    this.db = require('./support/db');
    this.Project = this.db.sequelize.import('../models/Project');
    this.Project.sync({force: true}).then(function() {
      done();
    });
  });  
  
  it('should do conversions to html', function(done) {
    this.Project.create({title: 'project', 
                         summary: 'summary', description: 'description'})
    .then(function(project) {
      expect(project.summaryHtml).to.equal("<p>summary</p>");
      expect(project.descriptionHtml).to.equal("<p>description</p>");
      expect(project.published).to.be.false;
      expect(project.publishedAt).to.be.null;
      done();
    });
  });

  it('should set published date', function(done) {
    this.Project.create({title: 'project', 
                         summary: 'summary', description: 'description', published: true})
    .then(function(project) {
      expect(project.publishedAt).to.not.be.null;
      done();
    });
  });

  it('should set published date on update', function(done) {
    this.Project.create({title: 'project', 
                         summary: 'summary', description: 'description', published: false})
    .then(function(project) {
      expect(project.publishedAt).to.be.null;
      project.published = true;
      return project.save()
      
    })
    .then(function(project) {
      expect(project.publishedAt).to.not.be.null;
      done();
    });
  });
  
  it('should enforce unique titles' , function(done) {
    var Project = this.Project;
    Project.create({title: 'project', 
                    summary: 'summary', description: 'description', published: false})
    .then(function(project) {
      return Project.create({title: 'project', 
                             summary: 'summary', description: 'description', published: false});
    })
    .catch(function(err) {             
             expect(err).to.be.instanceof(Error);
             expect(err.errors.map(function(err) { return err.message; })).to.include.something.that.matches(/title must be unique/)
             done();
           });
  });

  it('should update the html versions of summary and description', function(done) {
    var Project = this.Project;
    Project.create({title: 'project', 
                    summary: 'summary', description: 'description', published: false})
    .then(function(project) {
      expect(project.summaryHtml).to.equal('<p>summary</p>');
      expect(project.descriptionHtml).to.equal('<p>description</p>');
      return project.update({summary: 'new summary', description: 'new description'});
    })
    .then(function(project) {
      expect(project.summaryHtml).to.equal('<p>new summary</p>');
      expect(project.descriptionHtml).to.equal('<p>new description</p>');
      done();
    });    
  });
});