"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var file = require('./file');

var app;
var loopStates = {};

var update = (val) => {
  app.ioServer.emit("nc:state", val);
};

var _getDelta = function(ncId, ms, key, cb) {
  var response = "";
  if (key) {
    response = ms.GetKeystateJSON();
  }
  else {
    response = ms.GetDeltaJSON();
  }
  //app.logger.debug("got " + response);
  cb(response);
};

var _getNext = function(ncId, ms, cb) {
  ms.NextWS();
  //assume switch was successful
  app.logger.debug("Switched!");
  cb();
};

var _getPrev = function(ncId, ms, cb) {
  //ms.PrevWS();
  //assume switch was successful
  app.logger.debug("Switched!");
  cb();
};


var _loop = function(ncId, ms, key) {
  if (loopStates[ncId] === true) {
    //app.logger.debug("Loop step " + ncId);
    let rc = ms.AdvanceState();
    if (rc === 0) {  // OK
      //app.logger.debug("OK...");
      _getDelta(ncId, ms, key, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        setTimeout(function() { _loop(ncId, ms, false); }, 300);
      });
    }
    else if (rc == 1) {   // SWITCH
      app.logger.debug("SWITCH...");
      _getNext(ncId, ms, function() {
        _loop(ncId, ms, true);
      });
    }
  }
};


var _loopInit = function(req, res) {
  if (req.params.ncId && req.params.loopstate) {
    let ncId = req.params.ncId;
    let loopstate = req.params.loopstate;
    var ms = file.getMachineState(app, ncId);
    if (typeof(loopStates[ncId]) === 'undefined') {
      loopStates[ncId] = false;
    }

    // load the machine tool using global options
    if (app.machinetool !== "")
      ms.LoadMachine(app.machinetool);

    switch(loopstate) {
      case "state":
        if (loopStates[ncId] === true) {
          res.status(200).send("play");
        }
        else {
          res.status(200).send("pause");
        }
        break;
      case "start":
        if (loopStates[ncId] === true) {
          res.status(200).send("Already running");
          return;
        }
        app.logger.debug("Looping " + ncId);
        loopStates[ncId] = true;
        res.status(200).send("OK");
        update("play");
        _loop(ncId, ms, false);
        break;
      case "stop":
        if (loopStates[ncId] === false) {
          res.status(200).send("Already stopped");
          return;
        }
        loopStates[ncId] = false;
        update("pause");
        res.status(200).send("OK");
        break;
      case "stepf":
        var temp = loopStates[ncId];
        loopStates[ncId] = true;
        if (temp) {
        _getNext(ncId, ms, function() {
        _loop(ncId, ms, true);
        });
        loopStates[ncId] = false;
        update("pause");
        }
        else{
          _loop(ncId,ms,false);
          _getNext(ncId, ms, function() {
          _loop(ncId, ms, true);
          });
          loopStates[ncId] = false;
          update("pause");
        }
        res.status(200).send("OK");
        break;
      case "stepb":
        var temp = loopStates[ncId];
        loopStates[ncId] = true;
        if (temp) {
        _getPrev(ncId, ms, function() {
        _loop(ncId, ms, true);
        });
        update("play");
        }
        else{
          _loop(ncId,ms,false);
          _getPrev(ncId, ms, function() {
          _loop(ncId, ms, true);
          });
          loopStates[ncId] = false;
          update("pause");
        }
        res.status(200).send("OK");
        break;
    }
  }
};

var _getKeyState = function (req, res) {
  //app.logger.debug("KEYSTATE");
  if (req.params.ncId) {
    var ms = file.getMachineState(app, req.params.ncId);
    res.status(200).send(ms.GetKeystateJSON());
  }
};

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v2/nc/projects/:ncId', _getKeyState);
  app.router.get('/v2/nc/projects/:ncId/keystate', _getKeyState);
  app.router.get('/v2/nc/projects/:ncId/loop/:loopstate', _loopInit);
  if (cb) cb();
};
