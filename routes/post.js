var express = require('express');
var router = express.Router();

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
      res.render('post/edit', {title: 'Post', temporaryPost: post});
    } else {
      return next(new Error('Not authorized. You can only edit your own posts.'));
    }
  });
});

// editing an existing post
router.put('/:id', authorize({failureSilent: true, role: 'post_editor'}), function(req, res, next) {
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