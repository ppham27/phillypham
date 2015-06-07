var fs = require('fs');
var helper = require(__dirname + '/helper');

var sequelizeConfig = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'))[process.env.NODE_ENV];

var config = { 
  redis: {
    port: 6379,
    host: '127.0.0.1',
    database: 3,
    password: 'password'
  },
  sequelize: helper.parseSequelizeConfig(sequelizeConfig)
}

module.exports = config;

