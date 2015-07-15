var express = require('express');
var router = express.Router();

var db = require('../models');

router.get('/:commentId', function(req, res, next) {
  db.Comment.findById(req.params.commentId)
  .then(function(comment) {
    res.json(comment);
  });
});

module.exports = router;

