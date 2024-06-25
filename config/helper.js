
exports.parseSqlUrl = function(url) {
  var config = {};
  var match = url.match(/(\w+):\/\/(\w+[:@])?(\w+@)?([a-zA-Z0-9\-\.]+):([0-9]+)\/?(\w+)?/);
  config.dialect = match[1];
  config.username = match[2] || null;
  if (config.username) config.username = config.username.slice(0,-1);
  config.password = match[3] || null;
  if (config.password) config.password = config.password.slice(0,-1);
  config.host = match[4];
  config.port = match[5];
  config.database = match[6] || null;
  config.url = url;
  if (config.url.includes("rds.amazonaws.com")) {
    config.dialectOptions = {}
    config.dialectOptions.ssl = {}
    config.dialectOptions.ssl.require = true
    config.dialectOptions.ssl.rejectUnauthorized = false
  }
  return config;
}

exports.parseSequelizeConfig = function(obj) {
  if (Object.keys(obj).length > 1) {
    obj.url = obj.dialect + '://';
    if (obj.username) obj.url += obj.username;
    if (obj.password) obj.url += ':' + obj.password;
    if (obj.username) obj.url += '@';
    obj.url += obj.host;
    if (obj.port) obj.url += ':' + obj.port;
    obj.url += '/' + obj.database;
    return obj;
  } else {
    var config = {};
    var url = process.env[obj.use_env_variable];
    return exports.parseSqlUrl(url);
  }
}
