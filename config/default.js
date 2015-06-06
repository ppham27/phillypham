module.exports = {
  secret: 'keyboard cat',
  redis: {
    port: 6379,
    host: '127.0.0.1',
    password: null,
    database: 1
  },
  sequelize: {
    dialect: 'postgres',
    username: 'username',
    password: 'password',
    host: 'host',
    port: 'port',
    database: 'database',
    url: 'postgres://username:password@host:port/database'
  }
}