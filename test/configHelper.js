var expect = require('chai').expect;
var helper = require('../config/helper.js');

var databaseUrl = process.env.DATABASE_URL;

describe('config helper', function() {

  before(function() {
    databaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgres://u:p@h:5432/asdfas'
  });
  after(function() {
    process.env.DATABASE_URL = databaseUrl;
  });

  it('should parse sql url properly', function() {
    var pgFullUrl = 'postgres://yofs:5xj_mtovc8u_J@ec2-54.compute-1.amazonaws.com:5432/asdfas';
    var matchFull = helper.parseSqlUrl(pgFullUrl);    
    expect(matchFull.dialect).to.equal('postgres');
    expect(matchFull.username).to.equal('yofs');
    expect(matchFull.password).to.equal('5xj_mtovc8u_J');
    expect(matchFull.host).to.equal('ec2-54.compute-1.amazonaws.com');
    expect(matchFull.port).to.equal('5432');
    expect(matchFull.database).to.equal('asdfas');

    var pgNoPassUrl = 'postgres://yofs@ec2-54.compute-1.amazonaws.com:5432/asdfas'
    var matchNoPass = helper.parseSqlUrl(pgNoPassUrl);    
    expect(matchNoPass.dialect).to.equal('postgres');
    expect(matchNoPass.username).to.equal('yofs');
    expect(matchNoPass.password).to.be.null;
    expect(matchNoPass.host).to.equal('ec2-54.compute-1.amazonaws.com');
    expect(matchNoPass.port).to.equal('5432');
    expect(matchNoPass.database).to.equal('asdfas');

    var pgNoUserNoPassUrl = 'postgres://ec2-54.compute-1.amazonaws.com:5432/asdfas'
    var matchNoUserNoPass = helper.parseSqlUrl(pgNoUserNoPassUrl);    
    expect(matchNoUserNoPass.dialect).to.equal('postgres');
    expect(matchNoUserNoPass.username).to.be.null;
    expect(matchNoUserNoPass.password).to.be.null;
    expect(matchNoUserNoPass.host).to.equal('ec2-54.compute-1.amazonaws.com');
    expect(matchNoUserNoPass.port).to.equal('5432');
    expect(matchNoUserNoPass.database).to.equal('asdfas');

    var redisUrl = 'redis://h:p7v8o@ec2-54.compute-1.amazonaws.com:7099'
    var matchRedis = helper.parseSqlUrl(redisUrl);    
    expect(matchRedis.dialect).to.equal('redis');
    expect(matchRedis.username).to.equal('h');
    expect(matchRedis.password).to.equal('p7v8o');
    expect(matchRedis.host).to.equal('ec2-54.compute-1.amazonaws.com');
    expect(matchRedis.port).to.equal('7099');
    expect(matchRedis.database).to.be.null;
  });

  it('should properly create url', function() {
    var config0 = helper.parseSequelizeConfig({
      "username": null,
      "password": null,
      "database": "phillypham_development",
      "host": "127.0.0.1",
      "dialect": "postgres",
      "port": 5432});
    expect(config0.url).to.equal('postgres://127.0.0.1:5432/phillypham_development');
    var config1 = helper.parseSequelizeConfig({
      "username": 'user',
      "password": null,
      "database": "phillypham_development",
      "host": "127.0.0.1",
      "dialect": "postgres",
      "port": 5432});
    expect(config1.url).to.equal('postgres://user@127.0.0.1:5432/phillypham_development');
    var config2 = helper.parseSequelizeConfig({
      "username": 'user',
      "password": 'password',
      "database": "phillypham_development",
      "host": "127.0.0.1",
      "dialect": "postgres",
      "port": 5432});
    expect(config2.url).to.equal('postgres://user:password@127.0.0.1:5432/phillypham_development');
  });

  it ('should know to parse url instead', function() {
    var config = helper.parseSequelizeConfig({"use_env_variable": "DATABASE_URL"});
    expect(config.dialect).to.equal('postgres');
    expect(config.username).to.equal('u');
    expect(config.password).to.equal('p');
    expect(config.host).to.equal('h');
    expect(config.port).to.equal('5432');
    expect(config.database).to.equal('asdfas'); 
  });
});