var express = require('express');
var router = express.Router();

var db = require('../models');


router.get('/:name', function(req, res, next) {
  var displayName = decodeURIComponent(req.params.name);
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (user === null) {
      req.flash('error', 'The requested user does not exist');
      res.redirect('/');
    } else {
      res.render('user/index', {title: user.displayName, displayedUser: user});
    }
  });
});

router.get('/edit/:name', function(req, res, next) {
  var displayName = decodeURIComponent(req.params.name);
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    res.render('user/edit', {title: user.displayName, temporaryUser: user, update: true});
  });
});

module.exports = router;