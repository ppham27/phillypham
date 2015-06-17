var express = require('express');
var router = express.Router();

var db = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: db.ApplicationSettings.title });
});

router.use('/login', require('./login'));
router.use('/logout', require('./logout'));
router.use('/post', require('./post'));

module.exports = router;
