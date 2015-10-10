var chai = require('chai');
chai.use(require('chai-things'));
var expect = chai.expect;
var postRoutes = require('../../routes/post');
var blogRoutes = require('../../routes/blog');
var config = require('config');
var Promise = require('bluebird');
var sequelizeFixtures = require('sequelize-fixtures');
var FakeRequest = require('../support/fakeRequest');

describe('post routes', function() {
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

  describe('blog', function() {
    describe('view', function() {
      before(function() {
        this.handle = blogRoutes.stack.filter(function(handle) {
                        return handle.route && handle.route.path === '/:title' && handle.route.methods.get;
                      });
        this.handle = this.handle[0].route.stack[0].handle;
      });
      it('should include user, comments, and tags', function(done) {        
        var req = new FakeRequest();
        req.params = {};
        req.params.title = 'First Post';
        var res = {}
        res.render = function(undefined, locals) {
          var post = locals.temporaryPost;
          expect(post.title).to.equal('First Post');
          expect(post.User.displayName).to.equal('admin');
          expect(post.Tags).to.include.something.that.has.property('name', 'jesus');
          expect(post.Comments.length).to.equal(7);
          expect(post.Comments.filter(function(comment) { return comment.published === true; }).length).to.equal(5);
          done();          
        };
        this.handle(req, res);
      });

      it('should return error if post does not exist', function(done) {        
        var req = new FakeRequest();;
        req.params = {};
        req.params.title = 'Post that does not exist';
        var res = {}
        var next = function(err) {
          expect(err.message).to.match(/does not exist/);
          done();
        };
        this.handle(req, res, next);
      });

      it('should block access to unpublished posts', function(done) { 
        var req = new FakeRequest();
        req.params = {};
        req.params.title = 'Power Unpublished Title';
        var res = {};
        var next = function(err) {
          expect(err.message).to.match(/not authorized/i);
          done();
        };
        this.handle(req, res, next);
      });

      it('should allow access to unpublished posts if you\'re an admin', function(done) { 
        var req = new FakeRequest({}, true);
        req.params = {};
        req.params.title = 'Power Unpublished Title';
        var res = {};
        res.render = function(undefined, locals) {
          expect(locals.temporaryPost.title).to.equal('Power Unpublished Title');
          done();
        };
        this.handle(req, res);
      });

      it('should allow access to unpublished posts if you\'re the right user', function(done) { 
        var self = this;
        var req = new FakeRequest({}, false);
        req.session.roles = {};
        req.params = {};
        req.params.title = 'Power Unpublished Title';
        var res = {};        
        res.render = function(undefined, locals) {
          expect(locals.temporaryPost.title).to.equal('Power Unpublished Title');
          done();
        };
        var db = this.db;
        db.User.findOne({where: {displayName: 'power'}})
        .then(function(user) {
          req.user = user;
          self.handle(req, res);
        });
      });

      it('should deny access to unpublished posts if you\'re the wrong user', function(done) { 
        var self = this;
        var req = new FakeRequest({}, false);
        req.session.roles = {};
        req.params = {};
        req.params.title = 'Unpublished Title';
        var next = function(err) {
          expect(err.message).to.match(/not authorized/i);
          done();
        };
        var db = this.db;
        db.User.findOne({where: {displayName: 'power'}})
        .then(function(user) {
          req.user = user;
          self.handle(req, undefined, next);
        });
      });
    });
  });  

  describe('post', function() {
    describe('delete and authorization', function() {
      before(function() {
        this.handle = postRoutes.stack.filter(function(handle) {
                        return handle.route.path === '/:id' && handle.route.methods.delete;
                      });
        this.handle = this.handle[0].route.stack[1].handle;
      });
      
      it('should delete a post', function(done) {
        var self = this;
        var id = 1;
        var req = new FakeRequest({}, true, {accepts: ['json'], is: ['json']});
        var res = {json: function(json) {
                     expect(json.success).to.be.true;
                     expect(json.redirect).to.be.true;
                     expect(json.redirectLink).to.equal('/');
                     db.Post.findById(id)
                     .then(function(post) {
                       expect(post).to.be.null;
                       done();
                     });
                   }};
        req.params.id = id;
        var db = this.db;
        db.Post.findById(id)
        .then(function(post) {
          expect(post).to.not.be.null;
          self.handle(req, res);
        });
      });

      it('should tell you a post does not exist', function(done) {
        var id = 1000;
        var req = new FakeRequest({}, false, {accepts: ['json'], is: ['json']});
        req.params = {};
        var res = {};
        var next = function(err) {
          expect(err).to.be.instanceOf(Error);
          expect(err.message).to.match(/does not exist/);
          done();
        };
        req.params.id = id;
        this.handle(req, res, next);
      });

      it('should allow deletion if correct user', function(done) {
        var self = this;
        var db = this.db;
        Promise.join(db.User.findOne({where: {displayName: 'power'}}), db.Post.findOne({where: {title: 'Power Unpublished Title'}}))
        .spread(function(user, post) {          
          var id = post.id;
          var req = new FakeRequest({}, false, {accepts: ['json'], is: ['json']});
          req.params = {id: id};
          req.user = user;
          req.session.roles = {};
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       done();
                     }};
          self.handle(req, res);
        });
      });

      it('should not allow deletion if wrong user', function(done) {
        var self = this;
        var db = this.db;
        Promise.join(db.User.findOne({where: {displayName: 'power'}}), db.Post.findOne({where: {title: 'Unpublished Title'}}))
        .spread(function(user, post) {          
          var id = post.id;
          var req = new FakeRequest({}, false, {accepts: ['json'], is: ['json']});
          req.params = {id: id};
          req.user = user;
          req.session.roles = {};
          var res = {};
          var next = function(err) {
            expect(err).to.be.instanceOf(Error);
            expect(err.message).to.match(/not authorized/i);
            done();
          };
          self.handle(req, res, next);
        });
      });
    });
    
    describe('put', function() {
      before(function() {
        this.handle = postRoutes.stack.filter(function(handle) {
                        return handle.route.path === '/:id' && handle.route.methods.put;
                      });
        this.handle = this.handle[0].route.stack[1].handle;
      });
      
      it('should update published post', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'http://example.com/picture.png', 
                                   tags: ['jesus', 'new tags', 'something']},
                                  true, {accepts: ['json'], is: ['json']});
        var db = this.db;
        req.params.id = 1;
        var res = {json: function(json) {
                     expect(json.success).to.be.true;
                     expect(json.redirect).to.be.true;
                     expect(json.redirectLink).to.equal('/' + encodeURIComponent('New Post'));
                     db.Post.findById(1,
                                      {include: [db.Tag]})
                     .then(function(post) {
                       expect(post.title).to.equal('New Post');
                       expect(post.body).to.equal('New Post Body');
                       expect(post.photoUrl).to.equal('http://example.com/picture.png');
                       expect(post.Tags.length).to.equal(3);
                       expect(post.Tags).to.include.something.that.has.property('name', 'jesus');
                       expect(post.Tags).to.include.something.that.has.property('name', 'new tag');
                       expect(post.Tags).to.include.something.that.has.property('name', 'something');
                       done();
                     });
                   }};
        this.handle(req, res);
      });

      it('publish a post', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'http://example.com/picture.png', 
                                   tags: ['jesus', 'new tags', 'something'],
                                   published: true},
                                  true, {accepts: ['json'], is: ['json']});
        var self = this;
        var db = this.db;
        db.Post.findOne({where: {title: 'Unpublished Title'}})
        .then(function(post) {
          expect(post.published).to.be.false;
          req.params.id = post.id;
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirect).to.be.true;
                       expect(json.redirectLink).to.equal('/' + encodeURIComponent('New Post'));
                       db.Post.findById(post.id)
                       .then(function(post) {
                         expect(post.published).to.be.true;
                         done();
                       });
                     }};
          self.handle(req, res);
        });
      });

      it('unpublish a post', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'http://example.com/picture.png', 
                                   tags: ['jesus', 'new tags', 'something'],
                                   published: false},
                                  true, {accepts: ['json'], is: ['json']});
        var self = this;
        var db = this.db;
        db.Post.findOne({where: {title: 'First Post'}})
        .then(function(post) {
          expect(post.published).to.be.true
          req.params.id = post.id;
          var res = {json: function(json) {
                       expect(json.success).to.be.true;
                       expect(json.redirect).to.be.undefined;
                       db.Post.findById(post.id)
                       .then(function(post) {
                         expect(post.published).to.be.false;
                         done();
                       });
                     }};
          self.handle(req, res);
        });
      });

      it('make errors messages on bad updates', function(done) {
        var req = new FakeRequest({title: '',
                                   body: '',
                                   photoUrl: 'not a url', 
                                   tags: ['jesus', 'new tags', 'something'],
                                   published: false},
                                  true, {accepts: ['json'], is: ['json']});
        var self = this;
        var db = this.db;
        db.Post.findOne({where: {title: 'First Post'}})
        .then(function(post) {
          req.params.id = post.id;
          var res = {json: function(json) {
                       expect(json.error).to.include.something.that.matches(/not properly formatted/);
                       expect(json.error).to.include.something.that.matches(/title cannot be empty/);
                       expect(json.error).to.include.something.that.matches(/body cannot be empty/);
                       done();
                     }};
          self.handle(req, res);
        });
      });
    });
    
    describe('create', function() {
      before(function() {    
        this.handle = postRoutes.stack.filter(function(handle) {
                        return handle.route.path === '/' && handle.route.methods.post;
                      });
        this.handle = this.handle[0].route.stack[1].handle;
      });     
        
      it('should create a post', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'http://example.com/picture.png', 
                                   tags: ['jesus', 'life','new tag', 'something'],
                                   published: true},
                                  true, {accepts: ['json'], is: ['json']});
        
        var res = {json: function(json) {
                     expect(json.success).to.be.true;
                     expect(json.redirect).to.be.true;
                     expect(json.redirectLink).to.equal('/' + encodeURIComponent('New Post'));
                     done();
                   }};
        this.handle(req, res);
      });

      it('should create a post and redirect to edit', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'http://example.com/picture.png', 
                                   tags: ['jesus', 'life','new tags', 'something'],
                                   published: false},
                                  true, {accepts: ['json'], is: ['json']});
        var db = this.db;
        var res = {json: function(json) {
                     db.Post.findOne({where: {title: 'New Post'},
                                      include: [db.Tag]})
                     .then(function(post) {
                       expect(json.success).to.be.true;
                       expect(json.redirect).to.be.true;
                       expect(json.redirectLink).to.equal('/post/' + post.id);
                       expect(post.Tags.length).to.equal(4);
                       expect(post.Tags).to.include.something.that.has.property('name', 'jesus');
                       expect(post.Tags).to.include.something.that.has.property('name', 'life');
                       expect(post.Tags).to.include.something.that.has.property('name', 'new tag');
                       expect(post.Tags).to.include.something.that.has.property('name', 'something');
                       done();
                     });
                   }};
        this.handle(req, res);
      });

      it('should error on bad photo url', function(done) {
        var req = new FakeRequest({title: 'New Post',
                                   body: 'New Post Body',
                                   photoUrl: 'not a url', 
                                   tags: ['jesus', 'life','new tag', 'something'],
                                   published: true},
                                  true, {accepts: ['json'], is: ['json']});
        var db = this.db;
        var res = {json: function(json) {
                     expect(json.error).to.include.something.that.matches(/not properly formatted/);
                     done();                     
                   }};
        this.handle(req, res);
      });

      it('should error on missing title and body', function(done) {
        var req = new FakeRequest({title: '',
                                   body: '',
                                   photoUrl: 'not a url', 
                                   tags: ['jesus', 'life','new tag', 'something'],
                                   published: true},
                                  true, {accepts: ['json'], is: ['json']});
        var db = this.db;
        var res = {json: function(json) {
                     expect(json.error).to.include.something.that.matches(/title cannot be empty/);
                     expect(json.error).to.include.something.that.matches(/body cannot be empty/);
                     done();                     
                   }};
        this.handle(req, res);
      });
    });
  });
});


