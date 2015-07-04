var express = require('express');
var router = express.Router();

var db = require('../models');


router.use(require('./blog'));
router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'Contact Me' });
});
router.use('/login', require('./login'));
router.use('/register', require('./register'));
router.use('/logout', require('./logout'));
router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/blog', require('./blog'));
router.use('/post', require('./post'));
router.use('/projects', require('./projects'));
router.use('/settings', require('./settings'));

module.exports = router;
