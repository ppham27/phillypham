var expect = require('chai').expect;
var Sequelize = require('sequelize');

describe('Post', function() {
  beforeEach(function(done) {
    this.db = require('./support/db');
    this.Post = this.db.sequelize.import('../models/Post');
    this.Post.sync({force: true}).then(function() {
      done();
    });
  });  

  it ('should fail to save when there is a photo link but no photo url', function(done) {
    var Post = this.Post;
    Post.create({title: 'New Post', body: 'post body', photoLink: 'http://www.google.com'})    
    .catch(function(err) {
      expect(err).to.be.instanceof(Error);
      expect(err.message).to.match(/photo url must exist/i);
      done();
    });    
  });
});
