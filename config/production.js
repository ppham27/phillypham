var fs = require('fs');
var helper = require(__dirname + '/helper');

var sequelizeConfig = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'))[process.env.NODE_ENV];

var config = {  
  siteUrl: 'http://www.phillypham.com',
  secret: process.env.SECRET,
  rsaPublicKey: process.env.RSA_PUBLIC_KEY,
  rsaPrivateKey: process.env.RSA_PRIVATE_KEY,
  redis: helper.parseSqlUrl(process.env.REDISCLOUD_URL),
  sequelize: helper.parseSequelizeConfig(sequelizeConfig),
  appKeys: {
    facebook: {
      clientID: process.env.FB_CLIENT_ID,
      clientSecret: process.env.FB_CLIENT_SECRET
    },
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET      
    }
  }
}
config.redis.database = 0;

module.exports = config;


