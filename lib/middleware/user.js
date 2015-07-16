var Promise = require('bluebird');


module.exports = function(req, res, next) {
  res.locals.user = req.user;
  if (!req.user || (req.session.roles && req.user.updated_at.toJSON() === req.session.roles.updatedAt)) {
    res.locals.roles = req.session.roles;
    next();
  } else {
    // build roles cache
    res.locals.roles = req.session.roles = {};
    Promise.all([req.user.getRoles()
                 .then(function(roles) {
                   roles.forEach(function(role) {
                     req.session.roles[role.name] = true;
                   })
                 }),
                 req.user.getUserGroup()
                 .then(function(userGroup) {
                   return userGroup.getRoles();
                 })
                 .then(function(roles) {
                   roles.forEach(function(role) {
                     req.session.roles[role.name] = true;
                   })
                 })])
    .then(function() {
      req.session.roles.updatedAt = req.user.updated_at.toJSON();
      next();
    });
  }
};