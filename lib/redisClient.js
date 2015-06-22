var redis = require('redis');
var config = require('config');

var options = config.redis.password ? {auth_pass: config.redis.password} : undefined;
var redisClient = createClient();

module.exports = redisClient;

function createClient() {
  var client = redis.createClient(config.redis.port, 
                                  config.redis.host, 
                                  options);
  client.select(config.redis.database || 0);
  // make a client copy
  client.createClient = createClient;
  return client;
}