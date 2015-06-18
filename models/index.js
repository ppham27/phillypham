'use strict';

var fs        = require('fs');
var EventEmitter = require('events').EventEmitter;
var path      = require('path');
var Sequelize = require('sequelize');
var redis     = require('redis');
var basename  = path.basename(module.filename);
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var env = process.env.NODE_ENV;
var config    = require('config');
config.sequelize.define = {underscored: true};
var sequelize = new Sequelize(config.sequelize.database, 
                              config.sequelize.username, 
                              config.sequelize.password, 
                              config.sequelize);
var redisClient = require('../lib/redisClient');
var db        = new EventEmitter();
db.isReady = false;

var sequelizeModels = ['User', 'UserGroup', 'Role', 'UserRole', 'UserGroupRole'];

sequelizeModels
.forEach(function(modelName) {
  var model = sequelize['import'](path.join(__dirname, modelName + '.js'));
  db[model.name] = model;
});

sequelizeModels.forEach(function(modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelizeModels = sequelizeModels;
db.sequelize = sequelize;
db.Sequelize = Sequelize;

sequelize.sync({force: env === 'development' || env === 'test'})
.then(function() {
  if ({force: env === 'development' || env === 'test'}) {
    redisClient.flushdb(function(err, isSuccess) {
      if (err) throw err;
      db.ApplicationSettings = require('./ApplicationSettings')(redisClient);
      db.ApplicationSettings.on('ready', function() {
        db.ApplicationSettings.set(config.applicationSettings).save();
        db.isReady = true;
        db.emit('ready');
      });
    });
  } else {
    db.ApplicationSettings = require('./ApplicationSettings')(redisClient);
    redisClient.exists('applicationSettings', function(err, doesExist) {
      if (!doesExist) {
        db.ApplicationSettings.on('ready', function() {
          db.ApplicationSettings.set(config.applicationSettings).save();
          db.isReady = true;
          db.emit('ready');
        });
      }
    });
  }  
});

db.loadFixtures = function(fixtures, force) {
  if (!db.isReady) throw new Error('database is not yet ready');
  return require('../lib/loadFixtures')(db, fixtures, force);
}

module.exports = db;
