var Sequelize = require('sequelize');
var Promise = require('bluebird');
var inflection = require('inflection');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Tag', {
    name: {type: DataTypes.STRING, unique: true, allowNull: false,
           validate: {len: {args: [1, 64], msg: 'tag cannot be empty string'}}}
  },
                          {
                            tableName: 'tags',
                            classMethods: {
                              associate: function(db) {
                                db.Tag.belongsToMany(db.Post, {through: db.PostTag});
                              },
                              findOrCreateByName: function(name) {
                                var tagName = makeTagName(name);
                                return this.findOrCreate({where: {name: tagName}});
                              }
                            },
                            hooks: {
                              beforeUpdate: function(tag) {                                
                                tag.name = makeTagName(tag.name);
                                return Promise.resolve(tag);
                              },
                              beforeCreate: function(tag) {
                                tag.name = makeTagName(tag.name);
                                return Promise.resolve(tag);
                              }
                            }                            
                          });
}

function makeTagName(name) {
  name = name.trim().toLowerCase();
  if (name === 'jesus') return name;
  if (/\.js$/.test(name)) return name;
  if (name === 'css') return name;
  return inflection.singularize(name);
}