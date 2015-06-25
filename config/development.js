var fs = require('fs');
var path = require('path');
var helper = require(__dirname + '/helper');
var defaultConfig = require('./default.js');

var sequelizeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))[process.env.NODE_ENV];

var config = { 
  siteUrl: 'http://localhost:3000',
  redis: helper.parseSqlUrl('redis://h:password@127.0.0.1:6379'),
  sequelize: helper.parseSequelizeConfig(sequelizeConfig),
  appKeys: {
    facebook: JSON.parse(fs.readFileSync(path.join(__dirname, 'facebookDevelopment.json'), 'utf8')),
    // an object with two keys: clientID and clientSecret
    google: JSON.parse(fs.readFileSync(path.join(__dirname, 'google.json'), 'utf8')).appKey,
    sweetCaptcha: JSON.parse(fs.readFileSync(path.join(__dirname, 'sweetCaptcha.json'), 'utf8'))
  },
  smtpOptions: JSON.parse(fs.readFileSync(path.join(__dirname, 'smtp.json'), 'utf8'))
}

config.redis.database = 2;
config.fixtures = defaultConfig.fixtures;
config.fixtures.push({model: 'User', data: {displayName: 'power', password: 'powerpower', email: 'power@gmail.com', emailVerified: true, UserGroup: {name: 'power'}}});
config.fixtures.push({model: 'User', data: {displayName: 'standard', password: 'standard', email: 'standard@gmail.com', emailVerified: true, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'unverified', password: 'unverified', email: 'phil@phillypham.com', emailVerified: false, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'moderator', password: 'moderator', email: 'moderator@gmail.com', emailVerified: true, UserGroup: {name: 'moderator'}}});

module.exports = config;