describe('post authors and tags', function() {
  before(function(done) {
    this.handle = blogRoutes.stack.filter(function(handle) {
                    return handle.route && handle.route.path === '/author/:displayName' && handle.route.methods.get;
                  });
    this.handle = this.handle[0].route.stack[0].handle;
    this.db = require('../../models');
    var db = this.db;
    var callback = function() {
      db.sequelize.sync({force: true})
      .then(function() {
        return db.loadFixtures(config.fixtures);
      })
      .then(function() {
        // extra posts
        var newFixtures = [];
        newFixtures.push({model: 'Tag',
                          data: {name: 'filler'}});
        newFixtures.push({model: 'Tag',
                          data: {name: 'junk'}});
        for (var p = 11; p < 30; ++p) {
          newFixtures.push({model: 'Post',
                            data: {title: p + ' Post',
                                   body: 'some post',
                                   published: true,
                                   publishedAt: new Date(1000000000000 + 100000*p),
                                   User: {displayName: p % 2 == 0 ? 'power' : 'moderator'},
                                   Tags: [{name: p % 3 == 0 ? 'junk' : 'filler'}]}});
        }
        return db.loadFixtures(newFixtures, true);
      })
      .then(function() {
        done();
      });
    };
    if (this.db.isReady) callback();
    this.db.once('ready', callback)
  });  

  describe('power posts', function() {
    it('first page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['28 Post', '26 Post', '24 Post', '22 Post', '20 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).match(/author\/power/);
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'power'};
      req.query = {};
      this.handle(req, res);
    });    

    it('second and last page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['18 Post', '16 Post', '14 Post', '12 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).match(/author\/power/);
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'power'};
      req.query = {page: 2};
      this.handle(req, res);
    });

    it('junk posts', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['24 Post', '18 Post', '12 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'power'};
      req.query = {tag: 'junk'};
      this.handle(req, res);
    });    

    it('tagged posts first page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['28 Post', '26 Post', '22 Post', '20 Post', '16 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).match(/author\/power/);
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'power'};
      req.query = {tag: 'filler'};
      this.handle(req, res);
    });

    it('tagged posts second page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['14 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).match(/author\/power/);
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'power'};
      req.query = {page: 2, tag: 'filler'};
      this.handle(req, res);
    });
  });  

  describe('moderator posts', function() {
    it('first page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['29 Post', '27 Post', '25 Post', '23 Post', '21 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).match(/author\/moderator/);
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'moderator'};
      req.query = {};
      this.handle(req, res);
    });    

    it('second page and last page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['19 Post', '17 Post', '15 Post', '13 Post', '11 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.blogAuthor).to.equal('moderator');
        expect(locals.previousPage).match(/author\/moderator/);
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'moderator'};
      req.query = {page: 2};
      this.handle(req, res);
    });

    it('junk posts', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['27 Post', '21 Post', '15 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'moderator'};
      req.query = {tag: 'junk'};
      this.handle(req, res);
    });    

    it('tagged posts first page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['29 Post', '25 Post', '23 Post', '19 Post', '17 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.blogAuthor).to.equal('moderator');
        expect(locals.blogTag).to.equal('filler');
        expect(locals.previousPage).to.be.null;
        expect(locals.nextPage).match(/author\/moderator/);
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'moderator'};
      req.query = {tag: 'filler'};
      this.handle(req, res);
    });

    it('tagged posts second page', function(done) {
      var db = this.db;
      var res = {};
      res.render = function(view, locals) {
        var expectedTitles = ['13 Post', '11 Post'];
        var actualTitles = locals.posts.map(function(post) { return post.title; });       
        expect(locals.previousPage).match(/author\/moderator/);
        expect(locals.nextPage).to.be.null;
        expect(actualTitles).to.deep.equal(expectedTitles);
        done();
      };
      var req = new FakeRequest();
      req.params = {displayName: 'moderator'};
      req.query = {page: 2, tag: 'filler'};
      this.handle(req, res);
    });
  });  

  it('handle nonusers', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(locals.posts).to.be.empty; 
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.be.null;
      done();
    };
    var req = new FakeRequest();
    req.params = {displayName: 'whoami'};
    req.query = {};
    this.handle(req, res);
  });

  it('handle users with no posts', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(locals.posts).to.be.empty; 
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.be.null;
      done();
    };
    var req = new FakeRequest();
    req.params = {displayName: 'standard'};
    req.query = {};
    this.handle(req, res);
  });

  it('handle empty tags', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(locals.posts).to.be.empty; 
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.be.null;
      done();
    };
    var req = new FakeRequest();
    req.params = {displayName: 'admin'};
    req.query = {tag: 'no tag'};
    this.handle(req, res);
  });
})


