var express = require('express');
var router = express.Router();

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.get('/', function(req, res, next) {
  res.render('settings', {title: 'Application Settings'});
});

router.put('/', authorize({role: 'settings_manager'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  Object.keys(req.body).forEach(function(key) {
    if (key !== 'defaultUserGroupId' && key !== 'blog:postsPerPage' && key !== 'blog:tags') req.body[key] = req.body[key].trim();
  });  
  if (req.body['blog:tags']) req.body['blog:tags'] = JSON.stringify(req.body['blog:tags']);
  db.ApplicationSettings.set(req.body);  
  db.ApplicationSettings.save()
  .then(function() {
    res.json({success: true});
  })
  .catch(function(err) {
    // save failed, revert
    db.ApplicationSettings.sync()
    .then(function() {
      res.json({error: err.toString()});
    });
  });
});

module.exports = router;
