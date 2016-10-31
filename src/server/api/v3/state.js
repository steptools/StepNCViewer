'use strict';
var file = require('./file');
var find = file.find;
var apt = file.apt;
var step = require('./step');

var request = require('superagent');
var parseXMLString = require('xml2js');
var _ = require('lodash');
var fs = require('fs');

var Worker = require('tiny-worker');
let worker = {};
try{
  worker = new Worker('./src/server/api/v3/parseupdatethread.js');
} catch(e){console.log(e);};

var app;
var loopTimer;
var loopStates = {};
let path = find.GetProjectName();
let init = false;

var WSGCodeIndex = 0;
var WSGCode = [];
var WSArray = [];
let nextSequence = 0;
let changed=false;

let MTCHold = {'feedrateUnits':'Millimeters/Second'};

let currentMachine = 0;

let keyCache = {};

/****************************** Helper Functions ******************************/

function getWorkingstepsArray(id){
  if(!find.IsEnabled(id)) return;
  if(find.IsWorkingstep(id)){
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

function updateMTC(){
  app.ioServer.emit('nc:mtc',MTCHold);
}


var findWS = function(current) {
  var change = false;

  if (current < WSGCode.worksteps[WSGCodeIndex]) {
    WSGCodeIndex = 0;
    change = true;
    //app.logger.debug("Starting from 0");
  }

  while (current > WSGCode.worksteps[WSGCodeIndex + 1]) {
    WSGCodeIndex = WSGCodeIndex + 1;
    change = true;
    if (WSGCodeIndex === WSGCode.worksteps.length - 1) {
      break;
    }
  }

  return change;
};

var BaseOptFeed = (lineNumber)=>{
  if(WSGCode.feeds[lineNumber]){
    return WSGCode.feeds[lineNumber];
  }else{
    return {base:-1,optimized:-1};
  }
}

let startSequence = "";
var loadMTCHold = (addr,port)=>{
  return new Promise((resolve)=>{
    request
    .get(addr+":"+port+"/current")
    .then((res)=>{
    parseXMLString.parseString((res.text),(err,result)=>{
    startSequence = result.MTConnectStreams.Header[0]['$'].nextSequence;
  let find = result.MTConnectStreams.Streams[0].DeviceStream[0].ComponentStream;
  let spindletag = _.find(find,(tag)=>{
      if(tag.$.name ==='C' && tag.$.component ==='Rotary'){
    return true;
  } else {
    return false;
  }
});
  let pathtag = _.find(find,(tag)=>{
      if(tag.$.name === 'path') {
    return true;
  } else {
    return false;
  }
});
  MTCHold.live=true;
  spindleUpdate(spindletag.Samples[0].RotaryVelocity[1]._);
  feedUpdate(pathtag.Samples[0].PathFeedrate[1]._);
  blockUpdate(pathtag.Events[0]['e:BlockNumber'][0]._,pathtag.Events[0].Block[0]._);
  pathUpdate(pathtag.Samples[0].PathPosition[0]._);
  resolve();
});
})
.catch((err)=>{
    console.log(err);
  resolve();
});
});
};

function getNext(ms) {
  return ms.NextWS();
}

function getPrev(ms) {
  return ms.PrevWS();
}

function getToWS(wsId, ms) {
  return ms.GoToWS(wsId);
}

//==========STATE UPDATERS==============
//Handle Mp1BlockNumber, Mp1Block
var blockUpdate=function(number,block){
  let change = false;
  if(number!=undefined && number!==MTCHold.currentGcodeNumber){
    MTCHold.currentGcodeNumber = number;
    let feeds = BaseOptFeed(number);
    MTCHold.baseFeed = feeds.base;
    MTCHold.optimizedFeed = feeds.optimized;
    change = true;
  }
  if(block!==undefined && block !=="" && block!=MTCHold.currentGcode){
    MTCHold.currentGcode = block;
    change = true;
  }
  if(change) {
    if(findWS(MTCHold.currentGcodeNumber)){
      file.ms.GoToWS(WSArray[WSGCodeIndex])
          .then(()=> {
            return file.ms.GetKeyStateJSON();
          })
          .then((r)=>{
            let key = JSON.parse(r);
            keyCache = key;
            app.ioServer.emit('nc:delta',key);
          });
    }
    updateMTC();
  }
};
//Handle MS1speed
var spindleUpdate=function(speed){
  if(speed!== MTCHold.spindleSpeed){
    MTCHold.spindleSpeed = speed;
    updateMTC();
  }
};
//Handle Mp1LPathPos
var pathUpdate=function(position){
  return new Promise((resolve)=>{
    if(position===undefined) resolve();
    let incoords = position.split(' ');
    let coords = {};
    coords.x = Number(incoords[0]);
    coords.y = Number(incoords[1]);
    coords.z = Number(incoords[2]);
    file.ms.SetToolPosition(coords.x, coords.y, coords.z, 0, 0, 1)
        .then(()=> {
          return file.ms.GetDeltaStateJSON();
        })
        .then((d)=> {
          app.ioServer.emit('nc:delta', JSON.parse(d));
          resolve();
        });
  });
};
//Handle Mp1Fact
var feedUpdate=function(feedrate){
  if(feedrate!==MTCHold.feedrate) {
    MTCHold.feedrate = feedrate;
      updateMTC();
  }
};
//==========END STATE UPDATERS==========
//==========WORKER THREAD PROCESSOR=====
worker.onmessage = (ev)=>{
  _.forIn(ev.data,(val,key)=>{
    switch(key){
      case "pathUpdate":
        pathUpdate(val);
        break;
      case "feedUpdate":
        feedUpdate(val);
        break;
      case "speedUpdate":
        spindleUpdate(val);
        break;
      case "blockUpdate":
        blockUpdate(undefined,val);
        break;
      case "blockNumberUpdate":
        blockUpdate(val);
        break;
    }
  });
}
//==========END PROCESSOR===============

let mtcFile = null;
var makeMTC = function(fname){
  return new Promise((resolve)=>{let GCodeFile = fname+".min";
    fs.readFile(GCodeFile, function(err, res) {
      let MTCcontent = [];
      let GCcontent = [];
      let MTCFname = fname+".mtc";
      let lineNumber = 0;
      let GCodes = null;
      let FeedContent = {};
	
      let feed_re = /\FEED OVERRIDE ([\d.]+) X ([\d.]+)/;	
      let feed_parse;
	
      if (res) {
        GCodes = res.toString().split('\r\n');
      }
      _.each(GCodes, function(line) {
        if (line[0] === '(') {
          if (line.substring(1, 12) === 'WORKINGSTEP') {
            MTCcontent.push(lineNumber);
          }
	  else if (feed_parse = line.match(feed_re)){
	      let basefeed = new Number(feed_parse[1]);
	      let percent = new Number(feed_parse[2]);

	      let optfeed = basefeed * percent / 100;
	      
            FeedContent[lineNumber+1] = {};
//	      console.log ("Base=" + base + "  percent=" + percent);
              FeedContent[lineNumber+1].optimized = optfeed;
              FeedContent[lineNumber+1].base = basefeed;
          } 
        } else {
          if (line.substring(0,2) != 'IF') {
            GCcontent.push(line);
            lineNumber++;
          }
        }
      });
      MTCcontent[0]=0; //First WS can include pre-setup info
      let rtn = {worksteps:MTCcontent,feeds:FeedContent,GCode:GCcontent};
      fs.writeFile(MTCFname,
          JSON.stringify(rtn,null,1),
          (err)=>{
            if(err) console.log(err);
            resolve(rtn);
          });
    });
  });
};
var parsePromise = null; //For preventing race conditions
var parseGCodes = function(fname) {
  let MTCFname = fname+'.mtc';
  if(!parsePromise) {
    parsePromise = new Promise(function (resolve) {
      if (mtcFile){
        parsePromise = null;
        resolve(mtcFile);
      }
      fs.readFile(MTCFname, function (err, res) {
        if (err) { //No MTC File, make it.
          makeMTC(fname)
          .then((rtn)=> {
            mtcFile = rtn;
            parsePromise = null;
            resolve(rtn);
          });
        }
        else { //Read from MTC File.
          mtcFile = JSON.parse(res.toString());
          parsePromise = null;
          resolve(mtcFile);
        }
      });
    });
  }
  return parsePromise;
};

/***************************** Endpoint Functions *****************************/


var _loopInit = function(req, res) {

  if(!init){
    init = true;
    workingstepsArrayDriver();
  }

  parseGCodes(app.project.substring(0,app.project.length-6))
      .then((parsed)=>{
        WSGCode = parsed;
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
              console.log('starting...');
              let machineAddress = app.config.machineList[0].address.split(':')[0];
              let machinePort = app.config.machineList[0].address.split(':')[1];
              loadMTCHold(machineAddress,machinePort)
                  .then(()=>{worker.postMessage({'msg':'start','machineAddress':machineAddress,'machinePort':machinePort,'startSequence':startSequence});});
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
                if (loopStates[path] === true) {
                  res
                      .status(200)
                      .send(JSON.stringify({
                        'state': 'play',
                      }));
                } else {
                  res
                      .status(200)
                      .send(JSON.stringify({
                        'state': 'pause',
                      }));
                }
              }
          }
        }
      });
};

var _getKeyState = function (req, res) {
  if(!_.isEmpty(keyCache)) {
    res.status(200).send(keyCache);
    return;
  }
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  ms.GetKeyStateJSON()
      .then((r)=>{
        res.status(200).send(r);
      });
};

var _getDeltaState = function (req, res) {
  var ms = file.ms;
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  ms.GetDeltaStateJSON()
      .then((r)=>{
        res.status(200).send(r);
      });
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
  app.router.get('/v3/nc/state/mtc', _getMTCHold);
  app.router.get('/v3/nc/state/machine/:id', _machineInfo);
  app.router.get('/v3/nc/state/machine', _machineInfo);
  app.router.get('/v3/nc/state/machines', _getAllMachines);
  if (cb) {
    cb();
  }
};
