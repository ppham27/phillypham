var express = require('express');
var router = express.Router();

var db = require('../models');

router.get('/', function(req, res, next) {
  db.Post.findAll({where: {published: true}, 
                   attributes: ['id', 'title', 'bodyHtml', 'photoUrl', 'published', 'publishedAt', 'user_id'],
                   order: '"Post"."published_at" DESC',
                   include: [{model: db.User, attributes: ['id', 'displayName']},
                             {model: db.Tag, attributes: ['name']},
                             {model: db.Comment, attributes: ['published']}]})
  .then(function(posts) {
    res.render('blog/index', {posts: posts});
  });  
});


router.get('/:title', function(req, res, next) {
  db.Post.findOne({where: {title: req.params.title}, 
                   attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'published', 'publishedAt', 'user_id'],
                   include: [{model: db.User, attributes: ['id', 'displayName']},
                             {model: db.Tag, attributes: ['name']},
                             {model: db.Comment, attributes: ['published']}]})
  .then(function(post) {
    if (post === null) return next(new Error('Post does not exist'));
    res.render('blog/view', {temporaryPost: post});
  });  
});


module.exports = router;