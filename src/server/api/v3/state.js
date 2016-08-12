'use strict';
var file = require('./file');
var find = file.find;
var apt = file.apt;
var step = require('./step');
var request = require('superagent');
var parseXMLString = require('xml2js');
var _ = require('lodash');
var fs = require('fs');

var app;
var loopTimer;
var loopStates = {};
let playbackSpeed = 100;
let spindleSpeed;
let feedRate;
let path = find.GetProjectName();
let init = false;

var WSGCodeIndex = 0;
var WSGCode = [];
var WSArray = [];
let nextSequence = 0;
let changed=false;

var MTCHold = {};

let currentMachine = 0;
/****************************** Helper Functions ******************************/

function getWorkingstepsArray(id){
  if(find.IsWorkingstep(id) && find.IsEnabled(id)){
    WSArray.push(id);
  }
  if (!find.IsWorkingstep(id)) {
    let children = find.GetNestedExecutableAll(id);
    if (children !== undefined) {
      children.map((child) => getWorkingstepsArray(child));
    }
  }
}

function workingstepsArrayDriver(){
  let id = find.GetMainWorkplan();
  getWorkingstepsArray(id);
}

function update(val) {
  app.ioServer.emit('nc:state', val);
}

function updateSpeed(speed) {
  app.ioServer.emit('nc:speed', speed);
}

var MTListen = function() {
  var resCoords = [];
  var xOffset;
  var yOffset;
  var zOffset;
  var currentgcode;
  var feedrate;
  var live = false;
  var gcode;

  return new Promise(function(resolve) {
    let addr = 'http://' + app.config.machineList[currentMachine].address + '/current';

    let mtc = request.get(addr);
    mtc.end(function (err, res) {
      if (err || !res.ok) {
        return;
      }
      parseXMLString.parseString(res.text, function (error, result) {
        let find = result['MTConnectStreams']['Streams'][0];
        find = find['DeviceStream'][0]['ComponentStream'];
        let pathtag = _.find(find, function(tag) {
          if (tag['$']['name'] === 'path') {
            return true;
          } else {
            return false;
          }
        });
        resCoords = pathtag["Samples"][0]["PathPosition"][0]['_'].split(' ');
        feedrate = pathtag["Samples"][0]['PathFeedrate'][1]['_'];
        gcode = pathtag['Events'][0]['Block'][0]['_'];
        currentgcode = pathtag['Events'][0]['e:BlockNumber'][0]['_'];
        let header = result['MTConnectStreams']['Header'][0].$;
        let next = header.nextSequence;
        if (next !== nextSequence) {
          nextSequence = next;
          live = true;
        }
      });

      var coords = [];
      coords[0] = parseInt(resCoords[0]);
      coords[1] = parseInt(resCoords[1]);
      coords[2] = parseInt(resCoords[2]);

      let addr = 'http://' + app.config.machineList[currentMachine].address + '/';
      let mtc = request.get(addr);

      mtc.end(function (err, res) {
        parseXMLString.parseString(res.text, function (error, result) {
          let ret = result['MTConnectDevices']['Devices'][0]['Device'][0]['Components'][0]['Controller'][0]['Components'][0]['Path'][0]['DataItems'][0]['DataItem'];
          let feedrateUnits = _.find(ret, function(dataitem) {
            if (dataitem['$'].type === 'PATH_FEEDRATE') {
              return true;
            } else {
              return false;
            }
          });
          feedrateUnits = feedrateUnits['$']['units'];
          resolve([coords, xOffset, yOffset, zOffset, currentgcode, feedrate, feedrateUnits, live, gcode]);
        });
      });
    });
  });
};

var findWS = function(current) {
  var change = false;

  if (current < WSGCode['worksteps'][WSGCodeIndex]) {
    WSGCodeIndex = 0;
    change = true;
    //app.logger.debug("Starting from 0");
  }

  while (current > WSGCode['worksteps'][WSGCodeIndex + 1]) {
    WSGCodeIndex = WSGCodeIndex + 1;
    change = true;
    if (WSGCodeIndex === WSGCode['worksteps'].length - 1) {
      break;
    }
  }

  return change;
};

