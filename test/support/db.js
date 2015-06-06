var Sequelize = require('Sequelize');
var config = require('config');
var sequelize = new Sequelize(config.sequelize.database,
                              config.sequelize.username,
                              config.sequelize.password,
                              {
                                host: config.sequelize.host,
                                dialect: 'sqlite',
                                storage: ':memory:',
                                logging: false
                              });

var db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
module.exports = db;
