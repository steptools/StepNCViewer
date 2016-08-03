'use strict';
var file = require('./file');
var step = require('./step');
var find = file.find;

var app;
var loopTimer;
var loopStates = {};
let playbackSpeed = 100;
let spindleSpeed;
let feedRate;
let path = find.GetProjectName();
let changed = false;
let justchanged = false;

/****************************** Helper Functions ******************************/

function update(val) {
  app.ioServer.emit('nc:state', val);
}

function updateSpeed(speed) {
  app.ioServer.emit('nc:speed', speed);
}

function getDelta(ms, key, cb) {
  var response = '';
  if (key) {
    response = ms.GetKeystateJSON();
  } else {
    response = ms.GetDeltaJSON();
  }
  cb(response);
}

function getNext(ms, cb) {
  ms.NextWS();
  cb();
}

function getPrev(ms, cb) {
  ms.PrevWS();
  cb();
}

function getToWS(wsId, ms, cb) {
  ms.GoToWS(wsId);
  cb();
}

function loop(ms, key) {
  let spindleSpeedNew;
  let feedRateNew;
  if (loopStates[path] === true) {
    let rc = ms.AdvanceState();
    spindleSpeedNew = Number(ms.GetCurrentSpindleSpeed());
    feedRateNew = Number(ms.GetCurrentFeedrate());
    if(spindleSpeed !== spindleSpeedNew){
      spindleSpeed = spindleSpeedNew;
      app.ioServer.emit('nc:spindle', spindleSpeed);
    }
    if(feedRate !== feedRateNew){
      feedRate = feedRateNew;
      app.ioServer.emit('nc:feed', feedRate);
    }
    if (rc === 0) {  // OK
      getDelta(ms, key, function(b) {
        app.ioServer.emit('nc:delta', JSON.parse(b));
        if (playbackSpeed > 0) {
          if (loopTimer !== undefined) {
            clearTimeout(loopTimer);
          }
          if(changed){
            changed = false;
            loopTimer = setTimeout(() => loop(ms, true), 50/(playbackSpeed/200));
          }
          else{
            loopTimer = setTimeout(() => loop(ms, false), 50/(playbackSpeed/200));
          }
        }
      });
    } else if (rc === 1) {   // SWITCH Workingstep
      let setup = sameSetup(ms.GetWSID(), ms.GetNextWSID());
      if (!setup) {
        loopStates[path] = false;
        update('pause');
        changed = true;
        justchanged = true;
      }
      if(!changed){
        getNext(ms, function() {
          loop(ms, true);
        });
      }
        getDelta(ms, key, function(b) {
          app.ioServer.emit('nc:delta', JSON.parse(b));
          if (playbackSpeed > 0) {
            if (loopTimer !== undefined) {
              clearTimeout(loopTimer);
            }
            loopTimer = setTimeout(() => loop(ms, false), 50/(playbackSpeed/200));
          }
        });
      }
  }
}

function sameSetup(newid, oldid) {
  return (step.getSetupFromId(newid) === step.getSetupFromId(oldid)); //Finds the higher level container of the current workingstep
}

function handleWSInit(command, res) {
  let temp = loopStates[path];
  loopStates[path] = true;
  if (!temp) {
    loop(file.ms, false);
  }
  switch (command) {
    case 'next':
      if (temp) {
        getNext(file.ms, function() {
          loop(file.ms, true);
        });
      } else {
        getNext(file.ms, function() {
          loop(file.ms, true);
        });
        loopStates[path] = false;
        update('pause');
      }
      res.sendStatus(200);
      break;
    case 'prev':
      if (temp) {
        getPrev(file.ms, function() {
          loop(file.ms, true);
        });
      } else {
        getPrev(file.ms, function() {
          loop(file.ms, true);
        });
        loopStates[path] = false;
        update('pause');
      }
      res.sendStatus(200);
      break;
    default:
      if (isNaN(parseFloat(command))
        || !isFinite(command)) {
        break;
      }
      let ws = Number(command);
      if (temp) {
        getToWS(ws, file.ms, function() {
          loop(file.ms, true);
        });
      } else {
        getToWS(ws, file.ms, function() {
          loop(file.ms, true);
        });
      }
      loopStates[path] = false;
      update('pause');
      res.sendStatus(200);
  }
}

