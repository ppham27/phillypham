'use strict';

var fs        = require('fs');
var path      = require('path');
var Sequelize = require('sequelize');
var redis     = require('redis');
var basename  = path.basename(module.filename);
var env       = process.env.NODE_ENV || 'development';
var config    = require(__dirname + '/../config/config.json')[env];
config.define = {underscored: true};
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var redisClient = require('../lib/redisClient');
var db        = {};

var sequelizeModels = ['User', 'UserGroup', 'Role', 'UserRole', 'UserGroupRole'];

sequelizeModels
.forEach(function(modelName) {
  var model = sequelize['import'](path.join(__dirname, modelName + '.js'));
  db[model.name] = model;
});

Object.keys(db).forEach(function(modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

sequelize.sync({force: env === 'development' || env === 'test'});
if ({force: env === 'development' || env === 'test'}) {
  redisClient.flushdb(function(err, isSuccess) {
    if (err) throw err;
    db.ApplicationSettings = require('./ApplicationSettings')(redisClient);
    db.ApplicationSettings.on('ready', function() {
      db.ApplicationSettings.set({sidebarPhotoUrl: 'test.jpg',
                                  sidebarInfo: 'Hello, World!'}).save();
    });
  });
} else {
  db.ApplicationSettings = require('./ApplicationSettings')(redisClient);
  redisClient.exists('applicationSettings', function(err, doesExist) {
    if (!doesExist) {
      db.ApplicationSettings.on('ready', function() {
        db.ApplicationSettings.set({sidebarPhotoUrl: 'test.jpg',
                                    sidebarInfo: 'Hello, World!'}).save();      
      });
    }
  });
}


module.exports = db;
