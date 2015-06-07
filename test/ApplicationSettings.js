var expect = require('chai').expect;
var redis = require('fakeredis');
var sinon = require('sinon');
var Promise = require('bluebird');
var validator = require('validator');

describe('ApplicationSettings on fresh database', function() {
  beforeEach(function(done) {
    var self = this;
    this.redisClient = redis.createClient('redisDb');
    this.redisClient.flushdb(function(err, isSuccess) {
      self.ApplicationSettings = require('../models/ApplicationSettings')(self.redisClient);
      self.ApplicationSettings.on('ready', done);
    });
  });

  after(function(done) {
    this.redisClient.flushdb(function(err, isSuccess) {
      done();
    });
  });

  it('should have no data', function() {
    expect(Object.keys(this.ApplicationSettings._data)).to.be.empty;
  });

  it('should define getters and setters', function() {
    var data = {'a': 1, 'b': 2, 'c': 3};
    this.ApplicationSettings.set(data);
    // getters
    expect(this.ApplicationSettings._data).is.deep.equal(data);
    expect(this.ApplicationSettings.a).to.equal(1);
    expect(this.ApplicationSettings['a']).to.equal(1);
    expect(this.ApplicationSettings.b).to.equal(2);
    expect(this.ApplicationSettings['b']).to.equal(2);
    expect(this.ApplicationSettings.c).to.equal(3);
    expect(this.ApplicationSettings['c']).to.equal(3);
    
    // setters
    this.ApplicationSettings.a = 5
    expect(this.ApplicationSettings.a).to.equal(5);
    expect(this.ApplicationSettings['a']).to.equal(5);
    this.ApplicationSettings['b'] = 4
    expect(this.ApplicationSettings.b).to.equal(4);
    expect(this.ApplicationSettings['b']).to.equal(4);
    this.ApplicationSettings.c = 6
    expect(this.ApplicationSettings['c']).to.equal(6);
    this.ApplicationSettings['c'] = 7
    expect(this.ApplicationSettings.c).to.equal(7);
    expect(this.ApplicationSettings._data).is.deep.equal({'a': 5, 'b': 4, 'c': 7});
  });

  it('should only accept objects and strings for keys', function() {    
    expect(this.ApplicationSettings.set.bind(null, 5, 3)).to.throw(TypeError, /object or string/);
  });

  it('should only set a single value', function() {        
    this.ApplicationSettings.set();
    this.ApplicationSettings.set('a', 5);
    expect(this.ApplicationSettings.a).to.equal(5);
    this.ApplicationSettings.set('b', 7);
    expect(this.ApplicationSettings.b).to.equal(7);
    this.ApplicationSettings.set('a', 4);
    expect(this.ApplicationSettings.a).to.equal(4);
  });

  it('should only have data attributes be enumerable', function() {
    var data = {'a': 3, 'b': 7, 'c': 4};
    this.ApplicationSettings.build(data);
    for (var key in this.ApplicationSettings) {
      // console.log(key);
      expect(data).to.have.property(key);
    }
    this.ApplicationSettings.set('d', 9);
    data.d = true;
    for (var key in this.ApplicationSettings) {
      expect(data).to.have.property(key);
    }    
  });

  it('should reset on build settings', function() {
    this.ApplicationSettings.build({'a': 3, 'b': 7, 'c': 4});
    expect(this.ApplicationSettings.b).to.equal(7);
    this.ApplicationSettings.build({'a': 1, 'b': 2});
    expect(this.ApplicationSettings.a).to.equal(1);
    expect(this.ApplicationSettings.c).to.be.undefined;
  });

  it('should save', function(done) {
    this.ApplicationSettings.set({defaultUserGroupId: 1,
                                  sidebarPhotoUrl: 'test.jpg',
                                  sidebarInfo: 'Hello, World!'});
    var stub = sinon.stub(this.redisClient, 'hmset', 
                          function(key, obj, callback) {
                            expect(key).to.equal('applicationSettings');
                            expect(obj.sidebarPhotoUrl).to.equal('test.jpg');
                            setTimeout(callback, 100);
                          });
    this.ApplicationSettings.save().then(done);
    this.redisClient.hmset.restore();
  });

  it('should not save', function(done) {
    this.ApplicationSettings.set({sidebarPhotoUrl: 'test.jpg'});
    this.ApplicationSettings.save().catch(TypeError,
                                          function(err) {
                                            expect(err).to.be.instanceOf(TypeError);
                                            expect(err.toString()).to.match(/nonempty/);
                                            done();
                                          });

  });
});

describe('ApplicationSettings on existing database', function() {
  before(function() {
    this.redisClient = redis.createClient('redisDb');
    sinon.stub(this.redisClient, 'exists',
               function(key, callback) {
                 expect(key).to.equal('applicationSettings');
                 setTimeout(callback, 300, undefined, true);
               });    
    sinon.stub(this.redisClient, 'hgetall',
               function(key, callback) {
                 expect(key).to.equal('applicationSettings');
                 setTimeout(callback, 300, undefined, {defaultUserGroupId: 1,
                                                       sidebarPhotoUrl: 'test.jpg',
                                                       sidebarInfo: 'Hello, World!'});
               });
  });
  beforeEach(function(done) {
    this.ApplicationSettings = require('../models/ApplicationSettings.js')(this.redisClient);
    this.ApplicationSettings.on('ready', done);
  });
  after(function() {
    this.redisClient.exists.restore();
    this.redisClient.hgetall.restore();
  });

  it('should have values prepopulated', function() {
    expect(this.ApplicationSettings.sidebarPhotoUrl).to.equal('test.jpg');
    expect(this.ApplicationSettings.sidebarInfo).to.equal('Hello, World!');
  });

  it('should take additional settings', function() {
    this.ApplicationSettings.set('a', 5);
    expect(this.ApplicationSettings.a).to.equal(5);
  });
  
  it('should be able to be modified and saved', function(done) {
    this.ApplicationSettings.sidebarPhotoUrl = 'example.png';
    var stub = sinon.stub(this.redisClient, 'hmset', 
                          function(key, obj, callback) {
                            expect(key).to.equal('applicationSettings');
                            expect(obj.sidebarPhotoUrl).to.equal('example.png');
                            setTimeout(callback, 100);
                          });
    this.ApplicationSettings.save().then(done);
    this.redisClient.hmset.restore();    
  });

  it('should reject invalid changes', function(done) {
    this.ApplicationSettings.sidebarPhotoUrl = '';
    this.ApplicationSettings.save().catch(TypeError,
                                          function(err) {
                                            expect(err).to.be.instanceOf(TypeError);
                                            expect(err.toString()).to.match(/nonempty/);
                                            done();
                                          });
  });  
});

