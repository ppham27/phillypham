var express = require('express');
var router = express.Router();

var db = require('../models');

router.get('/', require('../lib/middleware/preLogin'), function(req, res, next) {
  res.render('register', {title: 'Registration'});
});

router.post('/', function(req, res, next) {
  
}, require('../lib/middleware/postLogin'));

module.exports = router;