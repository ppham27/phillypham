'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.sequelize.query("ALTER TABLE posts ADD COLUMN title_body_tsvector tsvector")
           .then(function() {
             return queryInterface.sequelize.query("UPDATE posts SET title_body_tsvector=setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', body), 'B')")
           })
           .then(function() {
             return queryInterface.sequelize.query("CREATE INDEX IF NOT EXISTS title_body_search_idx ON posts USING gin(title_body_tsvector)")
           });
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
     */
    return queryInterface.sequelize.query("DROP INDEX title_body_search_idx")
           .then(function() {
             return queryInterface.sequelize.query("ALTER TABLE posts DROP title_body_tsvector");
           })
  }
};
