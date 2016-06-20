"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var file = require('./file');
var app;

var _getGeometry = function(req , res){
  if (req.params.ncId) {
    let ncId = req.params.ncId;
    var ms = file.getMachineState(app, ncId);
    if (ms === undefined) {
      res.status(404).send("Project does not exist");
      return;
    }
  }
  
  if(req.params.type === "shell"){
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "MESH"));
    return;
  }
  else if(req.params.type === "annotation"){
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "POLYLINE"));
    return;
  }
  let ret = '';
  ret = ms.GetGeometryJSON();
  res.status(200).send(ret);
  return;
}

module.exports = function(app, cb) {
  app.router.get("/v2/nc/projects/:ncId/geometry", _getGeometry);
  app.router.get("/v2/nc/projects/:ncId/geometry/:uuid/:type", _getGeometry);
  //app.router.get("/v2/nc/projects/:ncId/geometry/:type/:uuid", _getGeometry);
  if (cb) cb();
};
