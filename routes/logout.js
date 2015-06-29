var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  req.logout();
  res.redirect('back');
});

module.exports = router;