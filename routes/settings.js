var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('settings', {title: 'Application Settings'});
});

router.put('/', function(req, res, next) {
  res.json({});
});

module.exports = router;