describe('post tags and pages', function() {
  before(function(done) {
    this.handle = blogRoutes.stack.filter(function(handle) {
                    return handle.route && handle.route.path === '/' && handle.route.methods.get;
                  });
    this.handle = this.handle[0].route.stack[0].handle;
    this.db = require('../../models');
    var db = this.db;
    var callback = function() {
      db.sequelize.sync({force: true})
      .then(function() {
        return db.loadFixtures(config.fixtures);
      })
      .then(function() {
        // extra posts
        var newFixtures = [];
        newFixtures.push({model: 'Tag',
                          data: {name: 'filler'}});
        for (var p = 11; p < 20; ++p) {
          newFixtures.push({model: 'Post',
                            data: {title: 'Post ' + p,
                                   body: 'some post',
                                   published: true,
                                   publishedAt: new Date(1000000000000 + 100000*p),
                                   User: {displayName: 'power'},
                                   Tags: [{name: 'filler'}]}});
        }
        return db.loadFixtures(newFixtures, true);
      })
      .then(function() {
        done();
      });
    };
    if (this.db.isReady) callback();
    this.db.once('ready', callback)
  });  

  it ('should only list 5 posts', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(view).to.equal('blog/index');
      expect(locals.posts.length).to.equal(5);
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.not.be.null;
      done();
    };
    var req = new FakeRequest();
    req.query = {};
    this.handle(req, res);
  });

  it ('should only list 5 posts on page 2', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(view).to.equal('blog/index');
      expect(locals.posts.length).to.equal(5);
      expect(locals.previousPage).to.not.be.null;
      expect(locals.nextPage).to.not.be.null;
      done();
    };
    var req = new FakeRequest();
    req.query = {page: 2};
    this.handle(req, res);
  });

  it ('should only list 2 posts on page 3', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(view).to.equal('blog/index');
      expect(locals.posts.length).to.equal(2);
      expect(locals.previousPage).to.not.be.null;
      expect(locals.nextPage).to.be.null;
      done();
    };
    var req = new FakeRequest();
    req.query = {page: 3};
    this.handle(req, res);
  });
  
  it ('should take invalid negative pages as the first page', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      var expectedTitles = ['Third Post', 'Second Post', 'First Post', 'Post 19', 'Post 18'];
      var actualTitles = locals.posts.map(function(post) { return post.title; });
      expect(actualTitles).to.deep.equal(expectedTitles);
      done();
    };
    var req = new FakeRequest();
    req.query = {page: -10};
    this.handle(req, res);
  });
  
  it('should have no posts for very large page numbes', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {        
      expect(locals.posts).to.be.empty;
      done();
    };
    var req = new FakeRequest();
    req.query = {page: 10000};
    this.handle(req, res);
  });

  it('should return only tagged posts', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      var expectedTitles = ['Post 14', 'Post 13', 'Post 12', 'Post 11'];
      var actualTitles = locals.posts.map(function(post) { return post.title; });
      expect(locals.previousPage).to.not.be.null;
      expect(locals.nextPage).to.be.null;
      expect(actualTitles).to.deep.equal(expectedTitles);
      expect(locals.title).to.match(/filler/);
      done();
    };
    var req = new FakeRequest();
    req.query = {page: 2, tag: 'filler'};
    this.handle(req, res);
  });

  it('should paginate tagged posts', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      var expectedTitles = ['Post 19', 'Post 18', 'Post 17', 'Post 16', 'Post 15'];
      var actualTitles = locals.posts.map(function(post) { return post.title; });
      expect(locals.blogTag).to.equal('filler');
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.not.be.null;
      expect(actualTitles).to.deep.equal(expectedTitles);
      expect(locals.title).to.match(/filler/);
      done();
    };
    var req = new FakeRequest();
    req.query = {tag: 'filler'};
    this.handle(req, res);
  });

  it('handle empty tags', function(done) {
    var db = this.db;
    var res = {};
    res.render = function(view, locals) {
      expect(locals.posts).to.be.empty; 
      expect(locals.previousPage).to.be.null;
      expect(locals.nextPage).to.be.null;
      done();
    };
    var req = new FakeRequest();
    req.query = {tag: 'no tag'};
    this.handle(req, res);
  });
});
