var express = require('express');
var router = express.Router();

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.get('/list', authorize({role: 'poster'}), function(req, res, next) {
  var where = req.session.roles.post_editor ? {} : {
    $or: [
      { published: true },
      { user_id: req.user.id} 
    ]
  };
  db.Post.findAll({
    where: where,
    order: 'created_at DESC',
    include: [{model: db.User, attributes: ['id', 'displayName']}]})
  .then(function(posts) {
    res.render('post/list', {title: 'Posts', posts: posts});
  });  
});


router.get('/', function(req, res, next) {
  res.render('post/edit', {title: 'Post'});
});

// create a new post
router.post('/', authorize({role: 'poster'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  var post = req.body;
  trimPost(post);
  post.user_id = req.user.id;
  var tags = post.tags || [];
  delete post.tags;
  db.Post.create(post)
  .then(function(post) {
    var tagPromises = tags.filter(function(tag) {
                        return tag.trim() !== '';
                      }).map(function(tagName) {
                        return db.Tag.findOrCreateByName(tagName)
                               .spread(function(post, created) {
                                 return post;
                               });
                      });
    return Promise.join(post, Promise.all(tagPromises));
  })
  .spread(function(post, tags) {
    return Promise.join(post, post.setTags(tags));
  })
  .spread(function(post, tags) {    
    req.flash('info', 'Post was successfully created!');
    if (post.published) {
      res.json({success: true, redirect: true, redirectLink: '/' + encodeURIComponent(post.title)});
    } else {
      res.json({success: true, redirect: true, redirectLink: '/post/' + post.id});
    }
  })
  .catch(function(err) {
           var error = [];
           if (err.errors) {
             err.errors.forEach(function(err) {
               error.push(err.message);
             });
           } else {
             error.push(err.message);
           }
           res.json({error: error});
         });

  
});


// edit view
router.get('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
  if (isNaN(req.params.id)) return res.json({error: req.params.id.toString() + ' is not an integer'});
  db.Post.findById(req.params.id,
                   {attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'photoLink', 'published', 'publishedAt', 'user_id'],
                    include: [{model: db.User, attributes: ['id', 'displayName']},
                              {model: db.Tag, attributes: ['name']},
                              {model: db.Comment, attributes: ['published']}]})
  .then(function(post) {
    var authorized = authorizePost(req, post);    
    if (authorized === true) {
      res.render('post/edit', {title: 'Post', edit: true, temporaryPost: post});
    } else {
      next(authorized);
    }
  });
});

// editing an existing post
router.put('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  if (isNaN(req.params.id)) return res.json({error: req.params.id.toString() + ' is not an integer'});
  var updates = req.body;
  db.Post.findById(req.params.id)
  .then(function(post) {
    var authorized = authorizePost(req, post);    
    if (authorized === true) {
      trimPost(updates);
      updates.tags = updates.tags || [];
      var tagPromises = updates.tags.filter(function(tag) { 
                          return tag.trim() !== '';
                        }).map(function(tagName) {
                          return db.Tag.findOrCreateByName(tagName)
                                 .spread(function(tag, created) {
                                   return tag;
                                 });
                        });
      delete updates.tags;
      return Promise.join(post, Promise.all(tagPromises));
    } else {
      throw authorized;
    }
  })
  .spread(function(post, newTags) {
    return Promise.join(post.update(updates), post.setTags(newTags));
  })
  .spread(function(post, tags) {
    if (post.published) {
      req.flash('info', 'Post has been updated!');
      res.json({success: true, redirect: true, redirectLink: '/' + encodeURIComponent(post.title)});
    } else {
      var message = ['Post has been updated!']
      if (!post.published && updates.published === false) message.push('Post was unpublished.');
      res.json({success: true, message: message});
    }
  })
  .catch(function(err) {
           var error = [];
           if (err.errors) {
             err.errors.forEach(function(err) {
               error.push(err.message);
             });
           } else {
             error.push(err.message);
           }
           res.json({error: error});
         });
});

// delete a post
router.delete('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
  if (isNaN(req.params.id)) return res.json({error: req.params.id.toString() + ' is not an integer'});
  var postTitle;
  var isPublished;
  db.Post.findById(req.params.id)
  .then(function(post) {
    var authorized = authorizePost(req, post);
    if (authorized === true) {
      postTitle = post.title;
      isPublished = post.published;
      return post.destroy();
    } else {
      throw authorized;
    }
  })
  .then(function() {
    req.flash('info', postTitle + ' has been deleted!');
    return res.json({success: true, redirect: true, redirectLink: isPublished ? '/' : '/post'})
  })
  .catch(function(err) {
           next(err);
         });
});

module.exports = router;

function authorizePost(req, post) {
  if (post === null) {
    return new Error('Post does not exist');
  } else if (req.isAuthorized || (req.user && req.user.id === post.user_id)) {
    return true;
  } else {
    return new Error('Not authorized. You can only edit your own posts.');
  }  
}

function trimPost(post) {  
  post.title = post.title.trim();
  post.body.trim();
  if (typeof post.photoUrl === 'string') post.photoUrl = post.photoUrl.trim() || null;
  if (typeof post.photoLink === 'string') post.photoLink = post.photoLink.trim() || null;
  if (typeof post.tags === 'string') {
    post.tags = post.tags.split(',');
  }
}

