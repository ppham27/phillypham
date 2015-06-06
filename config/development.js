var fs = require('fs');
var path = require('path');
var helper = require(__dirname + '/helper');

var sequelizeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))[process.env.NODE_ENV];

var config = { 
  redis: helper.parseSqlUrl('redis://h:password@127.0.0.1:6379'),
  sequelize: helper.parseSequelizeConfig(sequelizeConfig)
}

config.redis.database = 2;

module.exports = config;
