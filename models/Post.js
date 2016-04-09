var Sequelize = require('sequelize');
var Promise = require('bluebird');
var converter = require('../lib/markdown').Converter;

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Post', {
    title: {type: DataTypes.STRING, unique: true, allowNull: false,
            validate: {len: {args: [1, 128], msg: 'title cannot be empty string'}}},
    body: {type: DataTypes.TEXT, allowNull: false,
           validate: {notEmpty: {args: true, msg: 'body cannot be empty'}}},
    bodyHtml: {type: DataTypes.TEXT, field: 'body_html'},
    photoUrl: {type: DataTypes.STRING, allowNull: true, defaultValue: null, field: 'photo_url',
               validate: {isUrl: {args: true, msg: 'photo URL is not properly formatted'}}},
    photoLink: {type: DataTypes.STRING, allowNull: true, defaultValue: null, field: 'photo_link',
                validate: {isUrl: {args: true, msg: 'photo link is not properly formatted'}}},
    published: {type: DataTypes.BOOLEAN, defaultValue: false},
    publishedAt: {type: DataTypes.DATE, allowNull: true, field: 'published_at', defaultValue: null}
  },
                          {
                            tableName: 'posts',
                            classMethods: {
                              associate: function(db) {
                                db.Post.belongsTo(db.User, {foreignKey: {fieldName: 'user_id', field: 'user_id', allowNull: false}, 
                                                            constraints: true, onDelete: 'RESTRICT'});
                                db.Post.hasMany(db.Comment, {foreignKey: {fieldName: 'postId', field: 'post_id', allowNull: false}, 
                                                             constraints: true, onDelete: 'CASCADE'});
                                db.Post.belongsToMany(db.Tag, {through: db.PostTag});
                              },
                              addTSVector: function(db) {
                                return db.sequelize.query("ALTER TABLE posts ADD COLUMN title_body_tsvector tsvector")
                                       .then(function() {
                                         return db.sequelize.query("UPDATE posts SET title_body_tsvector=setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', body), 'B')")
                                       })
                                       .then(function() {
                                         return db.sequelize.query("CREATE INDEX IF NOT EXISTS title_body_search_idx ON posts USING gin(title_body_tsvector)")
                                       })
                                       .then(function() {
                                         return db.sequelize.query("CREATE OR REPLACE FUNCTION posts_trigger() RETURNS trigger AS $$ begin new.title_body_tsvector := setweight(to_tsvector('english', new.title), 'A') || setweight(to_tsvector('english', new.body), 'B'); return new; end $$ LANGUAGE plpgsql");
                                       })
                                       .then(function() {
                                         return db.sequelize.query("CREATE TRIGGER posts_update BEFORE INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE posts_trigger()");
                                       }).catch(function(err) {
                                         console.info(err);
                                         return Promise.resolve(true);
                                       });
                              },
                              search: function(db, tsquery) {                                
                                var query = tsquery.indexOf(' ') == -1 ? "to_tsquery('english','" + tsquery + "')" : "plainto_tsquery('english','" + tsquery + "')";
                                return db.sequelize.query("SELECT id, title, ts_rank_cd(title_body_tsvector," + query + ",1) AS rank, ts_headline('english', title || ' ' || body," + query + ", 'MaxWords=100') AS headline FROM posts WHERE published AND title_body_tsvector @@ " + query + " ORDER BY rank DESC, id DESC",
                                                          { model: db.Post });
                              }
                            },
                            hooks: {
                              afterSync: function(Post) {                                
                                return Post.classMethods.addTSVector(Post);
                              },
                              beforeValidate: function(post) {
                                if (post.photoLink && !post.photoUrl) {
                                  return Promise.reject(new Sequelize.ValidationError('photo URL must exist for there to be a photo link', 
                                                                                      [new Sequelize.ValidationErrorItem('photo URL must exist for there to be a photo link')]));
                                } else {
                                  return Promise.resolve(post);
                                }
                              },
                              beforeUpdate: function(post) {
                                if (post.changed('published')) post.publishedAt = new Date();
                                post.bodyHtml = converter.makeHtml(post.body);
                                return Promise.resolve(post);
                              },
                              beforeCreate: function(post) {
                                if (post.published && !post.publishedAt) post.publishedAt = new Date();
                                post.bodyHtml = converter.makeHtml(post.body);
                                return Promise.resolve(post);
                              }
                            }
                          });
}