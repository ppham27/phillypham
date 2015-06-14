var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) next(err);
    res.redirect('back');
  });
});

module.exports = router;