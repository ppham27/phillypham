var Sequelize = require('sequelize');
var Promise = require('bluebird');

module.exports = function(sequelize, DataTypes) {
  model = sequelize.define('UserGroup', {
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
    description: {type: DataTypes.TEXT}
  },
                           { tableName: 'user_groups'});

  model.associate = function(db) {
                              db.UserGroup.hasMany(db.User, {foreignKey: {fieldName: 'userGroupId', field: 'user_group_id', allowNull: false},
                                                             constraints: true, onDelete: 'RESTRICT'});
                              // don't delete user groups that still have users attached to them
                              db.UserGroup.belongsToMany(db.Role, {through: db.UserGroupRole});
  }
  return model;
}
