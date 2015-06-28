var express = require('express');
var router = express.Router();

var db = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: db.ApplicationSettings.title });
});

router.use('/login', require('./login'));
router.use('/register', require('./register'));
router.use('/logout', require('./logout'));
router.use('/auth', require('./auth'));
router.use('/user', require('./user'));

router.use('/post', require('./post'));

module.exports = router;
