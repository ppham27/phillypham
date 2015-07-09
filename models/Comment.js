var Sequelize = require('sequelize');
var Promise = require('bluebird');
var converter = require('../lib/markdown').Converter;

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Comment', {
    body: {type: DataTypes.TEXT, allowNull: false,
           validate: {notEmpty: {args: true, msg: 'body cannot be empty'}}},
    bodyHtml: {type: DataTypes.TEXT, field: 'body_html'},
    published: {type: DataTypes.BOOLEAN, defaultValue: false},
    publishedAt: {type: DataTypes.DATE, allowNull: true, field: 'published_at', defaultValue: null}
  },
                          {
                            tableName: 'comments',
                            classMethods: {
                              associate: function(db) {
                                db.Comment.belongsTo(db.Comment, {foreignKey: {fieldName: 'commentId', field: 'comment_id', allowNull: true, defaultValue: null}, 
                                                                  constraints: true, onDelete: 'CASCADE'});
                                db.Comment.hasMany(db.Comment, {foreignKey: {fieldName: 'commentId', field: 'comment_id', allowNull: true, defaultValue: null}, 
                                                                constraints: true, onDelete: 'CASCADE'});
                                db.Comment.belongsTo(db.Post, {foreignKey: {fieldName: 'postId', field: 'post_id', allowNull: false}, 
                                                               constraints: true, onDelete: 'CASCADE'});
                                db.Comment.belongsTo(db.User, {foreignKey: {fieldName: 'userId', field: 'user_id', allowNull: false}, 
                                                               constraints: true, onDelete: 'CASCADE'});
                              }
                            },
                            hooks: {
                              beforeUpdate: function(comment) {                                
                                if (comment.changed('published')) comment.publishedAt = new Date();
                                comment.bodyHtml = converter.makeHtml(comment.body);
                                return Promise.resolve(comment);
                              },
                              beforeCreate: function(comment) {
                                if (comment.published) comment.publishedAt = new Date();
                                comment.bodyHtml = converter.makeHtml(comment.body);
                                return Promise.resolve(comment);
                              }
                            }                            
                          });
}
