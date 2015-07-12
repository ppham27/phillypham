var express = require('express');
var router = express.Router();

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.get('/list', function(req, res, next) {
  var where = {published: true};
  db.Post.findAll({
    // where: where,
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
router.post('/', function(req, res, next) {
});


// edit view
router.get('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
  db.Post.findById(req.params.id,
                   {attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'published', 'publishedAt', 'user_id'],
                    include: [{model: db.User, attributes: ['id', 'displayName']},
                              {model: db.Tag, attributes: ['name']},
                              {model: db.Comment, attributes: ['published']}]})
  .then(function(post) {
    if (post === null) {
      return next(new Error('Post does not exist'));
    } else if (req.isAuthorized || (req.user && req.user.id === post.user_id)) {
      res.render('post/edit', {title: 'Post', edit: true, temporaryPost: post});
    } else {
      return next(new Error('Not authorized. You can only edit your own posts.'));
    }
  });
});

// editing an existing post
router.put('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  var updates = req.body;
  db.Post.findById(req.params.id)
  .then(function(post) {
    if (post === null) {
      throw new Error('Post does not exist');
    } else if (req.isAuthorized || (req.user && req.user.id === post.user_id)) {
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
      throw new Error('Not authorized. You can only edit your own posts.');
    }
  })
  .spread(function(post, newTags) {
    return Promise.join(post.update(updates), post.setTags(newTags));
  })
  .then(function() {
    res.json({success: true, message: 'Post has been updated!'});
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
  var postTitle;
  var isPublished;
  db.Post.findById(req.params.id)
  .then(function(post) {
    if (post === null) {
      throw new Error('Post does not exist');
    } else if (req.isAuthorized || (req.user && req.user.id === post.user_id))  {
      postTitle = post.title;
      isPublished = post.published;
      return post.destroy();
    } else {
      throw new Error('You can only edit your own posts');
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

function trimPost(post) {  
  post.title = post.title.trim();
  post.body.trim();
  if (post.photoUrl) post.photoUrl = post.photoUrl.trim() || null;
  if (typeof post.tags === 'string') {
    post.tags = post.tags.split(',');
  }
}