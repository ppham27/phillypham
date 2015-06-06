var redis = require('redis');
var config = require('config');

var options = config.redis.password ? {auth_pass: config.redis.password} : undefined;
var redisClient = redis.createClient(config.redis.port, config.redis.host, options);
redisClient.select(config.redis.database);
module.exports = redisClient;