/***************************** Endpoint Functions *****************************/

function _loopInit(req, res) {
  // app.logger.debug('loopstate is ' + req.params.loopstate);
  var ms = file.ms;
  //console.log(req);
  spindleSpeed = Number(ms.GetCurrentSpindleSpeed());
  feedRate = Number(ms.GetCurrentFeedrate());
  if (req.params.loopstate === undefined) {
    if (loopStates[path] === true) {
      res.status(200).send(JSON.stringify({
        'state': 'play',
        'speed': playbackSpeed,
        'spindle': spindleSpeed,
        'feed': feedRate,
      }));
    } else {
      res.status(200).send(JSON.stringify({
        'state': 'pause',
        'speed': playbackSpeed,
        'spindle': spindleSpeed,
        'feed': feedRate,
      }));
    }
  } else {
    let loopstate = req.params.loopstate;
    //var ms = file.ms;
    if (typeof loopStates[path] === 'undefined') {
      loopStates[path] = false;
    }
    switch (loopstate) {
      case 'start':
        if (loopStates[path] === true) {
          res.status(200).send('Already running');
          return;
        }
        // app.logger.debug('Looping ' + path);
        loopStates[path] = true;
        if (justchanged) {
          justchanged = false;
          getNext(file.ms, function() {
            loop(file.ms, true);
          });
        }
        res.sendStatus(200);
        update('play');
        loop(ms, false);
        break;
      case 'stop':
        if (loopStates[path] === false) {
          res.status(200).send('Already stopped');
          return;
        }
        loopStates[path] = false;
        update('pause');
        res.sendStatus(200);
        break;
      default:
        if (isNaN(parseFloat(loopstate)) || !isFinite(loopstate)) {
          break;
        }
        let newSpeed = Number(loopstate);

        if (Number(playbackSpeed) !== newSpeed) {
          playbackSpeed = newSpeed;
          // app.logger.debug('Changing speed to ' + newSpeed);
        }

        if (loopStates[path] === true) {
          loop(ms, false);
          res.status(200).send(JSON.stringify({
            'state': 'play',
            'speed': playbackSpeed,
          }));
        } else {
          res.status(200).send(JSON.stringify({
            'state': 'pause',
            'speed': playbackSpeed,
          }));
        }
        updateSpeed(playbackSpeed);
    }
  }
}

var _wsInit = function(req, res) {
  let temp = false;
  if (!req.params.command) {
    return;
  }
  if (typeof loopStates[path] === 'undefined') {
    loopStates[path] = false;
  }

  handleWSInit(req.params.command, res);
  if(justchanged){
    temp = true;
  }
  getDelta(file.ms, justchanged, function(b) {
    app.ioServer.emit('nc:delta', JSON.parse(b));
    if (playbackSpeed > 0) {
      if (loopTimer !== undefined) {
        clearTimeout(loopTimer);
      }
      loopTimer = setTimeout(function () {
        loop(file.ms, false);
      }, 50 / (playbackSpeed / 200));
    }
  });
};

function _getKeyState(req, res) {
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  res.status(200).send(ms.GetKeystateJSON());
}

function _getDeltaState(req, res) {
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  res.status(200).send(ms.GetDeltaJSON());
}

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v3/nc/state/key', _getKeyState);
  app.router.get('/v3/nc/state/delta', _getDeltaState);
  app.router.get('/v3/nc/state/loop/:loopstate', _loopInit);
  app.router.get('/v3/nc/state/loop/', _loopInit);
  app.router.get('/v3/nc/state/ws/:command', _wsInit);

  if (cb) {
    cb();
  }
};
