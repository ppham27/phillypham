var expect = require('chai').expect;
var sinon = require('sinon');

var config = require('config');
var userRoutes = require('../../routes/user');

var FakeRequest = require('../support/fakeRequest');

var random = require('../../lib/random');
var transporter = require('../../lib/smtpTransporter');

var redisClient = require('../../lib/redisClient');


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
    before(function() {
      this.handle = userRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/:displayName' && handle.route.methods.get;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });
    it('should get user info', function(done) {
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.displayName = 'admin';
      var res = {json: function(json) {
                   expect(json.displayName).to.equal('admin');
                   expect(json.email).to.equal('admin@admin.com');
                   done();
                 }};
      this.handle(req, res);
    });

    it('should get return an error', function(done) {
      var req = new FakeRequest({}, true, {accepts: ['json']});
      req.params.displayName = 'does not exist user';
      var res = {json: function(json) {
                   expect(json.error).to.match(/does not exist/);
                   done();
                 }};
      this.handle(req, res);
    });
  });

  describe('email verify', function() {
    before(function() {
      this.sendMailStub = sinon.stub(transporter, 'sendMail', function(mailOptions, callback) {
                            callback(null, true);      
                          });      
      this.handle = userRoutes.stack.filter(function(handle) {
                      return handle.route.path === '/verify/:displayName' && handle.route.methods.post;
                    });
      this.handle = this.handle[0].route.stack[1].handle;
    });

    after(function() {
      transporter.sendMail.restore();      
    });

    it('should reject if request type is not json', function(done) {
      var req = new FakeRequest({email: 'a@a.com'}, true, {accepts: ['json']});
      var res = {json: function(json) {
                   expect(json.error).to.match(/only json/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should reject if missing email', function(done) {
      var req = new FakeRequest({notEmail: 'a'}, true, {accepts: ['json'], is: ['json']});
      var res = {json: function(json) {
                   expect(json.error).to.match(/no email was found/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should reject if user does not exist', function(done) {
      var req = new FakeRequest({email: 'admin@admin.com'}, true, {accepts: ['json'], is: ['json']});
      var res = {json: function(json) {
                   expect(json.error).to.match(/user does not exist/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should reject if email is already taken ', function(done) {
      var req = new FakeRequest({email: 'admin@admin.com'}, true, {accepts: ['json'], is: ['json']});
      req.params.displayName = req.user.displayName = 'power';
      var res = {json: function(json) {
                   expect(json.error).to.match(/already been taken/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should reject if email is already verified', function(done) {
      var req = new FakeRequest({email: 'admin@admin.com'}, true, {accepts: ['json'], is: ['json']});
      req.params.displayName = req.user.displayName = 'admin';
      var res = {json: function(json) {
                   expect(json.error).to.match(/already verified/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should reject if email is malformed', function(done) {
      var req = new FakeRequest({email: 'notanemailaddress'}, true, {accepts: ['json'], is: ['json']});
      req.params.displayName = req.user.displayName = 'admin';
      var res = {json: function(json) {
                   expect(json.error).to.match(/Invalid value/);
                   done();
                 }};
      this.handle(req, res);
    });

    it('should send verification email', function(done) {
      var req = new FakeRequest({email: 'new_email@gmail.com'}, true, {accepts: ['json'], is: ['json']});
      req.params.displayName = req.user.displayName = 'moderator';
      var db = this.db;
      var sendMailStub = this.sendMailStub;
      var res = {json: function(json) {
                   expect(json.success).to.be.true;
                   expect(sendMailStub.calledOnce).to.be.true;
                   redisClient.get('emailVerifyToken:new_email@gmail.com', function(err, token) {
                     expect(token).to.not.be.null;
                     redisClient.get('emailVerifyToken:' + token, function(err, email) {
                       expect(email).to.equal('new_email@gmail.com');
                       db.User.findOne({where: {displayName: 'moderator'}})
                       .then(function(user) {
                         expect(user.email).to.equal('new_email@gmail.com');
                         done();
                       });
                     });
                   })
                 }};
      this.handle(req, res);
    });
  });

  describe('updates', function() {
    
  });
});