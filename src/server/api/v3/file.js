'use strict';
let StepNC = require('STEPNode');
let fs = require('fs');
let _ = require('lodash');
let Worker = require('tiny-worker');
let worker = new Worker('./src/server/api/v3/machinestatethread.js');
let Path = require('path');
let resolves = {};
worker.onmessage = (ev)=>{
  let cb = eval(ev.data.cb);
  cb(ev.data.val);
};
let msid = 0;

function init(path, machinetool) {
  fs.accessSync(path, fs.R_OK , () => process.exit());
  this.apt = new StepNC.AptStepMaker();
  try {
    fs.accessSync(machinetool,fs.R_OK)
  } catch (e){
    machinetool="";
  }
  this.find = new StepNC.Finder();
  this.tol = new StepNC.Tolerance();

  this.apt.OpenProject(path);
  this.find.OpenProject(path);
  let setms ={ 'msg':'setMachineState','path':path,'sim':true};
  if(machinetool!=="") setms.tool = machinetool;
	worker.postMessage(setms);
  this.ms = {};
  //The following function maps STEPNode.machineState functions into worker-thread message calls.
  //It's kinda like black magic.
  _.forIn(StepNC.machineState.prototype,(val,key)=>{

    this.ms[key] = function(){
      return new Promise((resolve)=>{
        resolves[msid] = (d)=>{resolve(d)};
        let mas="(data)=>{resolves["+msid+"](data);};";
        let msg = {'msg':'getMachine','fun':key,'callback':mas};
        if(arguments.length>0) msg['args']=arguments;
        worker.postMessage(msg);
        msid++
      });
    };
  });

	return;
}

module.exports.init = init;
module.exports.find = this.find;
module.exports.apt = this.apt;
module.exports.tol = this.tol;
module.exports.ms = this.ms;
