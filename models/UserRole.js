// module.exports = function(sequelize, DataTypes) {
//   return sequelize.define("UserGroupRole",
//                           {id: {type: DataTypes.INTEGER, notNull: true, autoIncrement: true, primaryKey: true}},
//                           {tableName: 'user_group_roles'});
// }; 


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserRole',
                          {},
                          {tableName: 'user_roles'});
};