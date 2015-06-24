var express = require('express');
var router = express.Router();
var db = require('../models');
var passport = require('../lib/passport');
var preLogin = require('../lib/middleware/preLogin');
var postLogin = require('../lib/middleware/postLogin');

router.get('/facebook', 
           preLogin,
           passport.authenticate('facebook', 
                                 { scope: ['public_profile', 'email']}));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login', 
                                                                     failureFlash: true}),
           postLogin);

router.get('/google', 
           preLogin,
           passport.authenticate('google', 
                                 { scope: ['profile', 
                                           'email']}));

router.get('/google/callback', 
           passport.authenticate('google', 
                                 { failureRedirect: '/login', 
                                   failureFlash: true}),
           postLogin);

module.exports = router;