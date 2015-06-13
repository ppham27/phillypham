var express = require('express');
var router = express.Router();

var db = require('../models');

router.get('/', function(req, res, next) {
  res.render('login', {title: 'Login'});
});

module.exports = router;