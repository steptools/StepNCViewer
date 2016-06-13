"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');

var app;
var machineStates = {};
var loopStates = {};

var update = (val) => {
  app.ioServer.emit("nc:state", val);
};

var _getDelta = function(pid, key, cb) {
  var response = "";
  if (key) {
    response = machineStates[pid].GetKeystateJSON();
  }
  else {
    response = machineStates[pid].GetDeltaJSON();
  }
  //app.logger.debug("got " + response);
  cb(response);
};

var _getNext = function(pid, cb) {
  let rc = -1;
  rc = machineStates[pid].nextWS();
  if (rc === 0) {
    app.logger.debug("Switched!");
    cb();
  }
};

var _loop = function(pid, key) {
  if (loopStates[pid] === true) {
    //app.logger.debug("Loop step " + pid);
    let rc = machineStates[pid].AdvanceState();
    if (rc === 0) {  // OK
      app.logger.debug("OK...");
      _getDelta(pid, key, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        setTimeout(function() { _loop(pid, false); }, 300);
      });
    }
    else if (rc == 1) {   // SWITCH
      app.logger.debug("SWITCH...");
      _getNext(pid, function() {
        _loop(pid, true);
      });
    }
  }
};

var _loopInit = function(req, res) {
  if (req.params.ncId && req.params.loopstate) {
    let ncId = req.params.ncId;
    let loopstate = req.params.loopstate;
    if (typeof(machineStates[ncId]) === 'undefined') {
      machineStates[ncId] = new StepNC.machineState(ncId);
      loopStates[ncId] = false;

      // load the machine tool using global options
      if (app.machinetool != "")
        machineStates[ncId].LoadMachine(app.machinetool);
    }
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
        _loop(ncId, false);
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
    }
  }
};

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v2/nc/:ncId/loop/:loopstate', _loopInit);
  if (cb) cb();
};
