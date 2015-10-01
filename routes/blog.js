var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var qs = require('querystring');

var db = require('../models');

router.get('/', function(req, res, next) {
  var page = (Math.max(1, req.query.page) - 1) || 0;
  var tag = req.query.tag || null;
  if (tag) {
    db.Tag.findOne({where: {name: tag}})
    .then(function(tag) {
      if (!tag) return Promise.join([], []);
      return Promise.join(
        tag.getPosts({
          where: {published: true},
          attributes: ['id', 'title', 'bodyHtml', 'photoUrl', 'photoLink', 'published', ['published_at', 'published_at'], 'user_id'],
          order: [['"published_at"', 'DESC']],
          limit: db.ApplicationSettings['blog:postsPerPage'],
          offset: page*db.ApplicationSettings['blog:postsPerPage'],
          include: [{model: db.User, attributes: ['id', 'displayName']},
                    {model: db.Tag, attributes: ['name']},
                    {model: db.Comment, attributes: ['published']}]}),
        tag.getPosts({attributes: ['id']})
      )
    })    
    .spread(function(posts, allPosts) {
      var postCount = allPosts.length;
      res.render('blog/index', {
        title: 'Posts tagged <em>' + tag + '</em>',
        posts: posts,
        nextPage: postCount > (page + 1)*db.ApplicationSettings['blog:postsPerPage'] ? qs.stringify({page: page + 2, tag: tag}) : null,
        previousPage: page > 0 ? qs.stringify({page: page, tag: tag}) : null});
    });    
  } else {
    Promise.join(
      db.Post.findAll({where: {published: true}, 
                       attributes: ['id', 'title', 'bodyHtml', 'photoUrl', 'photoLink', 'published', ['published_at', 'published_at'], 'user_id'],
                       order: [['"published_at"', 'DESC']],
                       limit: db.ApplicationSettings['blog:postsPerPage'],
                       offset: page*db.ApplicationSettings['blog:postsPerPage'],
                       include: [{model: db.User, attributes: ['id', 'displayName']},
                                 {model: db.Tag, attributes: ['name']},
                                 {model: db.Comment, attributes: ['published']}]}),
      db.Post.count()
    )
    .spread(function(posts, postCount) {
      res.render('blog/index', {posts: posts,
                                nextPage: postCount > (page+1)*db.ApplicationSettings['blog:postsPerPage'] ? qs.stringify({page: page + 2}) : null,
                                previousPage: page > 0 ? qs.stringify({page: page}) : null});
    });  
  }
});

router.use('/:title/comment', require('./comment'));

router.get('/:title', function(req, res, next) {
  db.Post.findOne({where: {title: req.params.title}, 
                   attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'photoLink', 'published', 'publishedAt', 'user_id'],
                   include: [{model: db.User, attributes: ['id', 'displayName', 'facebookUsername']},
                             {model: db.Tag, attributes: ['name']},
                             {model: db.Comment, attributes: ['id', 'body', 'bodyHtml', 'published', 'publishedAt', 'post_id', 'commentId', 'created_at'],
                              include: [{model: db.User, attributes: ['id', 'displayName', 'photoUrl']}]}]})
  .then(function(post) {
    if (post === null) return next(new Error('Post does not exist'));
    if (!post.published && (!req.user || (!req.session.roles.post_editor && req.user.id !== post.user_id))) return next(new Error('Not authorized. You can only view your own unpublished posts.'));
    res.render('blog/view', {title: post.title, temporaryPost: post});
  });  
});

module.exports = router;