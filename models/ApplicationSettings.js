var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var converter = require('../lib/markdown').Converter;

// singleton to store app settings in redis
module.exports = function(redisClient) {
  var ApplicationSettings = new Object();  
  ApplicationSettings.isReady = false;
  Object.defineProperty(ApplicationSettings, '_data',
                        {value: {},
                         enumerable: false
                        });  
  var data = ApplicationSettings._data; // just a convenience variable
  var subscriberClient = redisClient.createClient();
  var eventEmitter = new EventEmitter();

  subscriberClient.on('message', function(channel, message) {    
    // sync    
    data = ApplicationSettings._data = JSON.parse(message);
    for (var oldKey in ApplicationSettings) {
      if (!(oldKey in data)) delete ApplicationSettings[oldKey];
    }
    for (var newKey in data) defineGetterAndSetter(newKey);
    eventEmitter.emit('message', channel, message);
  });

  ApplicationSettings.on = function(event, callback) {
    eventEmitter.on(event, callback);
  }

  ApplicationSettings.once = function(event, callback) {
    eventEmitter.once(event, callback);
  }

  ApplicationSettings.emit = function() {
    eventEmitter.emit.apply(eventEmitter, arguments)
  }
  
  ApplicationSettings.build = function(obj) {
    ApplicationSettings.reset();
    ApplicationSettings.set(obj);
  }

  ApplicationSettings.reset = function(obj) {
    Object.keys(ApplicationSettings).forEach(function(key) {
      delete ApplicationSettings[key];
      delete ApplicationSettings._data[key];
    });
    data = ApplicationSettings._data; 
  }

  ApplicationSettings.set = function(k, v) {
    if (k === undefined) return ApplicationSettings;
    if (k instanceof Object) {
      for (var key in k) {
        if (!ApplicationSettings.hasOwnProperty(key)) defineGetterAndSetter(key);
        data[key] = k[key];
      }      
    } else if (typeof k === 'string') {
      if (!ApplicationSettings.hasOwnProperty(k)) defineGetterAndSetter(k);
      data[k] = v;
    } else  {
      throw new TypeError('k must be and object or string but got ' + k);
    }
    return ApplicationSettings;
  }  

  ApplicationSettings.validate = function() {
    if (!ApplicationSettings['sidebar:title']) 
      return new TypeError('Sidebar title must be a nonempty string');
    if (!ApplicationSettings['sidebar:photoUrl']) 
      return new TypeError('Sidebar photo url must be a nonempty string');
    if (!ApplicationSettings['sidebar:info'] || !ApplicationSettings['sidebar:infoHtml'])
      return new TypeError('Sidebar info must be a nonempty string');
    if (!ApplicationSettings.defaultUserGroupId) 
      return new TypeError('User Group must be set');
    // add timestamp check here...
    return true;  
  }

  ApplicationSettings.save = function() {
    var validation = ApplicationSettings.validate();
    if (!(validation instanceof Error)) {
      return new Promise(function(resolve, reject) {
                           if (!('updatedAt' in ApplicationSettings)) defineGetterAndSetter('updatedAt');
                           ApplicationSettings.updatedAt = (new Date()).toISOString();
                           ApplicationSettings['sidebar:infoHtml'] = converter.makeHtml(ApplicationSettings['sidebar:info']);
                           redisClient.hmset('applicationSettings', 
                                             ApplicationSettings,
                                             function(err) {
                                               if (err) reject(err);
                                               resolve(redisClient.publish('applicationSettings', 
                                                                           JSON.stringify(ApplicationSettings)));
                                             });
                         });
    } else {
      return Promise.reject(validation);
    }
  }

  ApplicationSettings.sync = function() {
    // sync with database
    ApplicationSettings.reset();
    return new Promise(function(resolve, reject) {
                         redisClient.hgetall('applicationSettings', function(err, d) {
                           if(err) reject(err);
                           ApplicationSettings.set(d);
                           for (var key in data) defineGetterAndSetter(key);
                           resolve(ApplicationSettings);
                         });
                       });
  }
  
  subscriberClient.on('subscribe', function(channel) {
    /* do this first? i'm just not going to worry about race conditions
     * since this is a personal blog
     * potential race issues:
     * 1. user made a change in application settings between the initial grab of data and subscription
     * 2. two users editing at the same time, check with timestamp?
     */
    redisClient.exists('applicationSettings', function(err, doesExist) {
      if(err) throw err;
      if (doesExist) {
        redisClient.hgetall('applicationSettings', function(err, d) {
          if(err) throw err;
          data = ApplicationSettings._data = d;
          for (var key in data) defineGetterAndSetter(key);

          ApplicationSettings.isReady = true;
          eventEmitter.emit('ready');
        });
      } else {      
        ApplicationSettings.isReady = true;
        eventEmitter.emit('ready');      
      }
    }); 
  });

  Object.defineProperties(ApplicationSettings,
                          {isReady: {enumerable: false},
                           on: {enumerable: false},
                           once: {enumerable: false},
                           emit: {enumerable: false},
                           validate: {enumerable: false},
                           build: {enumerable: false},
                           set: {enumerable: false},
                           reset: {enumerable: false},
                           save: {enumerable: false},
                           sync: {enumerable: false}});
  function defineGetterAndSetter(k) {
    if (!(k in ApplicationSettings)) {
      Object.defineProperty(ApplicationSettings, k, {
        get: function() { return data[k]; },
        set: function(val) { data[k] = val; },
        enumerable: true,
        configurable: true
      });
      return true;
    }
    return false;
  }
  subscriberClient.subscribe('applicationSettings');
  return ApplicationSettings;
};