//TODO: Get rid of this function and consolidate with endpoint functions
var _getDelta = function(ms, key, cb) {
  let holder = '';
  let theQuestion = MTListen();

  theQuestion.then(function(res) {
    MTCHold.feedrate = 'Not defined';
    MTCHold.gcode = 'Not defined';
    MTCHold.spindleSpeed = 'Not defined';
    MTCHold.feedrate = res[5];
    MTCHold.feedrateUnits = res[6];
    MTCHold.gcode = WSGCode['GCode'][res[4]];
    MTCHold.live = res[7];
    MTCHold.realgcode = res[8];

    if (findWS(res[4]) ) {
      ms.GoToWS(WSArray[WSGCodeIndex]);
      holder = JSON.parse(ms.GetKeystateJSON());
      holder.next = true;
    } else {
      holder = JSON.parse(ms.GetDeltaJSON());
      holder.next = false;
    }
    holder.mtcoords = res[0];
    holder.gcode = res[4];
    holder.feed = res[5];
    let workplansetup = step.getSetupFromId(holder['workingstep']);
    if (workplansetup !== 0) {
      holder.offset = apt.GetWorkplanSetup(workplansetup);
    } else {
      holder.offset = [0, 0, 0, 0, 0, 1, 1, 0, 0];
    }
    let response = JSON.stringify(holder);
    //app.logger.debug('got ' + response);
    cb(response);
  });
};

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

var loop = function(ms, key, wsgcode) {
  if (loopStates[path] === true) {
    _getDelta(ms, key, function(b) {
      app.ioServer.emit('nc:delta', JSON.parse(b));
      app.ioServer.emit('nc:mtc', MTCHold);
      if (playbackSpeed > 0) {
        if (loopTimer !== undefined) {
          clearTimeout(loopTimer);
        }
        loopTimer = setTimeout(() => loop(ms, false), 50/(playbackSpeed/200));
      }
    });
  }
};

var parseGCodes = function() {
  let GCodeFile = app.project.substring(0, app.project.length - 5) + 'min';
  let MTCfile = app.project.substring(0, app.project.length - 5) + 'mtc';
  let lineNumber = 0;

  let fileRead = new Promise(function(resolve) {
    var MTCcontent = [];
    var GCcontent = [];
    fs.readFile(GCodeFile, function(err, res) {
      var GCodes = null;
      if (res) {
        GCodes = res.toString().split('\n');
      }
      _.each(GCodes, function(line) {
        if (line[0] === '(') {
          if (line.substring(1, 12) === 'WORKINGSTEP') {
            MTCcontent.push(lineNumber);
          }
        } else {
					if (line.substring(0,2) != 'IF') {
	          GCcontent.push(line);
	          lineNumber++;
					}

        }
      });
      resolve([MTCcontent, GCcontent]);
    });
  });

  fileRead.then(function(res) {
    res[0].shift();

    var JSONContent = '{\"worksteps\" : [\n0,\n';
    _.each(res[0], function(code) {
      JSONContent = JSONContent + code.toString() + ',\n';
    });
    JSONContent = JSONContent.substring(0, JSONContent.length - 2)  + '\n],';

    fs.writeFile(MTCfile, JSONContent, (err) => {
      console.log(err);
    });

    JSONContent = JSONContent + '\n\n\"GCode\" : [\n';
    _.each(res[1], function(code) {
      JSONContent = JSONContent + '\"' + code.toString().substring(0, code.toString().length - 1) + '\",\n';
    });
    JSONContent = JSONContent.substring(0, JSONContent.length - 2)  + '\n]}';

    fs.writeFile(MTCfile, JSONContent, {flag: "w+"}, (err) => {
      console.log(err);
    });
    MTCHold.gcode = WSGCode['GCode'][MTCHold.gcode];
  });
};

/***************************** Endpoint Functions *****************************/

