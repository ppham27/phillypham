var express = require('express');
var router = express.Router();
var passport = require('../lib/passport');

router.get('/', require('../lib/middleware/preLogin'), function(req, res, next) {
  res.render('login', {title: 'Login'});
});

router.post('/', passport.authenticate('local', {failureRedirect: '/login',
                                                 failureFlash: true}),
            require('../lib/middleware/postLogin'));

module.exports = router;