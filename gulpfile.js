// default to development environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var gulp = require('gulp');
var fs = require('fs');
var browserify = require('browserify');
var ClosureCompiler = require('google-closure-compiler').compiler;
var envify = require('envify/custom');
var child_process = require('child_process');
var config = require('config')
var markdown = require('./lib/markdown');


gulp.task('markdown-help', function(done) {
  var html = JSON.stringify(markdown.Converter.makeHtml(fs.readFileSync('./public/MarkdownHelp.md','ascii')));
  var output = "module.exports=" + html + ';';
  fs.writeFileSync('./public/javascripts/editorHelpHtml.js', output);
  done();
});

gulp.task('markdown-browserify', gulp.series('markdown-help', function(done) {
  var b = browserify('./public/javascripts/loadMarkdown.js');
  var bStream = b.transform('uglifyify').bundle();
  bStream.on('end', function() {
    done();
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/markdownBundle.js'));
}));

gulp.task('markdown-closurecompiler', gulp.series('markdown-browserify', function(done) {
  const closureCompiler = new ClosureCompiler({
      'js': './public/javascripts/markdownBundle.js',
      'js_output_file': './public/javascripts/markdownBundle-min.js',
      'language_in': 'ECMASCRIPT5',
      'language_out': 'ECMASCRIPT5',
      'compilation_level': 'SIMPLE_OPTIMIZATIONS',
  });
  closureCompiler.run(function(exitCode, stdOut, stdErr) { done(); });
}));

gulp.task('markdown', gulp.series('markdown-closurecompiler'));

gulp.task('encryptPassword-browserify', function(done) {
  var b = browserify('./public/javascripts/encryptPassword.js');
  var bStream = b.transform(envify({RSA_PUBLIC_KEY: config.rsaPublicKey}))
                .transform('uglifyify')
                .bundle();
  bStream.on('end', function() {
    done();
  });
  bStream.pipe(fs.createWriteStream('./public/javascripts/encryptPasswordBundle.js')); 
});

gulp.task('encryptPassword-closurecompiler', gulp.series('encryptPassword-browserify', function(done) {
  const closureCompiler = new ClosureCompiler({
      'js': './public/javascripts/encryptPasswordBundle.js',
      'js_output_file': './public/javascripts/encryptPasswordBundle-min.js',
      'language_in': 'ECMASCRIPT5',
      'language_out': 'ECMASCRIPT5',
      'compilation_level': 'SIMPLE_OPTIMIZATIONS',
  });
  closureCompiler.run(function(exitCode, stdOut, stdErr) {
    console.error(stdErr);
    done();
  });
}));

gulp.task('encryptPassword', gulp.series('encryptPassword-closurecompiler'));

gulp.task('javascripts', gulp.series('encryptPassword'));


// sequelize migrations



// testing

gulp.task('selenium', function() {
  // on my system selenium is an alias for:
  // java -jar /Users/phil/selenium/selenium-server-standalone-2.47.1.jar -Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver
  var selenium = child_process.spawn('java', ['-jar', '/Users/phil/selenium/selenium-server-standalone-2.47.1.jar',
                                              '-Dwebdriver.chrome.driver=/Users/phil/selenium/chromedriver']);
  selenium.stdout.pipe(process.stdout);
  selenium.stderr.pipe(process.stderr);
});

// running dbs for the app
gulp.task('db:start', function() {
  var pg = child_process.spawn('postgres', ['-D', '/usr/local/var/postgres/']);
  pg.stdout.pipe(process.stdout);
  pg.stderr.pipe(process.stdout);
  var redis = child_process.spawn('redis-server', ['/usr/local/etc/redis.conf'])
  redis.stdout.pipe(process.stdout);
  redis.stderr.pipe(process.stdout);
});

gulp.task('db:migrate', function(done) {  
  const sequelize = child_process.spawn('sequelize', ['db:migrate']);
  sequelize.stdout.pipe(process.stdout);
  sequelize.stderr.pipe(process.stderr);
  sequelize.on('exit', function() {
    done();
  });
});


// testing
gulp.task('test:unit', function(done) {  
  var mocha = child_process.spawn('mocha', ['test']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  mocha.on('exit', function() {
    done();
  });
});

gulp.task('test:integration', function(done) {
  var mocha = child_process.spawn('mocha', ['test/integration', '-t', '10000']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  mocha.on('exit', function() {
    done();
  });
});

gulp.task('test:functional', function(done) {
  var mocha = child_process.spawn('mocha', ['test/functional', '-t', '120000']);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stdout);
  mocha.on('exit', function() {
    done();
  });
});

// necessary tasks to start the app
gulp.task('default', gulp.series('javascripts', 'db:migrate'));
