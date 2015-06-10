var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var child_process = require('child_process');

gulp.task('browserify', function() {
  var b = browserify('./public/javascripts/loadMarkdown.js');
  var bStream = b.bundle();
  bStream.on('end', function() {
    console.log('markdown has been browserified!');
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/markdownBundle.js'));
});

gulp.task('migrate', function() {  
  var migrate = child_process.spawn('sequelize', ['db:migrate']);
  var outputMsg = '';
  migrate.stdout.on('data', function(data) {
    outputMsg += data;
  });
  migrate.on('close', function(code) {
    console.log(outputMsg);
  });
});

gulp.task('default', ['browserify', 'migrate']);