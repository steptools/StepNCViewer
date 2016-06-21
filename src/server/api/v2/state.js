"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var file = require('./file');

var app;
var loopTimer;
var loopStates = {};
let playbackSpeed = 100;

var update = (val) => {
  app.ioServer.emit("nc:state", val);
};

var _updateSpeed = (speed) => {
  app.ioServer.emit("nc:speed", speed);
};

//TODO: Get rid of this function and consolidate with endpoint functions if possible
var _getDelta = function(ncId, ms, key, cb) {
  var response = "";
  if (key) {
    var holder = JSON.parse(ms.GetKeystateJSON()); 
    holder["project"] = ncId;
    response = JSON.stringify(holder);
  }
  else {
    var holder = JSON.parse(ms.GetDeltaJSON()); 
    holder["project"] = ncId;
    response = JSON.stringify(holder);
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

var _getToWS = function(wsId, ms, cb) {
  ms.GoToWS(wsId);
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
        if (playbackSpeed > 0) {
          if (loopTimer !== undefined)
              clearTimeout(loopTimer);
          loopTimer = setTimeout(function () { _loop(ncId, ms, false); }, 50 / (playbackSpeed / 200));
        }
        else {
          // app.logger.debug("playback speed is zero, no timeout set");
        }
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
  // app.logger.debug("loopstate is " + req.params.loopstate);
  if (req.params.ncId !== undefined) {
    let ncId = req.params.ncId;
    
    if (req.params.loopstate === undefined) {
      if (loopStates[ncId] === true) {
        res.status(200).send(JSON.stringify({'state': "play", 'speed': playbackSpeed}));
      }
      else {
        res.status(200).send(JSON.stringify({'state': "pause", 'speed': playbackSpeed}));
      }
    }
    else
    {
      let loopstate = req.params.loopstate;
      var ms = file.getMachineState(app, ncId);
      if (typeof(loopStates[ncId]) === 'undefined') {
        loopStates[ncId] = false;
      }

      switch (loopstate) {
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
        default:
          if (!isNaN(parseFloat(loopstate)) && isFinite(loopstate)) {
            let newSpeed = Number(loopstate);
            
            if (Number(playbackSpeed) !== newSpeed) {
              playbackSpeed = newSpeed;
              app.logger.debug("Changing speed to " + newSpeed);
            }
            
            if (loopStates[ncId] === true) {
              _loop(ncId, ms, false);
              res.status(200).send(JSON.stringify({"state": "play", "speed": playbackSpeed}));
            }
            else {
              res.status(200).send(JSON.stringify({"state": "pause", "speed": playbackSpeed}));
            }
            _updateSpeed(playbackSpeed);
          }
          else {
            // untested case
          }
      }
    }
  }
};

var _wsInit = function(req, res) {
  if (req.params.ncId && req.params.command) {
    let ncId = req.params.ncId;
    let command = req.params.command;
    var ms = file.getMachineState(app, ncId);
    if (typeof(loopStates[ncId]) === 'undefined') {
      loopStates[ncId] = false;
    }

    // load the machine tool using global options
    if (app.machinetool !== "")
      ms.LoadMachine(app.machinetool);

    switch(command) {
      case "next":
        var temp = loopStates[ncId];
        loopStates[ncId] = true;
        if (temp) {
        _getNext(ncId, ms, function() {
        _loop(ncId, ms, true);
        });
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
      case "prev":
        /*var temp = loopStates[ncId];
        loopStates[ncId] = true;
        if (temp) {
        _getPrev(ncId, ms, function() {
        _loop(ncId, ms, true);
        });
        loopStates[ncId] = false;
        update("pause");
        }
        else{
          _loop(ncId,ms,false);
          _getPrev(ncId, ms, function() {
          _loop(ncId, ms, true);
          });
          loopStates[ncId] = false;
          update("pause");
        }
        res.status(200).send("OK");*/
        break;
        default:
          if (!isNaN(parseFloat(command)) && isFinite(command)) {
            let ws = Number(command);
            var temp = loopStates[ncId];
            loopStates[ncId] = true;
            if (temp) {
            _getToWS(ws, ms, function() {
            _loop(ncId, ms, true);
            });
            loopStates[ncId] = false;
            update("pause");
            }
            else{
              _loop(ncId,ms,false);
              _getToWS(ws, ms, function() {
              _loop(ncId, ms, true);
              });
              loopStates[ncId] = false;
              update("pause");
            }
            res.status(200).send("OK");
              }
              else {
                // untested case
              }
      }
  }
};

var _getKeyState = function (req, res) {
  //app.logger.debug("KEYSTATE");
  if (req.params.ncId) {
    var ms = file.getMachineState(app, req.params.ncId);
    if (ms === undefined) {
      res.status(404).send("Machine state could not be found");
      return;
    }
    //FIXME: Needs to be fixed once set function for project name comes out
    var holder = JSON.parse(ms.GetKeystateJSON()); 
    holder["project"] = req.params.ncId;
    res.status(200).send(JSON.stringify(holder));
  }
};

var _getDeltaState = function (req, res) {
  if (req.params.ncId) {
    var ms = file.getMachineState(app, req.params.ncId);
    var holder = JSON.parse(ms.GetDeltaJSON()); 
    holder["project"] = req.params.ncId;
    res.status(200).send(JSON.stringify(holder));
  }
};

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v2/nc/projects/:ncId/state/key', _getKeyState);
  app.router.get('/v2/nc/projects/:ncId/state/delta', _getDeltaState);
  app.router.get('/v2/nc/projects/:ncId/state/loop/:loopstate', _loopInit);
  app.router.get('/v2/nc/projects/:ncId/state/loop/', _loopInit);
  app.router.get('/v2/nc/projects/:ncId/state/ws/:command', _wsInit)
  if (cb) cb();
};
