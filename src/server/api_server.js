/* Copyright G. Hemingway 2015 */
'use strict';

var http = require('http');
var path = require('path');
var io = require('socket.io');
var ioSession = require('socket.io-express-session');
var expSession = require('express-session');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var jade = require('jade');
var CoreServer = require('./core_server');
var util = require('util');
var fs = require('fs');

/************************* Support Site *********************************/

var COOKIE_SECRET = 'imhotep';
var app;

function APIServer() {
  CoreServer.call(this);
  // Setup the session
  this.session = expSession({
    cookie: {httpOnly: false},
    secret: COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
  });
  // Set up the rest
  this._setExpress();
  this._setSocket();
  var self = this;
  this._setRoutes(function() {
    self._setSite();
  });
}
util.inherits(APIServer, CoreServer);

/*
 * Setup Express Frontend
 */
// Calculate sha1 hash of the file object
APIServer.prototype._setExpress = function() {
  this.express = express();
  this.express.disable('x-powered-by');
  this.express.use(
    require('serve-favicon')
    (__dirname + '/../../public/img/favicon.ico')
  );
  this.express.use(bodyParser.urlencoded({extended: true}));
  this.express.use(bodyParser.json());
  this.express.use(cookieParser('imhotep'));
  this.express.use(this.session);
  this.express.use(require('method-override')());
  this.express.use(
    require('serve-static')
    (path.join(__dirname, '/../../public'))
  );
  this.express.use(require('morgan')('tiny'));
  this.express.engine('jade', jade.__express);
  this.express.set('views', path.join(__dirname, '/views'));
  // Create the core router
  this.router = express.Router();
  this.express.use(this.router);
};

/*
 * Setup the socket server
 */
APIServer.prototype._setSocket = function() {
  // Socket server
  this.server = http.Server(this.express);
  this.ioServer = io(this.server, {});
  this.ioServer.use(ioSession(this.session));
  this.ioServer.on('connection', function(socket) {
    socket.on('disconnect', function() {});
  });
};

/*
 * Core API Routes
 */
APIServer.prototype._setRoutes = function(cb) {
  var self = this;
  require('./api/v3/step')(self, function() {
    require('./api/v3/state')(self, function() {
      require('./api/v3/tool')(self, function() {
        require('./api/v3/tolerances')(self, function() {
          require('./api/v3/geometry')(self, function() {
            if (cb) {
              cb();
            }
          });
        });
      });
    });
  });
};

/*
 * Static Site
 */
APIServer.prototype._setSite = function() {
  var self = this;
  var endpoint = this.config.host ? this.config.protocol + '://' + this.config.host + ':' + app.port : '';
  var services = {
    api_endpoint: endpoint,
    socket: "",
    version: '/v3',
    machine: self.machinetool,
  };
  // Serve the root client framework - customized as needed
  var _serveRoot = function (req, res) {
    var change = fs.readFileSync("CHANGELOG.md", "utf8");
    var appConfig = {
      title: 'NC.js',
      source: '/js/main.js',
      services: services,
      config: self.config.client,
      changelog: change,
    };
    res.render('base.jade', appConfig);
  };

  this.router.get('/', _serveRoot);
  this.router.get('*', function(req, res) {
    res.status(404).send('404 Error: Not Found');
  });
};

/*
 * Primary run
 */
APIServer.prototype.run = function() {
  var self = this;
  this.server.listen(app.port, function() {
    self.logger.info('CAD.js API Server listening on: ' + app.port);
  });


  process.openStdin().addListener('data', function(inputData) {
    if ((self.server !== null) && (self.server !== 'undefined')) {
      inputData=inputData.toString().trim().toLowerCase();
      if (inputData.length === 0) {
        process.exit(0);
      }
    }
  });
};

/***************************** Run the server *********************************/

app = new APIServer();
app.run();
