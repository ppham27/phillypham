var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('post', {title: 'Post'});
});

module.exports = router;