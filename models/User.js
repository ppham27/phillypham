var Sequelize = require('sequelize');
var Promise = require('bluebird');
var bcrypt = require('bcrypt');
var converter = require('../lib/markdown').Converter;
var random = require('../lib/random');


module.exports = function(sequelize, DataTypes) {
  model = sequelize.define("User", {
    displayName: {type: DataTypes.STRING, field: 'display_name', unique: true, allowNull: false, 
                  validate: {len: {args: [1, 64], msg: 'username is too short'}}},
    email: {type: DataTypes.STRING, unique: true, allowNull: true,
            validate: {isEmail: {args: true, msg: 'email is address is not properly formatted'}}},
    emailVerified: {type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_verified'},
    salt: {type: DataTypes.STRING, allowNull: true},
    password: {type: DataTypes.STRING, allowNull: true, 
               validate: {len: {args: [8, 64], msg: 'password is too short'}}},
    familyName: {type: DataTypes.STRING, allowNull: true, field: 'family_name'},
    givenName: {type: DataTypes.STRING, allowNull: true, field: 'given_name'},
    middleName: {type: DataTypes.STRING, allowNull: true, field: 'middle_name'},
    photoUrl: {type: DataTypes.STRING, field: 'photo_url', defaultValue: '/images/default-profile.jpg'},
    biography: {type: DataTypes.TEXT, allowNull: true},
    biographyHtml: {type: DataTypes.TEXT, allowNull: true, field: 'biography_html'},
    facebookId: {type: DataTypes.STRING, unique: true, allowNull: true, field: 'facebook_id'},
    facebookUsername: {type: DataTypes.STRING, unique: true, allowNull: true, field: 'facebook_username'},
    googleId: {type: DataTypes.STRING, unique: true, allowNull: true, field: 'google_id'},
    twitterId: {type: DataTypes.STRING, unique: true, allowNull: true, field: 'twitter_id'}    
  },
                          { tableName: 'users',
                            hooks: {
                              beforeValidate: function(user) {
                                // user already exists, do nothing
                                if (user.id) return Promise.resolve(user);
                                var originalDisplayName = user.displayName;
                                function newNamePromise(displayName) {
                                  return user.constructor.findOne({where: {displayName: displayName}})
                                         .then(function(oldUser) {
                                           if (oldUser === null) return Promise.resolve(user);
                                           // 1 byte should be enough
                                           user.displayName = originalDisplayName + random.int(1);
                                           return newNamePromise(user.displayName);
                                         });
                                }
                                return newNamePromise(originalDisplayName);
                              },
                              beforeUpdate: beforeSave,
                              beforeCreate: beforeSave,
                              afterValidate: function(user) {
                                if (user.email) user.email = user.email.toLowerCase();
                                return user.hashPassword();
                              }
                            }});

  model.associate = function(db) {
                                db.User.belongsTo(db.UserGroup, {foreignKey: {fieldName: 'userGroupId', field: 'user_group_id', allowNull: false}, 
                                                                 constraints: true, onDelete: 'RESTRICT'});
                                db.User.hasMany(db.Project, {foreignKey: {fieldName: 'userId', field: 'user_id', allowNull: false}, 
                                                             constraints: true, onDelete: 'RESTRICT'});
                                db.User.hasMany(db.Post, {foreignKey: {fieldName: 'user_id', field: 'user_id', allowNull: false}, 
                                                          constraints: true, onDelete: 'RESTRICT'});
                                db.User.hasMany(db.Comment, {foreignKey: {fieldName: 'userId', field: 'user_id', allowNull: false}, 
                                                             constraints: true, onDelete: 'CASCADE'});
                                db.User.belongsToMany(db.Role, {through: db.UserRole});
                              }
  model.authenticate = function(email, password) {
    return this.findOne({where: {email: email}})
      .then(function(user) {
        if (!user) {
          return Promise.reject(new Sequelize.ValidationError('user does not exist'));
        } else {
          return new Promise(function(resolve, reject) {
            bcrypt.compare(password, user.password, function(err, res) {
              if (err) reject(err);
              if (res) return resolve(user);
              return reject(new Sequelize.ValidationError('invalid password'));
            });
          });
        }
      });
  }
  model.prototype.hasPermission = function(permission) {
    var db = require('./index');
    var user = this;
    return db.Role.find({where: {name: permission}})
      .then(function(role) {
        return Promise.all([user.hasRole(role),
                            user.getUserGroup()
                            .then(function(userGroup) {
                              return userGroup.hasRole(role);
                            })]);
      }).then(function(isPermitted) {
        return Promise.resolve(user.emailVerified && isPermitted.some(function(p) { return p; }));
      });
  }
  model.prototype.hashPassword = function() {
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
  return model;
}

function beforeSave(user) {
  if (user.biography) user.biographyHtml = converter.makeHtml(user.biography);
  return Promise.resolve(user);  
}
