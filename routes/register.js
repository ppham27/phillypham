var express = require('express');
var router = express.Router();
var passport = require('../lib/passport');

router.get('/', require('../lib/middleware/preLogin'), function(req, res, next) {
  res.render('register', {title: 'Registration', 
                          temporaryUser: req.session.temporaryUser || {},
                          update: false});
});

router.post('/', passport.authenticate('localRegistration', {failureRedirect: '/register', failureFlash: true}),
            require('../lib/middleware/postLogin'));


module.exports = router;