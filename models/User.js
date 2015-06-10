var Promise = require('bluebird');


module.exports = function(sequelize, DataTypes) {
  return sequelize.define("User", {
    displayName: {type: DataTypes.STRING, field: 'display_name', unique: true, notNull: true, len: [1,15]},
    email: {type: DataTypes.STRING, unique: true, allowNull: true, isEmail: true},
    salt: {type: DataTypes.STRING, defaultValue: null},
    password: {type: DataTypes.STRING, defaultValue: null},
    familyName: {type: DataTypes.STRING, defaultValue: null, field: 'family_name'},
    givenName: {type: DataTypes.STRING, defaultValue: null, field: 'given_name'},
    middleName: {type: DataTypes.STRING, defaultValue: null, field: 'middle_name'},
    photoUrl: {type: DataTypes.STRING, defaultValue: null, field: 'photo_url', allowNull: true, isUrl: true},
    facebookId: {type: DataTypes.STRING, defaultValue: null, field: 'facebook_id'},
    googleId: {type: DataTypes.STRING, defaultValue: null, field: 'google_id'}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.User.belongsTo(db.UserGroup, {foreignKey: {fieldName: 'userGroupId', field: 'user_group_id', allowNull: false}, 
                                                               constraints: true, onDelete: 'CASCADE'});
                              db.User.belongsToMany(db.Role, {through: db.UserRole});
                            }
                          }, 
                            instanceMethods: {
                              hasPermission: function(permission) {                                
                                var db = require('./index');
                                var user = this;
                                return db.Role.find({where: {name: permission}})
                                       .then(function(role) {
                                         return Promise.all([user.hasRole(role), 
                                                             user.getUserGroup()
                                                             .then(function(userGroup) {
                                                               return userGroup.hasRole(role);
                                                             })]);
                                       })
                                       .then(function(isPermitted) {
                                         return Promise.resolve(isPermitted.some(function(p) { return p; }));
                                       });
                              }
                            },
                            tableName: 'users',
                            hooks: {
                              beforeValidate: function(user) {
                                user.salt = 'abc';
                                return Promise.resolve(user);
                              }
                            }});

}