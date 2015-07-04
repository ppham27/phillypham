var expect = require('chai').expect;
var redisClient = require('../../lib/redisClient');
var config = require('config');



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