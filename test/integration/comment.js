var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var commentRoutes = require('../../routes/comment');
var config = require('config');
var Promise = require('bluebird');
var FakeRequest = require('../support/fakeRequest');

describe('comment routes', function() {
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

  describe('authorization', function() {
    before(function() {
      this.handle = commentRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/:commentId' && handle.route.methods.get;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });
  
    it('should let in authorized user', function(done) {
      var db = this.db;
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.commentId = 1;
      req.params.title = 'First Post';
      var res = {json: function(json) {
                   expect(json.body).to.equal('comment');
                   expect(json.User.displayName).to.equal('moderator');
                   done();
                 }};
      var next = {};
      this.handle(req, res, next);
    });

    it('should reject if comment does not belong to post', function(done) {
      var db = this.db;
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.commentId = 1;
      req.params.title = 'Second Post';
      var res = {json: function(json) {
                   throw new Error('this should not be called');
                 }};
      var next = function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/comment does not belong/);
        done();
      };
      this.handle(req, res, next);
    });

    it('should reject if comment does not exist', function(done) {
      var db = this.db;
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.commentId = 100;
      req.params.title = 'Second Post';
      var res = {json: function(json) {
                   throw new Error('this should not be called');
                 }};
      var next = function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/comment does not exist/);
        done();
      };
      this.handle(req, res, next);
    });

    it('should reject if post is unpublished', function(done) {
      var db = this.db;
      var handle = this.handle;
      db.Comment.findOne({where: {body: 'comment of unpublished post'}})
      .then(function(comment) {
        var req = new FakeRequest({}, true, {accepts: ['json']});
        req.params.commentId = comment.id;
        req.params.title = 'Unpublished Title';
        var res = {json: function(json) {
                     throw new Error('this should not be called');
                   }};
        var next = function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.match(/unpublished post/);
          done();
        };
        handle(req, res, next);
      });
    });

    it('should reject if you are the wrong user', function(done) {      
      var db = this.db;
      var handle = this.handle;
      db.User.findOne({where: {displayName: 'power' }})
      .then(function(user) {
        var req = new FakeRequest({}, false, {accepts: ['json']});
        req.user = user;
        req.params = {}
        req.params.commentId = 1;
        req.params.title = 'First Post';
        var res = {json: function(json) {
                     throw new Error('this should not be called');
                   }};
        var next = function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.match(/not authorized/i);
          done();
        };
        handle(req, res, next);
      });
    });

    describe('should accept if you are the correct user', function() {
      it('published', function(done) {      
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'power' }})
        .then(function(user) {
          var req = new FakeRequest({}, false, {accepts: ['json']});
          req.user = user;
          req.params = {}
          req.params.commentId = 3;
          req.params.title = 'First Post';
          var res = {json: function(json) {
                       expect(json.body).to.equal('reply comment');
                       expect(json.User.displayName).to.equal('power');
                       done();
                     }};
          var next = function(err) {};
          handle(req, res, next);
        });
      });
      it('unpublished', function(done) {      
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'power' }})
        .then(function(user) {
          var req = new FakeRequest({}, false, {accepts: ['json']});
          req.user = user;
          req.params = {}
          req.params.commentId = 7;
          req.params.title = 'First Post';
          var res = {json: function(json) {
                       expect(json.body).to.equal('nested unpublished comment');
                       expect(json.User.displayName).to.equal('power');
                       done();
                     }};
          var next = function(err) {};
          handle(req, res, next);
        });
      });
    });
  });


  
  describe('delete', function() {
    before(function() {
      this.handle = commentRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/:commentId' && handle.route.methods.delete;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });
    it('should delete comment', function(done) {
      var db = this.db;
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.commentId = 1;
      req.params.title = 'First Post';
      var res = {json: function(json) {
                   expect(json.success).to.be.true;
                   expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post'));
                   db.Comment.findById(1)
                   .then(function(comment) {
                     expect(comment).to.be.null;
                     done();
                   });
                 }};
      var next = {};
      this.handle(req, res, next);
    });
  });
});