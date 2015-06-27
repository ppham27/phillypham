var express = require('express');
var router = express.Router();
var passport = require('../lib/passport');
var config = require('config');
var sweetCaptcha = require('../lib/sweetCaptcha');
var postLogin = require('../lib/middleware/postLogin');

router.get('/', require('../lib/middleware/preLogin'), function(req, res, next) {
  sweetCaptcha.api('get_html', function(err, html)  {
    if (err) next(err);  
    res.render('register', {title: 'Registration', 
                            temporaryUser: req.session.temporaryUser || {},
                            update: false,
                            captcha: html});
  });
});

router.post('/', passport.authenticate('localRegistration', {failureRedirect: '/register', failureFlash: true}),
            postLogin);

router.get('/verify/:hash', passport.authenticate('emailVerify', {failureRedirect: '/', 
                                                                  failureFlash: true,
                                                                  successFlash: true}),
           postLogin);


module.exports = router;