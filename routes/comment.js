var express = require('express');
var router = express.Router({mergeParams: true});

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.post('/', authorize({role: 'commenter'}), function(req, res, next) {
  Promise.join(db.Post.findOne({where: {title: req.params.title}}), 
               req.body.commentId ? db.Comment.findById(req.body.commentId, {attributes: ['id', 'published', 'post_id']}) : Promise.resolve(null))
  .spread(function(post, comment) {    
    var newComment = {};
    newComment.userId = req.user.id;
    if (post === null) throw new Error('post not found');
    if (!post.published) throw new Error('you cannot comment on an unpublished post');
    if (comment) {
      if (comment.Post.id !== post.id) throw new Error('post ids do not match');
      newComment.commentId = comment.id;
    } else {
      newComment.commentId = null;
    }
    newComment.body = req.body.body;
    newComment.published = req.body.published || false;
    return post.createComment(newComment);
  })
  .then(function(newComment) {
    req.flash('info', 'Comment was successfully posted!');
    if (newComment.published) {
      return res.json({success: true, redirect: true,
                       redirectLink: '/blog/' + encodeURIComponent(req.params.title) + '#comment-' + newComment.id});
    } else {
      return res.json({success: true, redirect: true,
                       redirectLink: '/blog/' + encodeURIComponent(req.params.title) + '#edit-comment-' + newComment.id});
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

router.get('/:commentId', function(req, res, next) {
  db.Comment.findById(req.params.commentId,
                      {attributes: ['id', 'body', 'published'],
                       include: {model: db.Post, attributes: ['id', 'title', 'published']}})
  .then(function(comment) {
    if (!comment.Post.published) return next(new Error('you cannot comment on unpublished post'));
    if (req.params.title !== comment.Post.title) return next(new Error('comment does not belong to post'));
    res.json(comment);
  });
});

module.exports = router;

