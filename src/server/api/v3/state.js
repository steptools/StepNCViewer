"use strict";
var StepNC = require('stepncnode/build/Release/StepNC');
var file = require('./file');
var step = require('./step');
var find = file.find;

var app;
var loopTimer;
var loopStates = {};
let playbackSpeed = 100;
let path = find.GetProjectName();

///*******************************************************************\
//|                                                                    |
//|                       Helper Functions                             |
//|                                                                    |
//\*******************************************************************/

var update = (val) => {
  app.ioServer.emit("nc:state", val);
};

var updateSpeed = (speed) => {
  app.ioServer.emit("nc:speed", speed);
};

//TODO: Get rid of this function and consolidate with endpoint functions if possible
var getDelta = function(ms, key, cb) {
  var response = "";
  if (key) {
    response = ms.GetKeystateJSON()
  }
  else {
    response = ms.GetDeltaJSON()
  }
  cb(response);
};

var getNext = function(ms, cb) {
  ms.NextWS();
  cb();
};

var getPrev = function(ms, cb) {
  ms.PrevWS();
  cb();
};

var getToWS = function(wsId, ms, cb) {
  ms.GoToWS(wsId);
  cb();
};


var loop = function(ms, key) {
  if (loopStates[path] === true) {
    //app.logger.debug("Loop step " + path);
    let rc = ms.AdvanceState();
    if (rc === 0) {  // OK
      //app.logger.debug("OK...");
      getDelta(ms, key, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        if (playbackSpeed > 0) {
          if (loopTimer !== undefined)
              clearTimeout(loopTimer);
          loopTimer = setTimeout(function () { loop(ms, false); }, 50 / (playbackSpeed / 200));
        }
        else {
          // app.logger.debug("playback speed is zero, no timeout set");
        }
      });
    }
    else if (rc == 1) {   // SWITCH
      // app.logger.debug("SWITCH...");
      let old = _getWorkingstep();
      getNext(ms, function() {
        loop(ms, true);
      });
      let setup = _sameSetup(_getWorkingstep(),old);
      if (!setup){
        loopStates[path] = false;
        update("pause");
        loop(ms,false);
      }
      getDelta(ms, false, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        if (playbackSpeed > 0) {
          if (loopTimer !== undefined)
              clearTimeout(loopTimer);
          loopTimer = setTimeout(function () { loop(ms, false); }, 50 / (playbackSpeed / 200));
        }
        else {
          // app.logger.debug("playback speed is zero, no timeout set");
        }
      });
    }
  }
};

var _getWorkingstep = function() {
  var ms = file.ms;
  let keyjson = JSON.parse(ms.GetKeystateJSON());
  return keyjson.workingstep;
};

var _sameSetup = function (newid, oldid) {
  return (step._getSetupFromId(newid) === step._getSetupFromId(oldid))
};

///*******************************************************************\
//|                                                                    |
//|                       Endpoint Functions                           |
//|                                                                    |
//\*******************************************************************/

var _loopInit = function(req, res) {
  // app.logger.debug("loopstate is " + req.params.loopstate);
    if (req.params.loopstate === undefined) {
      if (loopStates[path] === true) {
        res.status(200).send(JSON.stringify({'state': "play", 'speed': playbackSpeed}));
      }
      else {
        res.status(200).send(JSON.stringify({'state': "pause", 'speed': playbackSpeed}));
      }
    }
    else
    {
      let loopstate = req.params.loopstate;
      var ms = file.ms;
      if (typeof(loopStates[path]) === 'undefined') {
        loopStates[path] = false;
      }

      switch (loopstate) {
        case "start":
          if (loopStates[path] === true) {
            res.status(200).send("Already running");
            return;
          }
          // app.logger.debug("Looping " + path);
          loopStates[path] = true;
          res.status(200).send("OK");
          update("play");
          loop(ms, false);
          break;
        case "stop":
          if (loopStates[path] === false) {
            res.status(200).send("Already stopped");
            return;
          }
          loopStates[path] = false;
          update("pause");
          res.status(200).send("OK");
          break;
        default:
          if (!isNaN(parseFloat(loopstate)) && isFinite(loopstate)) {
            let newSpeed = Number(loopstate);

            if (Number(playbackSpeed) !== newSpeed) {
              playbackSpeed = newSpeed;
              // app.logger.debug("Changing speed to " + newSpeed);
            }

            if (loopStates[path] === true) {
              loop(ms, false);
              res.status(200).send(JSON.stringify({"state": "play", "speed": playbackSpeed}));
            }
            else {
              res.status(200).send(JSON.stringify({"state": "pause", "speed": playbackSpeed}));
            }
            updateSpeed(playbackSpeed);
          }
          else {
            // untested case
          }
      }
    }
};

var _wsInit = function(req, res) {
  if (req.params.command) {
    let command = req.params.command;
    var ms = file.ms;
    if (typeof(loopStates[path]) === 'undefined') {
      loopStates[path] = false;
    }

    switch(command) {
      case "next":
        var temp = loopStates[path];
        loopStates[path] = true;
        if (temp) {
        getNext(ms, function() {
        loop(ms, true);
        });
        }
        else{
          loop(ms,false);
          getNext(ms, function() {
          loop(ms, true);
          });
          loopStates[path] = false;
          update("pause");
        }
        res.status(200).send("OK");
        break;
      case "prev":
        var temp = loopStates[path];
        loopStates[path] = true;
        if (temp) {
        getPrev(ms, function() {
        loop(ms, true);
        });
        }
        else{
          loop(ms,false);
          getPrev(ms, function() {
          loop(ms, true);
          });
          loopStates[path] = false;
          update("pause");
        }
        res.status(200).send("OK");
        break;
        default:
          if (!isNaN(parseFloat(command)) && isFinite(command)) {
            let ws = Number(command);
            temp = loopStates[path];
            loopStates[path] = true;
            if (temp) {
            getToWS(ws, ms, function() {
            loop(ms, true);
            });
            loopStates[path] = false;
            update("pause");
            }
            else{
              loop(ms,false);
              getToWS(ws, ms, function() {
              loop(ms, true);
              });
              loopStates[path] = false;
              update("pause");
            }
            res.status(200).send("OK");
              }
              else {
                // untested case
              }
      }
      getDelta(ms, false, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        if (playbackSpeed > 0) {
          if (loopTimer !== undefined)
              clearTimeout(loopTimer);
          loopTimer = setTimeout(function () { loop(ms, false); }, 50 / (playbackSpeed / 200));
        }
        else {
          // app.logger.debug("playback speed is zero, no timeout set");
        }
      });
  }
};

var _getKeyState = function (req, res) {
    var ms = file.ms;
    if (ms === undefined) {
      res.status(404).send("Machine state could not be found");
      return;
    }
    res.status(200).send(ms.GetKeystateJSON());
};

var _getDeltaState = function (req, res) {
    var ms = file.ms;
    if (ms === undefined) {
      res.status(404).send("Machine state could not be found");
      return;
    }
    console.log("apricots");
    console.log(ms.GetDeltaJSON());
    res.status(200).send(ms.GetDeltaJSON());
};

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v3/nc/state/key', _getKeyState);
  app.router.get('/v3/nc/state/delta', _getDeltaState);
  app.router.get('/v3/nc/state/loop/:loopstate', _loopInit);
  app.router.get('/v3/nc/state/loop/', _loopInit);
  app.router.get('/v3/nc/state/ws/:command', _wsInit);
  if (cb) cb();
};
