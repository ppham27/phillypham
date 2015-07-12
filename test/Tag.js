var expect = require('chai').expect;
var Sequelize = require('sequelize');

describe('Tag', function() {
  beforeEach(function(done) {
    this.db = require('./support/db');
    this.Tag = this.db.sequelize.import('../models/Tag');
    this.Tag.sync({force: true}).then(function() {
      done();
    });
  });  

  it('should create a new and singularize tag by name', function(done)  {
    var self = this;
    self.Tag.findOrCreateByName(' aNiMaLs ')
    .spread(function(tag, created) {
      expect(created).to.be.true;
      expect(tag.name).to.equal('animal');
      return self.Tag.findOrCreateByName('Jesus')      
    })
    .spread(function(tag, created) {
      expect(created).to.be.true;
      expect(tag.name).to.equal('jesus');
      done();
    });
  });
});