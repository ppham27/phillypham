var express = require('express');
var router = express.Router();
var Promise = require('bluebird');

var authorize = require('../lib/middleware/authorize');

var db = require('../models');

router.get('/create', authorize({role: 'project_manager'}), function(req, res, next) {
  db.Project.findAll({where: {published: false}})
  .then(function(projects) {
    res.render('projects/edit', {title: 'Project Editor', unpublishedProjects: projects});
  });
})

router.post('/create', authorize({role: 'project_manager'}), function(req, res, next) {  
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  trimProject(req.body);
  req.body.userId = req.user.id;
  db.Project.create(req.body)
  .then(function(project) {
    req.flash('info', 'Project has been created!');
    res.json({success: true,
              redirect: true,
              redirectLink: project.published ? '/projects' : '/projects/edit/' + encodeURIComponent(project.title) });
  })
  .catch(function(err) {
           var error = [];
           if (err.errors) {
             err.errors.forEach(function(err) {
               error.push(err.message);
             });
           } else {
             error.push(err.message);
           }
           res.json({error: error});
         });;  

})

router.delete('/edit/:title', authorize({role: 'project_manager'}), function(req, res, next) {
  var isPublished;
  db.Project.findOne({where: {title: req.params.title}})
  .then(function(project) {
    if (project === null) {
      return Promise.reject(new Error('project does not exist'));
    } else {
      isPublished = project.published;
      return project.destroy();
    }    
  })
  .then(function() {
    req.flash('info', req.params.title + ' was destroyed!');
    res.json({success: true, redirect: true, 
              redirectLink: isPublished ? '/projects' : '/projects/create' });
  })
  .catch(function(err) {
    next(err);
  });
});

router.put('/edit/:title', authorize({role: 'project_manager'}), function(req, res, next) {
  if (!req.is('json')) return res.json({error: 'only json requests are accepted'});
  db.Project.findOne({where: {title: req.params.title}})
  .then(function(project) {
    if (project === null) {
      return Promise.reject(new Error('project does not exist'));
    } else {
      var updates = req.body;
      trimProject(updates);
      return project.update(updates);
    }
  })
  .then(function(project) {
    req.flash('info', req.params.title + ' was updated!');
    if (req.params.title !== project.title) req.flash('info', 'project title was changed');
    if (req.body.published === true) req.flash('info', project.title + ' was published!');
    if (req.body.published === false) req.flash('info', project.title + ' was unpublished!');
    res.json({success: true, redirect: true, 
              redirectLink: project.published ? '/projects' : '/projects/edit/' + encodeURIComponent(project.title) });
  })
  .catch(function(err) {
           var error = [];
           if (err.errors) {
             err.errors.forEach(function(err) {
               error.push(err.message);
             });
           } else {
             error.push(err.message);
           }
           res.json({error: error});           
         });
});

router.get('/edit/:title', authorize({role: 'project_manager'}), function(req, res, next) {
  Promise.join(db.Project.findOne({where: {title: req.params.title},
                                   include: [{model: db.User, attributes: ['id', 'displayName']}]}),
               db.Project.findAll({where: {published: false}}))  
  .spread(function(project, projects) {
    if (!project) return next(new Error('Project does not exist'));
    res.render('projects/edit', {title: 'Project Editor', temporaryProject: project, update: true,
                                 unpublishedProjects: projects});
  });
})


router.get('/', function(req, res, next) {
  db.Project.findAll({where: {published: true}, 
                      order: 'published_at DESC',
                      include: [{model: db.User, attributes: ['id', 'displayName']}]})
  .then(function(projects) {
    res.render('projects/index', {title: 'Projects', projects: projects});
  });
})

router.get('/:title', function(req, res, next) {
  db.Project.findOne({where: {title: req.params.title},
                      include: [{model: db.User, attributes: ['id', 'displayName', 'facebookUsername']}]})
  .then(function(project) {
    if (!project) return next(new Error('Project does not exist'));
    if (!project.published && (!req.user || !req.session.roles['project_manager'])) return next(new Error('Project is not published'));
    res.render('projects/view', {title: project.title, project: project});
  });
})


module.exports = router;


function trimProject(project) {
  Object.keys(project).forEach(function(key) {
    if (key !== 'published') {
      project[key] = project[key].trim();
      project[key] = project[key] || null;
    }
  });
}