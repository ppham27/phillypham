/*global  */
var expect = require('chai').expect;
var Promise = require('bluebird');
var http = require('http');
var url = require('url');
var request = require('request');
var qs = require('querystring');
var async = require('async');

var config = require('config');

describe('middleware', function() {  
  before(function(done) {
    this.siteUrl = 'http://localhost:8888';
    this.app = require('../../app');
    this.server = http.createServer(this.app);
    this.server.listen(8888);     
    this.app.once('ready', function() {
      done();
    });
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
  
  describe('user login', function() {    
    beforeEach(function(done) {
      var siteUrl = this.siteUrl;
      this.db = require('../../models');
      var db = this.db;
      db.sequelize.sync({force: true})
      .then(function() {        
        return db.loadFixtures(config.fixtures);        
      })
      .then(function() {
        done();
      });
    });        

    afterEach(function(done) {
      this.browser.url(url.resolve(this.siteUrl, 'logout'), function(err) {
        done(err);
      });
    });
    
    it('should log the admin in and display his privileges', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      browser.url(url.resolve(siteUrl, 'login'))
      .setValue('input[name="email"]', 'admin@admin.com')
      .setValue('input[name="password"]', 'password')
      .click('input[value="Login"]')
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/');
        return browser.getText('#topbar');
      })
      .then(function(text) {
        expect(text).to.match(/Hello, admin/);
        expect(text).to.match(/Application Settings/);
        return done();
      })
    });

    it('should log the power user in and display his privileges', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      browser.url(url.resolve(siteUrl, 'login'))
      .setValue('input[name="email"]', 'power@gmail.com')
      .setValue('input[name="password"]', 'powerpower')
      .click('input[value="Login"]')
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/');
        return browser.getText('#topbar');
      })
      .then(function(text) {
        expect(text).to.match(/Hello, power/);
        expect(text).to.match(/Post/);
        expect(text).to.not.match(/Application Settings/);
        return done();
      })
    });

    it('should reject bad credentials and flash error message', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      browser.url(url.resolve(siteUrl, 'login'))
      .setValue('input[name="email"]', 'standard@gmail.com')
      .setValue('input[name="password"]', 'wrongpassword')
      .click('input[value="Login"]')
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/login');
        return browser.getText('#flash');
      })
      .then(function(text) {
        expect(text).to.match(/invalid password/);
        return done();
      })
    });
    
    it('should redirect a user to his or her location before login', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      browser.url(url.resolve(siteUrl, 'post'))
      .click('a.topbar-link[href="/login"]')
      .setValue('input[name="email"]', 'moderator@gmail.com')
      .setValue('input[name="password"]', 'moderator')
      .click('input[value="Login"]')
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/post');
        done();
      });
    });

    it('should even on wrong email/password redirect you to your pre-login page', function(done) {
      var browser = this.browser;
      var siteUrl = this.siteUrl;
      browser.url(url.resolve(siteUrl, 'post'))      
      .click('a.topbar-link[href="/login"]')
      .setValue('input[name="email"]', 'moderator@gmail.com')
      .setValue('input[name="password"]', 'wrongpassword')
      .click('input[value="Login"]')
      .setValue('input[name="email"]', 'wrongusername@gmail.com')
      .setValue('input[name="password"]', 'moderator')
      .click('input[value="Login"]')
      .setValue('input[name="email"]', 'moderator@gmail.com')
      .setValue('input[name="password"]', 'moderator')
      .click('input[value="Login"]')
      .url()
      .then(function(res) {
        expect(url.parse(res.value).path).to.equal('/post');
        return done();
      });
    });
    
    describe('facebook', function() {
      before(function(done) {
        // make a new user that is not authorized
        var self = this;
        var userNames = ['New Unauthorized User', 'New Unauthorized User', 'New Unauthorized User',
                         'Random Random Random', 'Loves Lucy'];
        var accessTokenUrl = 'https://graph.facebook.com/oauth/access_token?client_id=' + 
          config.appKeys.facebook.clientID + 
          '&client_secret='+ config.appKeys.facebook.clientSecret +
          '&grant_type=client_credentials';
        request({url: accessTokenUrl},
                function(err, res, body) {
                  // create many users
                  self.accessToken = qs.parse(body).access_token;
                  var createNewUserUrl = url.resolve('https://graph.facebook.com',
                                                     '/v2.3/' + config.appKeys.facebook.clientID + '/accounts/test-users')
                  var newUserRequestFactory = function(name) {
                    var newUserRequest = function(cb) {
                      request.post({url: createNewUserUrl,
                                    form: {access_token: self.accessToken, name: name, installed: false},
                                    headers: {Accept: 'application/json'}
                                   },
                                   function(err, res, body) {
                                     var user = JSON.parse(body);
                                     expect(user.id).to.not.be.undefined;
                                     cb(err, user);
                                   });
                    }
                    return newUserRequest;
                  }
                  var newUserRequests = userNames.map(newUserRequestFactory);
                  // need to stagger request because facebook doesn't like too many requests a minute
                  async.series(newUserRequests,
                               function(err, results) {
                                 self.users = results;
                                   done(err);
                               });
                });
      });
      
      after(function(done) {
        var self = this;
        var asyncDeleteRequests = self.users.map(function(user) {
                                    var deleteUserRequest = function(cb) {
                                      var deleteUserUrl = url.resolve('https://graph.facebook.com',
                                                                      '/v2.3/' + user.id)
                                      request.del({url: deleteUserUrl,
                                                   form: {access_token: self.accessToken},
                                                   headers: {Accept: 'application/json'}},
                                                  function(err, res, body) {
                                                    var message = JSON.parse(body);
                                                    expect(message.success).to.be.true;
                                                    cb(err, message);
                                                  });
                                    }
                                    return deleteUserRequest;
                                  });
        async.parallel(asyncDeleteRequests,
                       function(err, results) {                         
                         done(err);
                       });
      });

      it('should log in newly created user', function(done) {
        var user = this.users[3];
        var browser = this.browser;
        var siteUrl = this.siteUrl;
        var db = this.db;
        browser.click('a.topbar-link[href="/login"]')
        .click('#facebook-button')
        .setValue('#email', user.email)
        .setValue('#pass', user.password)
        .click('input[name="login"]')
        .pause(1000)
        .click('button[name="__CONFIRM__"]')
        .pause(2000)
        .then(function() {
          return browser.getText('#topbar');        
        })
        .then(function(text) {
          expect(text).to.match(/Hello, Random Random Random/);
          return true;
        })
        .then(function() {
          db.User.findOne({where: {displayName: 'Random Random Random'}})
          .then(function(user) {
            expect(user).to.not.be.null;
            done();
          });          
        });
      });

      it('should flash error message if a user cancels and let them try again', function(done) {
        var user = this.users[4];
        var browser = this.browser;
        var siteUrl = this.siteUrl;
        var db = this.db;
        browser.click('a.topbar-link[href="/login"]')
        .click('#facebook-button')
        .setValue('#email', user.email)
        .setValue('#pass', user.password)
        .click('input[name="login"]')
        .pause(1000)
        .click('button[name="__CANCEL__"]')
        .pause(2000)
        .url()
        .then(function(res) {
          expect(url.parse(res.value).path).to.equal('/login');        
          return browser.getText('#flash');
        })
        .then(function(text) {
          expect(text).to.match(/Permissions error/);
        })
        .click('#facebook-button') //try again
        .pause(1000)
        .click('button[name="__CONFIRM__"]')
        .pause(2000)
        .then(function() {
          return browser.getText('#topbar');        
        })
        .then(function(text) {
          expect(text).to.match(/Hello, Loves Lucy/);
          return true;
        })
        .then(function() {
          db.User.findOne({where: {displayName: 'Loves Lucy'}})
          .then(function(user) {
            expect(user).to.not.be.null;
            done();
          });          
        });        
      });
      
      it('should login pre-authorized user', function(done) {
        var browser = this.browser;
        var siteUrl = this.siteUrl;
        var db = this.db;
        browser.click('a.topbar-link[href="/login"]')
        .click('#facebook-button')
        .setValue('#email', 'rourzea_qinstein_1434678793@tfbnw.net')
        .setValue('#pass', 'password123')
        .click('input[name="login"]')
        .then(function() {
          db.User.findOne({where: {email: 'rourzea_qinstein_1434678793@tfbnw.net'}})
          .then(function(user) {
            expect(user).to.not.be.null;
            done();
          });
        });
      });      

      it('should redirect a user to their pre-login page', function(done) {
        var browser = this.browser;
        var siteUrl = this.siteUrl;
        var db = this.db;
        browser.url(url.resolve(siteUrl, 'post'))
        .click('a.topbar-link[href="/login"]')
        .click('#facebook-button')
        .setValue('#email', 'rourzea_qinstein_1434678793@tfbnw.net')
        .setValue('#pass', 'password123')
        .click('input[name="login"]')
        .url()
        .then(function(res) {          
          expect(url.parse(res.value).path).to.equal('/post');
          done();
        });
      });      

      it('should automatically rename users with the same display name', function(done) {
        var users = this.users.slice(0,3);
        var db = this.db;
        var siteUrl = this.siteUrl;
        var loginUsers = users.map(function(user) {                           
                           var browser = require('../support/browser')();
                           var loginUser =  function(cb) {
                             browser.init().url(siteUrl)
                             .click('a.topbar-link[href="/login"]')
                             .click('#facebook-button')
                             .setValue('#email', user.email)
                             .setValue('#pass', user.password)
                             .click('input[name="login"]')
                             .pause(1000)
                             .click('button[name="__CONFIRM__"]')
                             .pause(2000)
                             .click('#topbar a[href="/logout"]')
                             .end()
                             .then(function() {           
                               cb();
                             });
                           };
                           return loginUser;
                         });
        async.series(loginUsers,
                       function() {
                         db.User.count({where: {displayName: {like: 'New Unauthorized User%'}}})
                         .then(function(cnt) {
                           expect(cnt).to.equal(3);
                           done();
                         });
                       });  
      });                       
    });    
  });
});