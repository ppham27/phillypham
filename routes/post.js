var express = require('express');
var router = express.Router();

var db = require('../models');

router.get('/', function(req, res, next) {
  res.render('post/edit', {title: 'Post'});
});

router.post('/', function(req, res, next) {
});

router.get('/:id', function(req, res, next) {
  db.Post.findById(req.params.id,
                   {attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'published', 'publishedAt', 'user_id'],
                    include: [{model: db.User, attributes: ['id', 'displayName']},
                              {model: db.Tag, attributes: ['name']},
                              {model: db.Comment, attributes: ['published']}]})
  .then(function(post) {
    if (post === null) return next(new Error('Post does not exist'));
    res.render('post/edit', {title: 'Post', temporaryPost: post});
  });
});

router.put('/:id', function(req, res, next) {
});

router.delete('/:id', function(req, res, next) {
});

module.exports = router;