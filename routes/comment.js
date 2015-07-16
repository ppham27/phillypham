var express = require('express');
var router = express.Router({mergeParams: true});

var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.post('/', authorize({role: 'commenter'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  Promise.join(db.Post.findOne({where: {title: req.params.title}}), 
               req.body.commentId ? db.Comment.findById(req.body.commentId, {attributes: ['id', 'published', 'postId']}) : Promise.resolve(null))
  .spread(function(post, comment) {    
    var newComment = {};
    newComment.userId = req.user.id;
    if (post === null) throw new Error('post not found');
    if (!post.published) throw new Error('you cannot comment on an unpublished post');    
    if (comment) {      
      if (comment.postId !== post.id) throw new Error('post ids do not match');
      if (!comment.published) throw new Error('you cannot reply to an unpublished comment');
      newComment.commentId = comment.id;
    } else {
      newComment.commentId = null;
    }
    newComment.body = req.body.body;
    if (req.body.published === true) newComment.published = true;
    trimComment(newComment);
    return post.createComment(newComment);
  })
  .then(function(newComment) {
    req.flash('info', 'Comment was successfully created!');
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

router.put('/:commentId', authorize({failureSilent: true, role: 'comment_editor'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  var promise = Promise.join(db.Comment.findById(req.params.commentId,
                                                 {attributes: ['id', 'body', 'published', 'userId', 'postId'],
                                                  include: [{model: db.Post, attributes: ['id', 'title', 'published']}]}),
                             req.body.commentId ? db.Comment.findById(req.body.commentId, {attributes: ['id', 'published', 'postId', 'commentId']}) : Promise.resolve(null));
  promise
  .spread(function(comment, replyComment) {
    var authorized = authorizeComment(req, comment);
    if (authorized === true) {
      var updates = {body: req.body.body || ''};
      if (replyComment !== null) {
        if (comment.postId !== replyComment.postId) throw new Error('post ids do not match');
        if (!replyComment.published) throw new Error('you cannot reply to an unpublished comment');
        updates.commentId = replyComment.id;
      } else if (req.body.commentId && replyComment === null) {
        throw new Error(req.body.commentId.toString() + ' is not a comment id');
      }
      if (req.body.published === true) updates.published = true;
      trimComment(updates);
      return comment.update(updates);
    } else {
      throw authorized;
    }
  })
  .then(function(comment) {
    if (comment.published) {      
      req.flash('info', 'Comment was successfully updated!');
      res.json({success: true, redirect: true,
                redirectLink: '/blog/' + encodeURIComponent(req.params.title) + '#comment-' + comment.id});
    } else {
      res.json({success: true, message: 'Comment was updated!'});
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

router.get('/:commentId', authorize({failureSilent: true, role: 'comment_editor'}), function(req, res, next) {
  db.Comment.findById(req.params.commentId,
                      {attributes: ['id', 'body', 'published', 'commentId', 'userId'],
                       include: [{model: db.Post, attributes: ['id', 'title', 'published']},
                                 {model: db.User, attributes: ['id', 'displayName', 'photoUrl']}]})
  .then(function(comment) {
    var authorized = authorizeComment(req, comment);
    if (authorized === true) {
      res.json(comment);
    } else {
      next(authorized);
    }
  });
});

router.delete('/:commentId', authorize({failureSilent: true, role: 'comment_editor'}), function(req, res, next) {
  db.Comment.findById(req.params.commentId,
                      {attributes: ['id', 'userId'],
                       include: [{model: db.Post, attributes: ['id', 'title', 'published']}]})
  .then(function(comment) {
    var authorized = authorizeComment(req, comment);
    if (authorized === true) {
      return comment.destroy();
    } else {
      throw authorized;
    }
  })
  .then(function() {    
    req.flash('info', 'Comment was successfully deleted!');
    res.json({success: true, redirect: true,
              redirectLink: '/blog/' + encodeURIComponent(req.params.title)});
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

module.exports = router;

function authorizeComment(req, comment) {
  if (comment === null) {
    return new Error('comment does not exist');
  } else if (!comment.Post.published) {
    return new Error('you cannot comment on unpublished post');
  } else if (req.params.title !== comment.Post.title) {
    return new Error('comment does not belong to post');
  } else if (req.isAuthorized || (req.user && req.user.id === comment.userId)) {
    return true;
  } else {
    return new Error('Not authorized to edit this comment.');
  }
}

function trimComment(comment) {
  comment.body = comment.body.trim();
}
