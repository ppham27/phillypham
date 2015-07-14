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
                             {model: db.Comment, attributes: ['id', 'body', 'bodyHtml', 'published', 'publishedAt', 'post_id', 'commentId'],
                              include: [{model: db.User, attributes: ['id', 'displayName', 'photoUrl']}]}]})
  .then(function(post) {
    if (post === null) return next(new Error('Post does not exist'));
    if (!post.published && (!req.user || (!req.session.roles.post_editor && req.user.id !== post.user_id))) return next(new Error('Not authorized. You can only view your own unpublished posts.'));
    res.render('blog/view', {temporaryPost: post, user: req.user});
  });  
});

module.exports = router;