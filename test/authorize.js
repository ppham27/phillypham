var expect = require('chai').expect;

var authorize = require('../lib/middleware/authorize');

describe('authorize', function() {
  it('should by default fail', function() {
    var req = {};
    var res = {};
    var next = function() {
      expect(arguments[0]).to.be.instanceof(Error);
    }
    authorize()(req, res, next);
  });  

  it('should allowed logged in users but fail otherwise', function() {
    var req = {user: true};
    var res = {};
    var next = function() {
      expect(arguments.length).to.equal(0);
    }
    authorize({loggedIn: true})(req, res, next);
    req = {};
    res = {};
    next = function() {
      expect(arguments[0]).to.be.instanceof(Error);      
    }
    authorize({loggedIn: true})(req, res, next);
  });  

  it('should let in users based on display name', function() {
    var req = {user: {displayName: 'hello', emailVerified: false}, params: {displayName: 'hello'},
               session: {roles: {}}};
    var res = {};
    var next = function() {
      expect(arguments.length).to.equal(0);
    }
    authorize({userId: true})(req, res, next);
    authorize({userId: true, role: 'admin'})(req, res, next);    
    req = {user: {displayName: 'hell', emailVerified: false}, params: {displayName: 'hello'},
           session: {roles: {}}};
    res = {};
    next = function() {
      expect(arguments[0]).to.be.instanceof(Error);      
    }
    authorize({userId: true})(req, res, next);
  });

  it('should let users in if email is verified', function() {
    var req = {user: {displayName: 'hell', emailVerified: true}, params: {displayName: 'hello'},
               session: {roles: {}}};
    var res = {};
    var next = function() {
      expect(arguments.length).to.equal(0);
    }
    authorize({emailVerified: true})(req, res, next);

    req = {user: {displayName: 'hell', emailVerified: false}, params: {displayName: 'hello'},
           session: {roles: {}}};
    res = {};
    next = function() {
      expect(arguments[0]).to.be.instanceof(Error);
    }
    authorize({emailVerified: true})(req, res, next);
  });

  it('should let in users based on role only if email is verified', function() {
    var req = {user: {displayName: 'hello', emailVerified: false}, params: {displayName: 'hello'},
               session: {roles: {poster: true}}};
    var res = {};
    var success = function() {
      expect(arguments.length).to.equal(0);
    }
    var fail = function() {
      expect(arguments[0]).to.be.instanceof(Error);      
    }
    authorize({role: 'poster'})(req, res, fail);
    req.user.emailVerified = true;
    authorize({role: 'poster'})(req, res, success);

    req = {user: {displayName: 'hell', emailVerified: false}, params: {displayName: 'hello'},
           session: {roles: {}}};
    res = {};
    authorize({role: 'poster'})(req, res, fail);
  });
  
});