var fs = require('fs');
var path = require('path');
var helper = require(__dirname + '/helper');
var defaultConfig = require('./default.js');

var sequelizeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))[process.env.NODE_ENV];

var config = { 
  siteUrl: 'http://localhost:8888',
  redis: {
    port: 6379,
    host: '127.0.0.1',
    database: 3,
    password: 'password'
  },
  appKeys: {
    facebook: {
      clientID: '392392270953950',
      clientSecret: 'f98afb1786d320ed3465211c66efa47d'
    }
  },
  applicationSettings: { title: 'PhillyPham',                         
                         defaultUserGroupId: 2,
                         sidebarTitle: 'About Me',
                         sidebarPhotoUrl: 'picture.jpg',
                         sidebarInfo: 'Hello, World!'
                       },
  sequelize: helper.parseSequelizeConfig(sequelizeConfig)
}

config.fixtures = defaultConfig.fixtures;
config.fixtures.push({model: 'User', data: {displayName: 'power', password: 'powerpower', email: 'power@gmail.com', emailVerified: true, UserGroup: {name: 'power'}}});
config.fixtures.push({model: 'User', data: {displayName: 'standard', password: 'standard', email: 'standard@gmail.com', emailVerified: true, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'unverified', password: 'unverified', email: 'phil@phillypham.com', emailVerified: false, UserGroup: {name: 'standard'}}});
config.fixtures.push({model: 'User', data: {displayName: 'moderator', password: 'moderator', email: 'moderator@gmail.com', emailVerified: true, UserGroup: {name: 'moderator'}}});

module.exports = config;

