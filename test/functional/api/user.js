var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire =  require('proxyquire');
var path = require('path');
var http = require('http');
var url = require('url');
var request = require('request');
var config = require('config');
var random = require('../../lib/random');
var transporter = require('../../lib/smtpTransporter');


describe('user apis', function() {  
  before(function(done) { 
    proxyquire('../../routes/user',
               {'../lib/middleware/authorize': function(options) {
                  return function(req, res, next) {
                    next();
                  }
                }});    
    sinon.stub(random, 'token').returns('simpleToken');
    sinon.stub(transporter, 'sendMail', function(mailOptions, callback) {
      callback(null, true);      
    });
    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app');
    this.db = require('../../models');
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    if (this.app.isReady) {
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {        
        return db.loadFixtures(config.fixtures);        
      })
      .then(function() {
        done();
      });
    } else {
      this.app.once('ready', function() {
        done();
      });    
    }
  });

  beforeEach(function(done) {
    this.browser = require('../support/browser')(); 
    this.browser.init()
    .url(this.siteUrl)
    .then(function() {
      done();
    });
  });
  
  afterEach(function(done) {
    this.browser.end()
    .then(function() {
      done();
    });
  });

  after(function(done) {
    random.token.restore(); 
    transporter.sendMail.restore();
    this.server.close(function(err) {
      done(err);
    });
  });

  it('should visit', function(done) {
    var browser = this.browser;
    browser.url(url.resolve(this.siteUrl, 'user/admin'))
    .pause(3000)
    .then(function() {
      done();
    });
  });
});
