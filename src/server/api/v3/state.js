/* 
 * Copyright (c) 2016-2017 by STEP Tools Inc. 
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 */

'use strict';
let file = require('./file');
let step = require('./step');
let ms = {}; //module.exports defines it.
let _ = require('lodash');
let scache = require('./statecache');
let find = file.find;
let app;
let loopTimer = {};
let loopStates = {};
let playbackSpeed = 100;
let spindleSpeed;
let feedRate;
let path = find.GetProjectName();
let changed=false;
let setupFlag = false;
let mtcadapter ={}; 
let runProbeAdapter = false;

let probepause = false;
let _timestep = new Number(.1);
/****************************** Helper Functions ******************************/
let keyCache = {};
let deltaCache = {};
function update(val) {
  app.ioServer.emit('nc:state', val);
}

function updateSpeed(speed) {
  app.ioServer.emit('nc:speed', speed);
  if(speed > 200) {
    _timestep = (.1 * (speed/200));
    speed = 200;
  }
  else if(_timestep!==.1){
     _timestep=.1;
  }
}

function getDelta(key) {
  if (key===true) {
    return ms.GetKeyStateJSON();
  } else {
    return ms.GetDeltaStateJSON();
  }
}

function getFirst(){
  changed=true;
  setupFlag=false;
  return ms.FirstWS();
}

function getNext() {
  changed=true;
  setupFlag =false;
  return ms.NextWS();
}

function getPrev() {
  changed=true;
  setupFlag =false;
  return ms.PrevWS();
}

function getToWS(wsId) {
  changed=true;
  setupFlag =false;
  return ms.GoToWS(wsId);
}

function promiseTimeout(msec){
  return new Promise((resolve)=>{
    setTimeout(resolve,msec);
  });
}

let isTicking = false;
let movequeue = [];
let loopTimeout = ()=>{
  if (playbackSpeed===0) {
    loopTimer = promiseTimeout(20000);
  } else {
    loopTimer = promiseTimeout(50/(playbackSpeed/200));
  }
  return loopTimer.then(() => {
    loopTimer = {};
    return looptick();
  });
};
function looptick(){
  if (movequeue.length > 0) {
    let move = movequeue.shift();
    return move()
      .then(()=>{
        return getDelta(true);
      }).then((newState)=>{
        keyCache = JSON.parse(newState);
        return app.updateDynamic();
      }).then(()=>{
        app.ioServer.emit('nc:delta', keyCache);
      }).then(()=>{
        return loopTimeout();
      });
  } else if (loopStates[path]===true) {
    if (setupFlag===true){ //Somebody pushed play after it paused for a setup end
      movequeue.push(()=>{
        return getNext();
      });
      setupFlag =false;
      return loopTimeout();
    } else {
      loop(false).then(()=>{
        return loopTimeout();
      });
    }
  }
  else {
    return loopTimeout();
  }
}

function loop(key) {
  if (changed) {
    changed=false;
    key = true;
  }
  return Promise.all([
      ms.GetCurrentSpindleSpeed(),
      ms.GetCurrentFeedrate()
    ])
    .then((newspeedfeed)=> {
      let spindleSpeedNew = Number(newspeedfeed[0]);
      let feedRateNew = Number(newspeedfeed[1]);
      if (spindleSpeed !== spindleSpeedNew) {
        spindleSpeed = spindleSpeedNew;
        app.ioServer.emit('nc:spindle', spindleSpeed);
      }
      if (feedRate !== feedRateNew) {
        feedRate = feedRateNew;
        app.ioServer.emit('nc:feed', feedRate);
      }
      //get the delta
      return getDelta(key);
    }).then((newState)=> {
      if (key) {
        keyCache = JSON.parse(newState);
      } else {
        deltaCache = JSON.parse(newState);
      }
      return app.updateDynamic();
    }).then(()=>{
      app.ioServer.emit('nc:delta', key?keyCache:deltaCache);
      //change the working step
      return ms.AdvanceStateByT(Number(_timestep));
    }).then((shouldSwitch)=>{
      if (shouldSwitch.hasOwnProperty('probe')) {
        if (runProbeAdapter === true) {
          ms.GetWSID()
            .then((id) => {
              let probedata = file.tol.GetProbeResults(id, shouldSwitch.probe.contact[0], shouldSwitch.probe.contact[1], shouldSwitch.probe.contact[2]);
              mtcadapter.write(probedata);
            });
        }
        app.ioServer.emit('nc:probe',shouldSwitch.probe);
        if(probepause){
          loopStates[path] = false;
          update('pause');
        }
        return getDelta(true)
          .then((key)=>{
            keyCache = JSON.parse(key);
            app.ioServer.emit('nc:delta', keyCache);
          });
      }
      if (shouldSwitch.value >0) {
        return Promise.all([
            ms.GetWSID(),
            ms.GetNextWSID()
          ])
          .then((wsids)=>{
            let keepSetup = false;
            if (!(wsids[1]===-1)) {
              keepSetup = sameSetup(wsids[0],wsids[1]);
            }
            if (!keepSetup) { //Stop on setup changes.
              loopStates[path] = false;
              update('pause');
              setupFlag = true;
              return;
            } else {
              movequeue.push(()=>{
                return getNext();
              });
            }
          });
      }
    });
}

