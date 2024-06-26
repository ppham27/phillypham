var Sequelize = require('sequelize');
var Promise = require('bluebird');
var inflection = require('inflection');

module.exports = function(sequelize, DataTypes) {
  model = sequelize.define('Tag', {
    name: {type: DataTypes.STRING, unique: true, allowNull: false,
           validate: {len: {args: [1, 64], msg: 'tag cannot be empty string'}}}
  },
                          {
                            tableName: 'tags',
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
  model.associate = function(db) {
    db.Tag.belongsToMany(db.Post, {through: db.PostTag});
  }
  model.findOrCreateByName = function(name) {
    var tagName = makeTagName(name);
    return model.findOrCreate({where: {name: tagName}});
  }
  return model;
}

function makeTagName(name) {
  name = name.trim().toLowerCase();
  if (name === 'jesus') return name;
  if (/\.js$/.test(name)) return name;
  if (name === 'css') return name;
  if (name === 'meta') return name;
  if (name === 'combinatorics') return name;
  if (name === 'codeforces') return name;
  return inflection.singularize(name);
}
