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
                              }
                            },
                            hooks: {
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
                                if (post.published) post.publishedAt = new Date();
                                post.bodyHtml = converter.makeHtml(post.body);
                                return Promise.resolve(post);
                              }
                            }
                          });
}