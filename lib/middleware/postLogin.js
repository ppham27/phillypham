var db = require('../../models');
var Promise = require('bluebird');

module.exports = function(req, res, next) {
  if (req.session.deferredComment) {
    req.user.hasPermission('commenter')
    .then(function(isPermitted) {
      if (isPermitted) {  
        req.session.deferredComment.userId = req.user.id;
        Promise.join(db.Comment.create(req.session.deferredComment), db.Post.findById(req.session.deferredComment.postId))
        .spread(function(comment, post) {
          delete req.session.deferredComment;
          var postPath = '/' + encodeURIComponent(post.title);
          var hash = comment.published ? '#comment-' + comment.id : '#edit-comment-' + comment.id;
          if (req.session.preLoginPath === postPath) {
            res.redirect(postPath + hash);
          } else {
            req.flash('info', 'Your comment was posted <a href="' + postPath + hash +'">here</a>!');
            res.redirect(req.session.preLoginPath || '/');
          }          
        })
        .catch(function(err) {
                 next(err);
               });        
      } else {
        res.redirect(req.session.preLoginPath || '/');
      }      
    });
    
  } else {
    res.redirect(req.session.preLoginPath || '/');
  }
}
