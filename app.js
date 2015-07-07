// default to development environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('config');
var express = require('express');
var compression = require('compression');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var session = require('express-session');
var flash = require('flash');
var RedisStore = require('connect-redis')(session);
var redisClient = require('./lib/redisClient')

var routes = require('./routes/index');

var app = express();
app.isReady = false;

var db = require('./models');
db.once('ready', function() {
  app.set('config', config);
  app.set('ApplicationSettings', db.ApplicationSettings);
  db.loadFixtures(config.fixtures, process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  .then(function() {
    app.isReady = true;
    app.emit('ready');    
  });
});

var passport = require('./lib/passport');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.locals.pretty = true;

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(cookieParser(config.secret));
app.use(session({resave: false,
                 secret: config.secret,
                 saveUninitialized: false,
                 cookie: {maxAge: 604800000},
                 store: new RedisStore({client: redisClient})}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./lib/middleware/user'));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    var locals = {
      message: err.message,
      error: err
    }
    res.format({
      html: function() {
        res.render('error', locals);
      },
      json: function() {
        res.json({error: err.message})
      }
    });   
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  var locals = {
    message: err.message,
    error: {}
  }
  res.format({
    html: function() {
      res.render('error', locals);
    },
    json: function() {
      res.json({error: err.message})
    }
  });
});


module.exports = app;
