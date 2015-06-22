var sequelizeFixtures = require('sequelize-fixtures');
var Promise = require('bluebird');

module.exports = function(db, fixtures, force) {
  if (force) return db.sequelize.sync({force: true}).then(function() { 
                      return sequelizeFixtures.loadFixtures(fixtures, db);
                    });  
  // otherwise only fill on empty database
  var promiseArray = db.sequelizeModels.map(function(modelName) {
                       return db[modelName].count()
                              .then(function(count) {            
                                return count === 0 ? Promise.resolve(count) : Promise.reject(new Error('database is not empty'));
                              });
                     });
  
  return Promise.all(promiseArray).then(function (counts) {  
           return sequelizeFixtures.loadFixtures(fixtures, db);
         })
         .catch(function(err) {
                  // silently fail, expected behavior is to do nothing when data is not empty and force is not true
                });
}