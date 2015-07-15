var express = require('express');
var router = express.Router({mergeParams: true});

var db = require('../models');

router.post('/', function(req, res, next) {
  db.Post.findOne({where: {title: req.params.title}})
  .then(function(post) {
    if (post === null) throw new Error('post not found');
    if (!post.published) throw new Error('you cannot comment on unpublished post');
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

