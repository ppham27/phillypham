var express = require('express');
var router = express.Router();

var db = require('../models');


router.get('/:name', function(req, res, next) {
  var displayName = decodeURIComponent(req.params.name);
  db.User.findOne({where: { displayName: displayName}})
  .then(function(user) {
    if (req.accepts('html')) {
      if (user === null) {
        req.flash('error', 'The requested user does not exist');
        res.redirect('/');
      } else {
        res.render('user/index', {title: user.displayName, displayedUser: user});
      }
    } else if (req.accepts('json')) {
      if (user === null) {
        res.json({error: 'requested user does not exist'});
      } else {
        res.json({displayName: user.displayName, email: user.email,
                  givenName: user.givenName, familyName: user.familyName,
                  middleName: user.middleName});
      }
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