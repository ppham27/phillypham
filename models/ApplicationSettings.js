// TODO: publish changes and subscribe to changes

var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;

// singleton to store app settings in redis
module.exports = function(redisClient) {
  var ApplicationSettings = new Object();  
  var eventEmitter = new EventEmitter();
  var data;
  redisClient.exists('applicationSettings', function(err, doesExist) {
    if(err) throw err;
    if (doesExist) {
      redisClient.hgetall('applicationSettings', function(err, d) {
        if(err) throw err;
        Object.defineProperty(ApplicationSettings, '_data',
                              {value: d,
                               enumerable: false
                              });
        data = ApplicationSettings._data;
        for (var key in data) defineGetterAndSetter(key);
        eventEmitter.emit('ready');
      });
    } else {
      Object.defineProperty(ApplicationSettings, '_data',
                            {value: {},
                             enumerable: false
                            });
      data = ApplicationSettings._data;      
      eventEmitter.emit('ready');
    }
  }); 

  ApplicationSettings.on = function(event, callback) {
    eventEmitter.on(event, callback);
  }
  
  function defineGetterAndSetter(k) {
    Object.defineProperty(ApplicationSettings, k, {
      get: function() { return data[k]; },
      set: function(val) { data[k] = val; },
      enumerable: true,
      configurable: true
    });
  }
  
  ApplicationSettings.build = function(obj) {
    ApplicationSettings.reset();
    ApplicationSettings.set(obj);
  }

  ApplicationSettings.reset = function(obj) {
    Object.keys(ApplicationSettings).forEach(function(key) {
      delete ApplicationSettings[key];
    });
    data = ApplicationSettings._data = {};    
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

  ApplicationSettings.save = function() {
    return new Promise(function(resolve, reject) {
                         // verify that required properties exist here
                         if (ApplicationSettings.sidebarPhotoUrl && 
                             ApplicationSettings.sidebarInfo &&
                             ApplicationSettings.defaultUserGroupId) {
                           redisClient.hmset('applicationSettings', 
                                             ApplicationSettings,
                                             function(err) {
                                               if (err) reject(err);
                                               resolve();
                                             });
                         } else if (!ApplicationSettings.sidebarPhotoUrl) {
                           reject(new TypeError('Sidebar photo url must be a nonempty string'));
                         } else if (!ApplicationSettings.sidebarInfo) {
                           reject(new TypeError('Sidebar info must be a nonempty string'));
                         } else if (!ApplicationSettings.defaultUserGroupId) {
                           reject(new TypeError('User Group must be set'));
                         }                         
                       });
  }
  Object.defineProperties(ApplicationSettings,
                          {on: {enumerable: false},
                           build: {enumerable: false},
                           set: {enumerable: false},
                           reset: {enumerable: false},
                           save: {enumerable: false}});
  return ApplicationSettings;
};

