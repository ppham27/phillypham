var Promise = require('bluebird');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define("User", {
    displayName: {type: DataTypes.STRING, field: 'display_name', unique: true, notNull: true},
    email: {type: DataTypes.STRING, unique: true},
    salt: {type: DataTypes.STRING, defaultValue: null},
    password: {type: DataTypes.STRING, defaultValue: null},
    familyName: {type: DataTypes.STRING, defaultValue: null, field: 'family_name'},
    givenName: {type: DataTypes.STRING, defaultValue: null, field: 'given_name'},
    middleName: {type: DataTypes.STRING, defaultValue: null, field: 'middle_name'},
    photoUrl: {type: DataTypes.STRING, defaultValue: null, field: 'photo_url'},
    facebookId: {type: DataTypes.STRING, defaultValue: null, field: 'facebook_id'},
    googleId: {type: DataTypes.STRING, defaultValue: null, field: 'google_id'}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.User.belongsTo(db.UserGroup, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
                              db.User.belongsToMany(db.Role, {through: db.UserRole});
                            }
                          }, tableName: 'users',
                            hooks: {
                              beforeValidate: function(user) {
                                user.salt = 'abc';
                                return Promise.resolve(user);
                              }
                            }});

}