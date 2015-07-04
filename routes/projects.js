var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

var db = require('../models');

router.get('/create', function(req, res, next) {
  db.Project.findAll({where: {published: false}})
  .then(function(projects) {
    res.render('projects/edit', {title: 'Projects', unpublishedProjects: projects});
  });
})

router.post('/create', function(req, res, next) {  
  
})

router.get('/edit/:title', function(req, res, next) {
  Promise.join(db.Project.findOne({where: {title: req.params.title}}),
               db.Project.findAll({where: {published: false}}))  
  .spread(function(project, projects) {
    if (!project) return next(new Error('Project does not exist'));
    res.render('projects/edit', {title: 'Projects', temporaryProject: project, update: true,
                                 unpublishedProjects: projects});
  });
})


router.get('/', function(req, res, next) {
  db.Project.findAll({where: {published: true}})
  .then(function(projects) {
    res.render('projects/index', {title: 'Projects', projects: projects});
  });
})

router.get('/:title', function(req, res, next) {
  db.Project.findOne({where: {title: req.params.title}})  
  .then(function(project) {
    if (!project) return next(new Error('Project does not exist'));
    res.render('projects/view', {project: project});
  });
})



module.exports = router;