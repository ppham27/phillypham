var expect = require('chai').expect;
var redisClient = require('../../lib/redisClient');
var config = require('config');
var FakeRequest = require('../support/fakeRequest');
var settingsRoutes = require('../../routes/settings');

describe('application settings sync', function() {
  beforeEach(function(done) {
    var self = this;
    redisClient.flushdb(function(err) {
      self.ApplicationSettings = require('../../models/ApplicationSettings')(redisClient);      
      done(err);
    });
  });

  it('should sync with redis', function(done) {
    var self = this;
    redisClient.hmset('applicationSettings', {a: 1, b: 2, c: 3}, function() {
      self.ApplicationSettings.sync()
      .then(function() {
        expect(self.ApplicationSettings.a).to.equal('1');
        expect(self.ApplicationSettings.b).to.equal('2');
        expect(self.ApplicationSettings.c).to.equal('3');
        done();
      });
    });
  });

  it('should delete its old keys on sync', function(done) {
    var ApplicationSettings = this.ApplicationSettings;
    ApplicationSettings.set(config.applicationSettings);
    ApplicationSettings.save()
    .then(function() {
      expect(ApplicationSettings.title).to.equal('PhillyPham');
      redisClient.multi()
      .del('applicationSettings')
      .hmset('applicationSettings', {a: 1, b: 2, c: 3})
      .exec(function() {
        ApplicationSettings.sync()
        .then(function(a) {       
          expect(ApplicationSettings.a).to.equal('1');
          expect(ApplicationSettings.b).to.equal('2');
          expect(ApplicationSettings.c).to.equal('3');   
          expect(ApplicationSettings.title).to.be.undefined;
          done();
        });
      });
    });
  });
});


describe('application settings should stay in sync', function() {
  before(function(done) {
    this.redisClient1 = redisClient;
    this.redisClient2 = redisClient.createClient();
    var self = this;
    redisClient.flushdb(function(err) {
      self.ApplicationSettings1 = require('../../models/ApplicationSettings')(self.redisClient1);
      self.ApplicationSettings2 = require('../../models/ApplicationSettings')(self.redisClient2);
      if (self.ApplicationSettings2.isReady && self.ApplicationSettings1.isReady) done();
      self.ApplicationSettings2.on('ready', function() {
        if (self.ApplicationSettings1.isReady) done();
        self.ApplicationSettings1.on('ready', function() {
          done();
        });
      });
    });
  });
  
  beforeEach(function(done) {
    var self = this;
    redisClient.flushdb(function(err) {
      self.ApplicationSettings1.reset();
      self.ApplicationSettings2.reset();  
      done();
    });
  });

  it('should have start in sync', function(done) {
    var self = this;
    self.ApplicationSettings2.once('message', function() {
      expect(self.ApplicationSettings1).to.have.property('title', 'PhillyPham');
      expect(self.ApplicationSettings1).to.have.property('sidebar:title', 'About Me');
      expect(self.ApplicationSettings1).to.have.property('sidebar:info', 'Hello, World!');
      expect(self.ApplicationSettings2).to.have.property('title', 'PhillyPham');
      expect(self.ApplicationSettings2).to.have.property('sidebar:title', 'About Me');
      expect(self.ApplicationSettings2).to.have.property('sidebar:info', 'Hello, World!');
      done();
    });
    self.ApplicationSettings1.set(config.applicationSettings);
    self.ApplicationSettings1.save()
  });

  it('should update one another', function(done) {
    var self = this;
    self.ApplicationSettings2.once('message', function() {
      self.ApplicationSettings1.once('message', function() {
        // make sure properties stay stable
        expect(self.ApplicationSettings1).to.have.property('title', 'PhillyPham');
        expect(self.ApplicationSettings1).to.have.property('sidebar:title', 'About Me');
        expect(self.ApplicationSettings1).to.have.property('sidebar:info', 'Hello, World!');
        expect(self.ApplicationSettings2).to.have.property('title', 'PhillyPham');
        expect(self.ApplicationSettings2).to.have.property('sidebar:title', 'About Me');
        expect(self.ApplicationSettings2).to.have.property('sidebar:info', 'Hello, World!');
        // check new properties
        expect(self.ApplicationSettings1).to.have.property('sidebar:photoUrl', 'newPicture.png');
        expect(self.ApplicationSettings2).to.have.property('sidebar:photoUrl', 'newPicture.png');
        expect(self.ApplicationSettings1).to.have.property('defaultUserGroupId', 4);
        expect(self.ApplicationSettings2).to.have.property('defaultUserGroupId', 4);
        done();
      });
      expect(self.ApplicationSettings2).to.have.property('defaultUserGroupId', 2);
      expect(self.ApplicationSettings2).to.have.property('sidebar:photoUrl', 'picture.jpg');
      self.ApplicationSettings2.defaultUserGroupId = 4;
      self.ApplicationSettings2['sidebar:photoUrl'] = 'newPicture.png';
      self.ApplicationSettings2.save();
    });    
    self.ApplicationSettings1.set(config.applicationSettings);
    self.ApplicationSettings1.save();    
  });

  it('should start empty', function() {
    expect(Object.keys(this.ApplicationSettings1).length).to.equal(0);
    expect(Object.keys(this.ApplicationSettings2).length).to.equal(0);
  });
});