var _loopInit = function(req, res) {
  // app.logger.debug('loopstate is ' + req.params.loopstate);
  let MTCfile = app.project.substring(0, app.project.length - 5) + 'mtc';
  if(!init){
    init = true;
    workingstepsArrayDriver();
  }

  fs.readFile(MTCfile, function(err, data) {
    if (err) {
      WSGCode = parseGCodes();
    } else {
      if (data) {
        WSGCode = JSON.parse(data.toString());
        MTCHold.gcode = WSGCode['GCode'][MTCHold.gcode];
      }
    }

    if (req.params.loopstate === undefined) {
      if (loopStates[path] === true) {
        res
          .status(200)
          .send(JSON.stringify({'state': 'play', 'speed': playbackSpeed}));
      } else {
        res
          .status(200)
          .send(JSON.stringify({'state': 'pause', 'speed': playbackSpeed}));
      }
    } else {
      let loopstate = req.params.loopstate;
      var ms = file.ms;
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
          res.status(200).send('OK');
          update('play');
          loop(ms, false, JSON.parse(data.toString()));
          break;
        case 'stop':
          if (loopStates[path] === false) {
            res.status(200).send('Already stopped');
            return;
          }
          loopStates[path] = false;
          update('pause');
          res.status(200).send('OK');
          break;
        default:
          if (!isNaN(parseFloat(loopstate)) && isFinite(loopstate)) {
            let newSpeed = Number(loopstate);
            if (Number(playbackSpeed) !== newSpeed) {
              playbackSpeed = newSpeed;
              // app.logger.debug('Changing speed to ' + newSpeed);
            }
            if (loopStates[path] === true) {
              loop(ms, false, JSON.parse(data.toString()));
              res
                .status(200)
                .send(JSON.stringify({
                  'state': 'play',
                  'speed': playbackSpeed,
                }));
            } else {
              res
                .status(200)
                .send(JSON.stringify({
                  'state': 'pause',
                  'speed': playbackSpeed,
                }));
            }
            updateSpeed(playbackSpeed);
          }
      }
    }
  });
};

var _wsInit = function(req, res) {
  if (req.params.command) {
    let command = req.params.command;
    var ms = file.ms;
    if (typeof loopStates[path] === 'undefined') {
      loopStates[path] = false;
    }

    switch (command) {
      case 'next':
        var temp = loopStates[path];
        loopStates[path] = true;
        if (temp) {
          getNext(ms, function() {
            loop(ms, true);
          });
        } else {
          loop(ms,false);
          getNext(ms, function() {
            loop(ms, true);
          });
          loopStates[path] = false;
          update('pause');
        }
        res.status(200).send('OK');
        break;
      case 'prev':
        var temp = loopStates[path];
        loopStates[path] = true;
        if (temp) {
          getPrev(ms, function() {
            loop(ms, true);
          });
        } else {
          loop(ms,false);
          getPrev(ms, function() {
            loop(ms, true);
          });
          loopStates[path] = false;
          update('pause');
        }
        res.status(200).send('OK');
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
            update('pause');
          } else {
            loop(ms,false);
            getToWS(ws, ms, function() {
              loop(ms, true);
            });
            loopStates[path] = false;
            update('pause');
          }
          res.status(200).send('OK');
        }
    }
    _getDelta(ms, false, function(b) {
      app.ioServer.emit('nc:delta', JSON.parse(b));
      app.ioServer.emit('nc:mtc', MTCHold);
      if (playbackSpeed > 0) {
        if (loopTimer !== undefined) {
          clearTimeout(loopTimer);
        }
        loopTimer = setTimeout(() => loop(ms, false), 50/(playbackSpeed/200));
      } else {
        // app.logger.debug('playback speed is zero, no timeout set');
  		}
		});
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

  getDelta(file.ms, false, function(b) {
    app.ioServer.emit('nc:delta', JSON.parse(b));
    if (playbackSpeed > 0) {
      if (loopTimer !== undefined) {
        clearTimeout(loopTimer);
      }
    }
  });
};

var _getKeyState = function (req, res) {
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  res.status(200).send(ms.GetKeystateJSON());
};

var _getDeltaState = function (req, res) {
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  res.status(200).send(ms.GetDeltaJSON());
};

var _getMTCHold = function (req, res) {
  res.status(200).send(MTCHold);
};

let _machineInfo = (req, res) => {
  if (req.params.id) {
    currentMachine = Number(req.params.id);
    res.status(200).send('OK');
  } else {
    res.status(200).send(currentMachine.toString());
  }
};

let _getAllMachines = (req, res) => {
  res.status(200).send(app.config.machineList);
}

module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v3/nc/state/key', _getKeyState);
  app.router.get('/v3/nc/state/delta', _getDeltaState);
  app.router.get('/v3/nc/state/loop/:loopstate', _loopInit);
  app.router.get('/v3/nc/state/loop/', _loopInit);
  app.router.get('/v3/nc/state/ws/:command', _wsInit);
  app.router.get('/v3/nc/state/mtc', _getMTCHold);
  app.router.get('/v3/nc/state/machine/:id', _machineInfo);
  app.router.get('/v3/nc/state/machine', _machineInfo);
  app.router.get('/v3/nc/state/machines', _getAllMachines);
  if (cb) {
    cb();
  }
};