function sameSetup(newid, oldid) {
  return (step.getSetupFromId(newid) === step.getSetupFromId(oldid)); //Finds the higher level container of the current workingstep
}

function handleWSInit(command, res) {
  switch (command) {
    case 'next':
      movequeue.push(()=>{
        return getNext().then(()=>{res.status(200).send();});
      });
      break;
    case 'prev':
      movequeue.push(()=>{
        return getPrev().then(()=>{res.status(200).send();});
      });
      break;
    case 'first':
      movequeue.push(()=>{
        return getFirst().then(()=>{res.status(200).send();});
      });
    default:
      if (isNaN(parseFloat(command))
        || !isFinite(command)) {
        break;
      }
      let ws = Number(command);
      movequeue.push(()=>{
        return getToWS(ws).then(()=>{res.status(200).send();});
      });
  }
}

/***************************** Endpoint Functions *****************************/

function _loopInit(req, res) {
  // app.logger.debug('loopstate is ' + req.params.loopstate);
  if (!isTicking) {
    isTicking=true;
    looptick();
  }
  Promise.all([
    ms.GetCurrentSpindleSpeed(),
    ms.GetCurrentFeedrate()
  ])
    .then((initialspeedfeed)=>{
      let initialspindleSpeed = initialspeedfeed[0];
      let initialfeedRate = initialspeedfeed[1];
      if (req.params.loopstate === undefined) {
        spindleSpeed = initialspindleSpeed;
        feedRate = initialfeedRate;
        if (loopStates[path] === true) {
          res.status(200).send({
            'state': 'play',
            'speed': playbackSpeed,
            'spindle': spindleSpeed,
            'feed': feedRate,
          });
        } else {
          res.status(200).send({
            'state': 'pause',
            'speed': playbackSpeed,
            'spindle': spindleSpeed,
            'feed': feedRate,
          });
        }
      } else {
        let loopstate = req.params.loopstate;
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
            res.sendStatus(200);
            update('play');
            //loop(ms, false);
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
              //loop(ms, false);
              res.status(200).send({
                'state': 'play',
                'speed': playbackSpeed,
              });
            } else {
              res.status(200).send({
                'state': 'pause',
                'speed': playbackSpeed,
              });
            }
            updateSpeed(playbackSpeed);
        }
      }
    });
}

var _wsInit = function(req, res) {
  if (!req.params.command) {
    return;
  }
  if (typeof loopStates[path] === 'undefined') {
    loopStates[path] = false;
  }

  handleWSInit(req.params.command, res);

//  getDelta(true)
//    .then((b)=> {

//      app.ioServer.emit('nc:delta', JSON.parse(b));
//    });
};

function _getProductState(req, res) {
  if (!isNaN(Number(req.params.eid)) && isFinite(Number(req.params.eid))) {
    res.status(200).send(find.GetJSONProduct(Number(req.params.eid)));
  }
  return;
}
function _getKeyState(req, res) {
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  if (_.isEmpty(keyCache)) {
    getDelta(true)
    .then((r)=>{
      keyCache = JSON.parse(r);
      return app.updateDynamic();
    }).then(()=>{
      res.status(200).send(keyCache);
    });
  } else {
    res.status(200).send(keyCache);
  }
}

function _getDeltaState(req, res) {
  if (ms === undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  if (_.isEmpty(deltaCache)) {
    getDelta(false)
      .then((r)=>{
        deltaCache = JSON.parse(r);
        return app.updateDynamic();
      }).then(()=>{
        res.status(200).send(deltaCache);
      });
  } else {
    res.status(200).send(deltaCache);
  }
}
function _saveDeltaState(req,res){
  if (ms===undefined) {
    res.status(404).send('Machine state could not be found');
    return;
  }
  let fname = find.GetProjectName();
  ms.WriteDynamicGeometrySTEP(fname+"delta.stp");
  res.status(200).send();
}
module.exports = function(globalApp, cb) {
  app = globalApp;
  app.router.get('/v3/nc/state/product/:eid(\\d+)', _getProductState);
  app.router.get('/v3/nc/state/key', _getKeyState);
  app.router.get('/v3/nc/state/delta', _getDeltaState);
  app.router.get('/v3/nc/state/loop/:loopstate', _loopInit);
  app.router.get('/v3/nc/state/loop/', _loopInit);
  app.router.get('/v3/nc/state/ws/:command', _wsInit);
  app.router.get('/v3/nc/state/delta/save', _saveDeltaState);
  if (app.config.noCache===true) {
    ms = file.ms;
    if(app.config.probeAdapter===true){
      mtcadapter = require('./ProbeAdapter');
      mtcadapter.ProgramID(find.GetProjectName());
      runProbeAdapter = true;
    }
  } else {
    ms = scache;
    ms.Initialize();
  }
  if (cb) {
    cb();
  }

  app.events.on('deltaReset',()=>{
    movequeue.push(()=>{return Promise.resolve();});
  });
};
