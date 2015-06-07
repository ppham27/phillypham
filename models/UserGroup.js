var Promise = require('bluebird');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserGroup', {
    name: {type: DataTypes.STRING, unique: true, notNull: true},
    description: {type: DataTypes.TEXT}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.UserGroup.hasMany(db.User);
                              // don't delete user groups that still have users attached to them
                              db.UserGroup.hook('beforeDestroy',
                                                function(userGroup) {
                                                  return userGroup.getUsers()
                                                         .then(function(users) {
                                                           if (users.length === 0) return Promise.resolve(userGroup);
                                                           return Promise.reject(new Error('user group must have no users on destroy'));
                                                         });                                                  
                                                });
                              db.UserGroup.belongsToMany(db.Role, {through: db.UserGroupRole});
                            }
                          }, tableName: 'user_groups'});
}