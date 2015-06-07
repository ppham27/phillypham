var expect = require('chai').expect;


describe('associations', function() {
  beforeEach(function(done) {
    this.db = require('../../models');
    this.db.on('ready', done);
  });
  describe('User belongs to UserGroup', function() {
    it('should enforce that every user belongs to a group', function() {
    });
  });
});

