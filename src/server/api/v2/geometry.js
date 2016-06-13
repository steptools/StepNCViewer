"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var file = require('./file');
var machineStates = {};
var app;


function _getGeometry(req , res){
  if (req.params.ncId) {
    let ncId = req.params.ncId;
    let ncPath = file.getPath(ncId);
    if (typeof(machineStates[ncId]) === 'undefined') {
      machineStates[ncId] = new StepNC.machineState(ncPath);
    }
  }
  if(req.params.ncId && req.params.type === "shell"){
    res.status(200).send(machineStates[req.params.ncId].GetGeometryJSON(req.params.shellId , "MESH"));

  }
  else if(req.params.ncId && req.params.type === "annotation"){
    res.status(200).send(machineStates[req.params.ncId].GetGeometryJSON(req.params.annoId , "POLYLINE"));

  }
  else if(req.params.ncId){
     let ret = '';
     ret = machineStates[req.params.ncId].GetGeometryJSON();
     console.log(ret);
     res.status(200).send(ret);
  }
}
module.exports = function(app, cb) {
  app.router.get("/v2/nc/projects/:ncId/geometry", _getGeometry);
  app.router.get("/v2/nc/projects/:ncId/geometry/:uuid/:type", _getGeometry);
  if (cb) cb();
};

