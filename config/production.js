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
    },
    sweetCaptcha: {
      id: process.env.SWEET_CAPTCHA_ID,
      key: process.env.SWEET_CAPTCHA_KEY,
      secret: process.env.SWEET_CAPTCHA_SECRET
    }
  },
  smtpOptions: {
    fromDomain: 'phillypham.com',
    host: process.env.SMTP_HOST,
    secure: true,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }    
  }
}
config.redis.database = 0;

module.exports = config;


