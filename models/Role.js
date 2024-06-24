module.exports = function(sequelize, DataTypes) {
  model = sequelize.define('Role', {
    name: {type: DataTypes.STRING, unique: true, allowNull: false},
    description: {type: DataTypes.TEXT}
  }, {tableName: 'roles'});
  model.associate = function(db) {
                              db.Role.belongsToMany(db.User, {through: db.UserRole});
                              db.Role.belongsToMany(db.UserGroup, {through: db.UserGroupRole});
  }
  return model;
};
