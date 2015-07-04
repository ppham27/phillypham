var express = require('express');
var router = express.Router();

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.get('/', function(req, res, next) {
  res.render('settings', {title: 'Application Settings'});
});

router.put('/', authorize({role: 'settings_manager'}), function(req, res, next) {
  db.ApplicationSettings.set(req.body);  
  db.ApplicationSettings.save()
  .then(function() {
    res.json({success: true});
  })
  .catch(function(err) {
    // save failed revert
    db.ApplicationSettings.sync()
    .then(function() {
      res.json({error: err.toString()});
    });
  });
});

module.exports = router;
