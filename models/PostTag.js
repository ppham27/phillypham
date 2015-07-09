module.exports = function(sequelize, DataTypes) {
  return sequelize.define('PostTag',
                          {},
                          {tableName: 'post_tags'});
};