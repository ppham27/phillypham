var express = require('express');
var router = express.Router();
var db = require('../models');
var passport = require('../lib/passport');

router.get('/facebook', 
           require('../lib/middleware/preLogin'),
           passport.authenticate('facebook', 
                                 { scope: ['public_profile', 'email']}));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login', 
                                                                     failureFlash: true}),
           require('../lib/middleware/postLogin'));

module.exports = router;