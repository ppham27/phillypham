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

  describe('create', function() {
    before(function() {
      this.handle = commentRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/' && handle.route.methods.post;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });
    describe('errors', function() {
      it('should fail when post does not exist', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly drafted comment', published: 'truthy value'}, 
                                    true, {is: ['json'], accepts: ['json']});      
          req.user = user;
          req.params.title = 'non existent post'; 
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/post not found/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should fail when post is unpublished', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly drafted comment', published: 'truthy value'}, 
                                    true, {is: ['json'], accepts: ['json']});      
          req.user = user;
          req.params.title = 'Unpublished Title'; 
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/unpublished post/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should fail when comment is unpublished', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly drafted comment', published: true, commentId: 7}, 
                                    true, {is: ['json'], accepts: ['json']});      
          req.user = user;
          req.params.title = 'First Post'; 
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/unpublished comment/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });
      });
      
      it('should fail when replied to comment does not belong to post', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly drafted comment', published: true, commentId: 4}, 
                                    true, {is: ['json'], accepts: ['json']});      
          req.user = user;
          req.params.title = 'Second Post'; 
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/post ids do not match/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });
      });
    });

    describe('successes', function() {
      it('should create a comment draft', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly drafted comment', published: 'truthy value'}, 
                                    true, {is: ['json'], accepts: ['json']});      
          req.user = user;
          req.params.title = 'Second Post'; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       db.Comment.findOne({where: {body: 'newly drafted comment'}})
                       .then(function(comment) {
                         expect(comment.published).to.be.false;
                         expect(comment.commentId).to.be.null;
                         expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('Second Post') + '#edit-comment-' + comment.id);
                         done();
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should create a published comment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly published comment ', published: true}, 
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'Second Post'; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       db.Comment.findOne({where: {body: 'newly published comment'}})
                       .then(function(comment) {
                         expect(comment.published).to.be.true;
                         expect(comment.commentId).to.be.null;
                         expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('Second Post') + '#comment-' + comment.id);
                         done();
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should reply to comment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly published reply comment ', published: true, commentId: 4}, 
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       db.Comment.findOne({where: {body: 'newly published reply comment'}})
                       .then(function(comment) {
                         expect(comment.published).to.be.true;
                         expect(comment.commentId).to.equal(4);                       
                         expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post') + '#comment-' + comment.id);
                         done();
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });
    });
  });


  describe('put', function() {
    before(function() {
      this.handle = commentRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/:commentId' && handle.route.methods.put;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });

    describe('successes', function() {
      it('should update a published subcomment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment'},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 4; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post') + '#comment-' + 4);
                       db.Comment.findOne({where: {body: 'newly updated comment'}})
                       .then(function(comment) {
                         expect(comment.commentId).to.equal(3);
                         expect(comment.published).to.be.true;
                         done();                         
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should update a published comment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment'},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 2; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post') + '#comment-' + 2);
                       db.Comment.findOne({where: {body: 'newly updated comment'}})
                       .then(function(comment) {
                         expect(comment.commentId).to.be.null;
                         expect(comment.published).to.be.true;
                         done();                         
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should update a published comment as a subcomment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment', commentId: 4},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 2; 
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post') + '#comment-' + 2);
                       db.Comment.findOne({where: {body: 'newly updated comment'}})
                       .then(function(comment) {
                         expect(comment.commentId).to.equal(4);
                         expect(comment.published).to.be.true;
                         done();                         
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should publish a comment', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment', published: true},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 6;
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirectLink).to.equal('/blog/' + encodeURIComponent('First Post') + '#comment-' + 6);
                       db.Comment.findOne({where: {body: 'newly updated comment'}})
                       .then(function(comment) {
                         expect(comment.commentId).to.be.null;;
                         expect(comment.published).to.be.true;
                         done();                         
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });

      it('should save an unpublished comment and not redirect', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment'},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 7;
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirect).to.be.undefined;
                       expect(json.message).to.match(/comment was updated/i);
                       db.Comment.findOne({where: {body: 'newly updated comment'}})
                       .then(function(comment) {
                         expect(comment.commentId).to.equal(3);;
                         expect(comment.published).to.be.false;
                         done();                         
                       });
                     }};
          var next = {};
          handle(req, res, next);
        });
      });
    });

    describe('errors', function() {
      it('should reject empty updates', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: ''},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 3;
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/body cannot be empty/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });      
      });

      it('should reject updates where reply comment does not exist', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment', commentId: 500},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 3;
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/not a comment id/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });      
      });

      it('should reject updates where reply comment is not published', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment', commentId: 7},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'First Post'; 
          req.params.commentId = 3;
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/you cannot reply to an unpublished comment/);
                       done();
                     }};
          var next = {};
          handle(req, res, next);
        });      
      });

      it('should reject updates where reply comment belongs to a different post', function(done) {
        var db = this.db;
        var handle = this.handle;
        db.User.findOne({where: {displayName: 'admin'}})
        .then(function(user) {
          var req = new FakeRequest({body: 'newly updated comment', commentId: 7},
                                    true, {is: ['json'], accepts: ['json']});
          req.user = user;
          req.params.title = 'Second Post'; 
          req.params.commentId = 9;
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/post ids do not match/);
                       done();
                     }};
          var next = {};
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