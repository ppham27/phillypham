module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Role', {
    name: {type: DataTypes.STRING, unique: true, notNull: true},
    description: {type: DataTypes.TEXT}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.Role.belongsToMany(db.User, {through: db.UserRole});
                              db.Role.belongsToMany(db.UserGroup, {through: db.UserGroupRole});
                            }
                          },
                            tableName: 'roles'});
};