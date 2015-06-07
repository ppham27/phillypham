var expect = require('chai').expect;
var loadFixtures = require('../lib/loadFixtures');

describe('loadFixtures', function() {
  before(function() {
    this.db = require('./support/db');
    this.db.sequelizeModels = ['user', 'post'];
    this.fixtures = [{model: 'user', data: {id: 1, name: 'phil'}},
                     {model: 'user', data: {id: 2, name: 'chris'}},
                     {model: 'post', data: {id: 1, title: 'first post'}},
                     {model: 'post', data: {id: 2, title: 'second post'}}];
    this.db.user = this.db.sequelize.define('user', {name: this.db.Sequelize.STRING});
    this.db.post = this.db.sequelize.define('post', {title: this.db.Sequelize.STRING});
  });
  
  beforeEach(function(done) {
    this.db.sequelize.sync({force: true})
    .then(function() { done(); });
  });

  it('should load fixtures when database is empty', function(done) {
    var db = this.db;
    loadFixtures(db, this.fixtures)
    .then(function() {
      return db.user.count();
    })
    .then(function(count) {
      expect(count).to.equal(2);
      done();
    });    
  });

  describe('it should load fixtures when force is true', function() {
    it('should test case 1', function(done) {
      var db = this.db; var fixtures = this.fixtures;
      db.user.create({name: 'tim'})
      .then(function() { 
        return loadFixtures(db, fixtures, true);
      })
      .then(function() {
        return db.post.count();
      })
      .then(function(count) {
        expect(count).to.equal(2);      
      })
      .then(function() {
        return db.user.findOne({where: {name: 'tim'}});
      })
      .then(function(tim) {
        expect(tim).to.be.null;
        done();
      });    
    }); 

    it('should test case 2', function(done) {
      var db = this.db; var fixtures = this.fixtures;
      db.post.create({title: 'new post'})
      .then(function() { 
        return loadFixtures(db, fixtures, true);
      })
      .then(function() {
        return db.user.count();
      })
      .then(function(count) {
        expect(count).to.equal(2);      
      })
      .then(function() {
        return db.post.findOne({where: {title: 'new post'}});
      })
      .then(function(post) {
        expect(post).to.be.null;
        done();
      });    
    }); 
    
  });

  describe('it should do nothing otherwise', function() {
    it('should test case 1', function(done) {
      var db = this.db; var fixtures = this.fixtures;
      db.user.create({name: 'tim'})
      .then(function() {    
        return loadFixtures(db, fixtures, false);
      })
      .then(function() {
        throw new Error('this should not be reached');
      }).catch(function(err) {     
                 expect(err).to.be.instanceOf(Error, /database is not empty/);
                 return db.user.count();
               })
      .then(function(userCount) {
        expect(userCount).to.equal(1);
        done();
      });      
    });

    it('should test case 2', function(done) {
      var db = this.db; var fixtures = this.fixtures;
      db.post.create({title: 'new post'})
      .then(function() {    
        return loadFixtures(db, fixtures, false);
      })
      .then(function() {
        throw new Error('this should not be reached');
      }).catch(function(err) {     
                 expect(err).to.be.instanceOf(Error, /database is not empty/);
                 return db.user.count();
               })
      .then(function(userCount) {
        expect(userCount).to.equal(0);
        return db.post.findAll();
      })
      .then(function(posts) {
        expect(posts.length).to.equal(1);
        expect(posts[0].title).to.equal('new post');
        done();
      });      
    });
  });
});