var expect = require('chai').expect;
var sinon = require('sinon');
var redisClient = require('../../lib/redisClient');
var random = require('../../lib/random');

var emailVerifier = require('../../lib/emailVerifier');

var async = require('async');

describe('emailVerifier', function() {
  before(function() {
    this.tokens = ['G7UuuTl4e1v7b9xcW2W4o9iBu_JN20ffCR5EJERlkAqczsibOcoxTX6Z8qBPHvoB',
                   'rW5pPXM0DDnH2U8HrvEaLHd_Z4SNd--jvWSZqjek5-UyCXy48eFhfXKZT-duuspn',
                   'geyzCQu7nhOZK-22z4WVfI-rBp5Apawgl6BnYVN0EDdpKmc04gQW7tpKtJEmUGtD',
                   'LNQjWUrG-pzPHR4dqqKsfX4YRCQyk6X6eVqszePzKn8OSCIIIl2zhDAu-W639_CL',
                   '2MApy5OKOw0SVPQX7dgCgIC-nSdgCNr0kMj-QXt1yiy_l1sxkcjigsHxnQGmnOMJ',
                   'XqyhmDfGy591G7bMrJrYmMQ7Hss58Yke29GExZ30A8Z4OCSRjCTOnLHAaf26cT17'];
  });

  beforeEach(function() {
    var stub = sinon.stub(random, 'token');
    this.tokens.forEach(function(token, idx) {
      stub.onCall(idx).returns(token);
    });
  });

  afterEach(function() {
    random.token.restore();
  });

  it('should create token based on email', function(done) {
    var email = 'pp@phil.com';
    var tokens = this.tokens;
    emailVerifier.createToken(email)
    .then(function(token) {
      async.parallel(
        [function(done) {
           redisClient.get('emailVerifyToken:' + token, function(err, newEmail) {
             expect(newEmail).to.equal(email);
             done();
           });
         },
         function(done) {
           redisClient.get('emailVerifyToken:' + email, function(err, token) {
             expect(token).to.equal(tokens[0]);
             done();
           });
         },
         function(done) {
           // make sure it's set to expire
           redisClient.ttl('emailVerifyToken:' + email, function(err, ttl) {
             expect(ttl).to.be.at.least(259100);
             expect(ttl).to.be.at.most(259200);
             done();
           });           
         }],
        function(results) {
          done();
        });      
    });    
  });

  it('should reset token', function(done) {
    var email = 'pp@phil.com'; 
    var tokens = this.tokens;
    emailVerifier.createToken(email)
    .then(function(token) {
      return emailVerifier.resetToken(email);
    })
    .then(function(token) {
         async.parallel(
           [function(done) {
              redisClient.exists('emailVerifyToken:' + tokens[0], function(err, doesExist) {
                expect(doesExist).to.equal(0);
                done();
              });
            },
            function(done) {
              redisClient.get('emailVerifyToken:' + token, function(err, newEmail) {
                expect(newEmail).to.equal(email);
                done();
              });
            },
            function(done) {
              redisClient.get('emailVerifyToken:' + email, function(err, token) {
                expect(token).to.equal(tokens[1]);
                done();
              });
            },
            function(done) {
              // make sure timer is reset
              redisClient.ttl('emailVerifyToken:' + email, function(err, ttl) {
                expect(ttl).to.be.at.least(259100);
                expect(ttl).to.be.at.most(259200);
                done();
              });           
            }],
           function(results) {
             done();
           });         
    });    
  });

  it('should delete tokens', function(done) {
    var email = 'pp@phil.com'; 
    var tokens = this.tokens;
    emailVerifier.createToken(email)
    .then(function(token) {
      return emailVerifier.deleteToken(email);
    })
    .then(function() {
      async.parallel(
        [function(done) {
           redisClient.exists('emailVerifyToken:' + tokens[0], function(err, doesExist) {
             expect(doesExist).to.equal(0);
             done();
           });
         },
         function(done) {
           redisClient.exists('emailVerifyToken:' + email, function(err, doesExist) {
             expect(doesExist).to.equal(0);
             done();
           });
         }], 
        function(results) {
          done();
        });
    });
  });
});