var express = require('express');
var router = express.Router();

var db = require('../models');
var passport = require('../lib/passport');

router.get('/', function(req, res, next) {
  res.render('login', {title: 'Login'});
});

router.post('/', passport.authenticate('local', {successRedirect: '/',
                                                 failureRedirect: '/login',
                                                 failureFlash: true}));

module.exports = router;