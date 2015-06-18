var fs = require('fs');
var helper = require(__dirname + '/helper');

var sequelizeConfig = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'))[process.env.NODE_ENV];

var config = {  
  secret: process.env.SECRET,
  redis: helper.parseSqlUrl(process.env.REDIS_URL),
  sequelize: helper.parseSequelizeConfig(sequelizeConfig)
}
config.redis.database = 0;

module.exports = config;


