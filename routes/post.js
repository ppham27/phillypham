var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('post/edit', {title: 'Post'});
});

router.post('/', function(req, res, next) {
});

router.get('/:id', function(req, res, next) {
});

router.put('/:id', function(req, res, next) {
});

router.delete('/:id', function(req, res, next) {
});

module.exports = router;