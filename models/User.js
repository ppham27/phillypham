var Sequelize = require('sequelize');
var Promise = require('bluebird');
var bcrypt = require('bcrypt');


module.exports = function(sequelize, DataTypes) {
  return sequelize.define("User", {
    displayName: {type: DataTypes.STRING, field: 'display_name', unique: true, allowNull: false, 
                  validate: { len: [1,15]}},
    email: {type: DataTypes.STRING, unique: true, allowNull: false,
            validate: {isEmail: true}},
    emailVerified: {type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_verified'},
    salt: {type: DataTypes.STRING, defaultValue: null},
    password: {type: DataTypes.STRING, allowNull: true, 
               validate: {len: 8}},
    familyName: {type: DataTypes.STRING, defaultValue: null, field: 'family_name'},
    givenName: {type: DataTypes.STRING, defaultValue: null, field: 'given_name'},
    middleName: {type: DataTypes.STRING, defaultValue: null, field: 'middle_name'},
    photoUrl: {type: DataTypes.STRING, defaultValue: null, field: 'photo_url', allowNull: true, isUrl: true},
    facebookId: {type: DataTypes.STRING, defaultValue: null, field: 'facebook_id'},
    googleId: {type: DataTypes.STRING, defaultValue: null, field: 'google_id'}
  },
                          { tableName: 'users',
                            classMethods: {
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
                                         return Promise.resolve(user.emailVerified && isPermitted.some(function(p) { return p; }));
                                       });
                              },
                              hashPassword: function() {
                                var user = this;
                                // no password needs to be hashed
                                if (!user.password || user.salt) return Promise.resolve(user);
                                return (new Promise(function(resolve, reject) {
                                                      bcrypt.genSalt(12, function(err, salt) {
                                                        if (err) reject(err);
                                                        resolve(salt);
                                                      });
                                                    }))
                                       .then(function(salt) {
                                         user.salt = salt;
                                         return new Promise(function(resolve, reject) {
                                                              bcrypt.hash(user.password, salt, function(err, hash) {
                                                                if (err) reject(err);
                                                                resolve(hash);
                                                              });
                                                            });
                                       })
                                       .then(function(password) {
                                         user.password = password
                                         return Promise.resolve(user);
                                       }); 
                                
                              }
                            },
                            hooks: {
                              afterValidate: function(user) {
                                return user.hashPassword();
                              }
                            }});

}