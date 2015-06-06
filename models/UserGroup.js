module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserGroup', {
    name: {type: DataTypes.STRING, unique: true, notNull: true},
    description: {type: DataTypes.TEXT}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.UserGroup.hasMany(db.User);
                              db.UserGroup.belongsToMany(db.Role, {through: db.UserGroupRole});
                            }
                          }, tableName: 'user_groups'});
}