describe('Application Settings update routes', function() {
  beforeEach(function(done) {
    var self = this;
    this.handle = settingsRoutes.stack.filter(function(handle) {
                     return handle.route.path === '/' && handle.route.methods.put;
                   });
    this.handle = this.handle[0].route.stack[1].handle;
    this.db = require('../../models');
    if (this.db.isReady) {      
      resetRedis();
    } else {
      this.db.once('ready', function() {
        resetRedis();
      });
    }
    function resetRedis() {
      self.db.ApplicationSettings.set(config.applicationSettings)
      .save()
      .then(function() {
        self.ApplicationSettings = require('../../models/ApplicationSettings')(redisClient);      
        self.ApplicationSettings.once('ready', function() {
          done();
        });      
      });
    }
  });
 
  after(function(done) {
    this.db.ApplicationSettings.set(config.applicationSettings)
    .save()
    .then(function() {      
      done();      
    });
  });
  
  it('should update the application settings', function(done) {
    var self = this;
    var req = new FakeRequest(config.applicationSettings, true, {is: ['json'], accepts: ['json']});
    expect(self.ApplicationSettings.title).to.equal('PhillyPham');
    expect(self.ApplicationSettings['sidebar:info']).to.equal('Hello, World!');
    req.body['title'] = 'new title';
    req.body['sidebar:title'] = 'new sidebar title';
    req.body['sidebar:info'] = 'new bio';
    req.body['sidebar:photoUrl'] = 'pic.jpg';
    req.body['blog:postsPerPage'] = 10;
    req.body['blog:tags'] = [["c","d"],["a","b"]];
    req.body['blog:authors'] = [["Admin","Admin"]];
    var res = {json: function(json) {
                 expect(json.success).to.be.true;
                 // make sure updates propagate
                 setTimeout(function() {
                   expect(self.ApplicationSettings.title).to.equal('new title');
                   expect(self.ApplicationSettings['sidebar:title']).to.equal('new sidebar title');
                   expect(self.ApplicationSettings['sidebar:info']).to.equal('new bio');
                   expect(self.ApplicationSettings['sidebar:infoHtml']).to.equal('<p>new bio</p>');
                   expect(self.ApplicationSettings['sidebar:photoUrl']).to.equal('pic.jpg');
                   expect(self.ApplicationSettings['blog:postsPerPage']).to.equal(10);
                   expect(self.ApplicationSettings['blog:tags']).to.equal('[["c","d"],["a","b"]]');
                   expect(self.ApplicationSettings['blog:authors']).to.equal('[["Admin","Admin"]]');
                   done();
                 }, 100);
               }};
    this.handle(req, res);
  });
  
  it('should deny updates when sidebar:title is empty', function() {
    var self = this;
    var req = new FakeRequest(config.applicationSettings, true, {is: ['json'], accepts: ['json']});
    expect(self.ApplicationSettings['sidebar:title']).to.equal('About Me');
    req.body['sidebar:title'] = '';
    var res = {json: function(json) {
                 expect(json.success).to.be.undefined;
                 expect(json.error).to.match(/must be a nonempty string/);
               }};
    this.handle(req, res);
  });

  it('should deny updates when sidebar:info is empty', function() {
    var self = this;
    var req = new FakeRequest(config.applicationSettings, true, {is: ['json'], accepts: ['json']});
    expect(self.ApplicationSettings['sidebar:info']).to.equal('Hello, World!');
    req.body['sidebar:info'] = '';
    var res = {json: function(json) {
                 expect(json.success).to.be.undefined;
                 expect(json.error).to.match(/must be a nonempty string/);
               }};
    this.handle(req, res);
  });
});