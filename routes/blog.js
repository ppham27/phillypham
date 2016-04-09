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
        tag.getPosts({where: {published: true}, attributes: ['id']})
      )
    })    
    .spread(function(posts, allPosts) {
      var postCount = allPosts.length;
      res.render('blog/index', {
        title: 'Posts tagged ' + tag,
        blogTag: tag,
        posts: posts,
        nextPage: postCount > (page + 1)*db.ApplicationSettings['blog:postsPerPage'] ? '?' + qs.stringify({page: page + 2, tag: tag}) : null,
        previousPage: page > 0 ? '?' + qs.stringify({page: page, tag: tag}) : null});
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
      db.Post.count({where: {published: true}})
    )
    .spread(function(posts, postCount) {
      res.render('blog/index', {posts: posts,                                
                                nextPage: postCount > (page+1)*db.ApplicationSettings['blog:postsPerPage'] ? '?' + qs.stringify({page: page + 2}) : null,
                                previousPage: page > 0 ? '?' + qs.stringify({page: page}) : null});
    });  
  }
});

router.get('/author/:displayName', function(req, res, next) {
  var page = (Math.max(1, req.query.page) - 1) || 0;
  var tag = req.query.tag || null;
  var author = req.params.displayName;
  if (tag) {
    Promise.join(db.Tag.findOne({where: {name: tag}}), db.User.findOne({where: {displayName: author}}))
    .spread(function(tag, user) {
      if (!tag) return Promise.join([], []);
      if (!user) return Promise.join([], []);
      return Promise.join(
        tag.getPosts({
          where: {published: true, user_id: user.id},
          attributes: ['id', 'title', 'bodyHtml', 'photoUrl', 'photoLink', 'published', ['published_at', 'published_at'], 'user_id'],
          order: [['"published_at"', 'DESC']],
          limit: db.ApplicationSettings['blog:postsPerPage'],
          offset: page*db.ApplicationSettings['blog:postsPerPage'],
          include: [{model: db.User, attributes: ['id', 'displayName']},
                    {model: db.Tag, attributes: ['name']},
                    {model: db.Comment, attributes: ['published']}]}),
        tag.getPosts({where: {published: true, user_id: user.id}, attributes: ['id']})
      )
    })    
    .spread(function(posts, allPosts) {
      var postCount = allPosts.length;
      res.render('blog/index', {
        title: 'Posts by ' + author + ' tagged ' + tag,
        blogTag: tag,
        blogAuthor: author,
        posts: posts,
        nextPage: postCount > (page + 1)*db.ApplicationSettings['blog:postsPerPage'] ? 'author/' + encodeURIComponent(author) + '?' + qs.stringify({page: page + 2, tag: tag}) : null,
        previousPage: page > 0 ? 'author/' + encodeURIComponent(author) + '?' + qs.stringify({page: page, tag: tag}) : null});
    });    
  } else {
    db.User.findOne({where: {displayName: author}})
    .then(function(user) {
      if (!user) return Promise.resolve([], []);
      return Promise.join(
        db.Post.findAll({where: {published: true, user_id: user.id}, 
                         attributes: ['id', 'title', 'bodyHtml', 'photoUrl', 'photoLink', 'published', ['published_at', 'published_at'], 'user_id'],
                         order: [['"published_at"', 'DESC']],
                         limit: db.ApplicationSettings['blog:postsPerPage'],
                         offset: page*db.ApplicationSettings['blog:postsPerPage'],
                         include: [{model: db.User, attributes: ['id', 'displayName']},
                                   {model: db.Tag, attributes: ['name']},
                                   {model: db.Comment, attributes: ['published']}]}),
        db.Post.count({where: {published: true, user_id: user.id}})
      );
    })
    .spread(function(posts, postCount) {
      res.render('blog/index', {
        title: 'Posts by ' + author,
        posts: posts,
        blogAuthor: author,
        nextPage: postCount > (page+1)*db.ApplicationSettings['blog:postsPerPage'] ? 'author/' + encodeURIComponent(author) + '?' + qs.stringify({page: page + 2}) : null,
        previousPage: page > 0 ? 'author/' + encodeURIComponent(author) + '?' + qs.stringify({page: page}) : null});
    });  
  }
});

router.get('/search', function(req, res, next) {
  if (typeof req.query.tsquery === 'string' && req.query.tsquery.trim()) {
    var tsquery = req.query.tsquery.trim();
    db.Post.search(db, tsquery)
    .then(function(posts) {
      res.render('blog/searchResults', {
        tsquery: tsquery,
        posts: posts
      });
    })
    .catch(function(err) {
             req.flash('error', err);
             res.render('blog/search', {previousTsquery: tsquery});
           });
  } else {
    res.render('blog/search', {previousTsquery: req.query['previous-tsquery']});
  }
});

router.use('/:title/comment', require('./comment'));

router.get('/:title', function(req, res, next) {
  db.Post.findOne({where: {title: req.params.title}, 
                   attributes: ['id', 'title', 'body', 'bodyHtml', 'photoUrl', 'photoLink', 'published', ['published_at', 'published_at'], 'user_id'],
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