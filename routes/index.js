var express = require('express');
var router = express.Router();

var db = require('../models');


router.use(require('./blog'));
router.use('/login', require('./login'));
router.use('/register', require('./register'));
router.use('/logout', require('./logout'));
router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/blog', require('./blog'));
router.use('/post', require('./post'));

module.exports = router;
