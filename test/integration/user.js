var expect = require('chai').expect;
var sinon = require('sinon');

var config = require('config');
var userRoutes = require('../../routes/user');

var FakeRequest = require('../support/fakeRequest');


describe('user routes', function() {
  before(function(done) {
    this.db = require('../../models');
    if (this.db.isReady) done();
    this.db.once('ready', function() {
      done();
    });
  });
  
  beforeEach(function(done) {
    var db = this.db;
    db.sequelize.sync({force: true})
    .then(function() {
      return db.loadFixtures(config.fixtures);
    })
    .then(function() {
      done();
    });
  });

  describe('simple view', function() {
    it('should get user info', function(done) {
      var req = new FakeRequest({}, true, ['json']);
      req.params.displayName = 'admin';
      var res = {json: function(json) {
                   expect(json.displayName).to.equal('admin');
                   expect(json.email).to.equal('admin@admin.com');
                   done();
                 }};
      userRoutes.stack[0].route.stack[1].handle(req, res);
    });

    it('should get return an error', function(done) {
      var req = new FakeRequest({}, true, ['json']);
      req.params.displayName = 'does not exist user';
      var res = {json: function(json) {
                   expect(json.error).to.match(/does not exist/);
                   done();
                 }};
      userRoutes.stack[0].route.stack[1].handle(req, res);
    });
  });
});