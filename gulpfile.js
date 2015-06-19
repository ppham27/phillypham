var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var child_process = require('child_process');

gulp.task('db:start', function() {
  var pg = child_process.spawn('postgres', ['-D', '/usr/local/var/postgres/']);
  pg.stdout.pipe(process.stdout);
  pg.stderr.pipe(process.stdout);
  var redis = child_process.spawn('redis-server', ['/usr/local/etc/redis.conf'])
  redis.stdout.pipe(process.stdout);
  redis.stderr.pipe(process.stdout);
});

gulp.task('browserify', function() {
  var b = browserify('./public/javascripts/loadMarkdown.js');
  var bStream = b.bundle();
  bStream.on('end', function() {
    console.log('markdown has been browserified!');
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/markdownBundle.js'));
});

gulp.task('migrate', function() {  
  child_process.spawn('sequelize', ['db:migrate'])
  .stdout.pipe(process.stdout);
});

gulp.task('selenium', function() {
  // on my system selenium is an alias for:
  // java -jar /Users/phil/selenium/selenium-server-standalone-2.46.0.jar -Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver
  var selenium = child_process.spawn('java', ['-jar', '/Users/phil/selenium/selenium-server-standalone-2.46.0.jar',
                                              '-Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver']);
  selenium.stdout.pipe(process.stdout);
  selenium.stderr.pipe(process.stderr);
});

gulp.task('default', ['browserify', 'migrate']);