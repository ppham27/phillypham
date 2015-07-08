var Sequelize = require('sequelize');
var Promise = require('bluebird');
var converter = require('../lib/markdown').Converter;

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Project', {
    title: {type: DataTypes.STRING, unique: true, allowNull: false,
            validate: {len: {args: [1, 128], msg: 'title cannot be empty string'}}},
    summary: {type: DataTypes.TEXT, allowNull: false},
    summaryHtml: {type: DataTypes.TEXT, allowNull: true, field: 'summary_html'},
    description: {type: DataTypes.TEXT, allowNull: false},
    descriptionHtml: {type: DataTypes.TEXT, allowNull: true, field: 'description_html'},
    url: {type: DataTypes.STRING, allowNull: true, defaultValue: null,
          validate: {isUrl: {args: true, msg: 'url is not properly formatted'}}},
    photoUrl: {type: DataTypes.STRING, defaultValue: '/images/GitHub-Mark.png'},
    thumbnail: {type: DataTypes.STRING, defaultValue: '/images/GitHub-Mark.png'},
    published: {type: DataTypes.BOOLEAN, defaultValue: false},
    publishedAt: {type: DataTypes.DATE, allowNull: true, field: 'published_at', defaultValue: null}
  },
                          { classMethods: {
                            associate: function(db) {
                              db.Project.belongsTo(db.User, {foreignKey: {fieldName: 'userId', field: 'user_id', allowNull: false}, 
                                                             constraints: true, onDelete: 'RESTRICT'});
                            }
                          }, tableName: 'projects',
                            hooks: {
                              beforeUpdate: function(project) {
                                if (project.changed('published')) project.publishedAt = new Date();
                                if (project.description) project.descriptionHtml = converter.makeHtml(project.description);
                                if (project.summary) project.summaryHtml = converter.makeHtml(project.summary);                                
                                return Promise.resolve(project);
                              },
                              beforeCreate: function(project) { 
                                if (project.published) project.publishedAt = new Date();
                                if (project.description) project.descriptionHtml = converter.makeHtml(project.description);
                                if (project.summary) project.summaryHtml = converter.makeHtml(project.summary);            
                                return Promise.resolve(project);
                              }
                            }});
}


