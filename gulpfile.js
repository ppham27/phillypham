// default to development environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var ClosureCompiler = require('closurecompiler');
var envify = require('envify/custom');
var child_process = require('child_process');
var config = require('config')

gulp.task('markdown-browserify', function(done) {
  var b = browserify('./public/javascripts/loadMarkdown.js');
  var bStream = b.transform('uglifyify').bundle();
  bStream.on('end', function() {
    console.log('markdown has been browserified!');
    done();
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/markdownBundle.js')); 
});

gulp.task('markdown-closurecompiler', ['markdown-browserify'], function() {
  ClosureCompiler.compile('./public/javascripts/markdownBundle.js',
                          {language_in: 'ECMASCRIPT5'},
                          function(err, res) {
                            fs.writeFile('./public/javascripts/markdownBundle-min.js', res,
                                         function(err) {
                                           if (err) throw err;
                                           console.log('markdown has been compiled!');
                                         });
                          });
});
gulp.task('markdown', ['markdown-closurecompiler']);

gulp.task('encryptPassword-browserify', function(done) {
  var b = browserify('./public/javascripts/encryptPassword.js');
  var bStream = b.transform(envify({RSA_PUBLIC_KEY: config.rsaPublicKey}))
                .transform('uglifyify')
                .bundle();
  bStream.on('end', function() {
    console.log('encryptPassword has been browserified!');
    done();
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/encryptPasswordBundle.js')); 
});

gulp.task('encryptPassword-closurecompiler', ['encryptPassword-browserify'], function() {
  // compilation_level: "ADVANCED_OPTIMIZATIONS", possible additional optimization?
  ClosureCompiler.compile('./public/javascripts/encryptPasswordBundle.js',
                          {language_in: 'ECMASCRIPT5'},
                          function(err, res) {
                            fs.writeFile('./public/javascripts/encryptPasswordBundle-min.js', res,
                                         function(err) {
                                           if (err) throw err;
                                           console.log('encyptPassword has been compiled!');
                                         });
                          });
});

gulp.task('encryptPassword', ['encryptPassword-closurecompiler']);

gulp.task('javascripts', ['markdown', 'encryptPassword']);

// sequelize migrations



// testing

gulp.task('selenium', function() {
  // on my system selenium is an alias for:
  // java -jar /Users/phil/selenium/selenium-server-standalone-2.46.0.jar -Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver
  var selenium = child_process.spawn('java', ['-jar', '/Users/phil/selenium/selenium-server-standalone-2.46.0.jar',
                                              '-Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver']);
  selenium.stdout.pipe(process.stdout);
  selenium.stderr.pipe(process.stderr);
});

// running dbs for the app
gulp.task('db:start', function(done) {
  var pg = child_process.spawn('postgres', ['-D', '/usr/local/var/postgres/']);
  pg.stdout.pipe(process.stdout);
  pg.stderr.pipe(process.stdout);
  var redis = child_process.spawn('redis-server', ['/usr/local/etc/redis.conf'])
  redis.stdout.pipe(process.stdout);
  redis.stderr.pipe(process.stdout);
  done();
});

gulp.task('db:migrate', function() {  
  child_process.spawn('sequelize', ['db:migrate'])
  .stdout.pipe(process.stdout);
});


// testing
gulp.task('test:unit', function(done) {  
  var mocha = child_process.spawn('mocha', ['test']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  done();
});

gulp.task('test:integration', function(done) {
  var mocha = child_process.spawn('mocha', ['test/integration', '-t', '5000']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  done();
});

gulp.task('test:functional', function(done) {
  var mocha = child_process.spawn('mocha', ['test/functional', '-t', '180000']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  done();
});

// necessary tasks to start the app
gulp.task('default', ['javascripts', 'db:migrate']);