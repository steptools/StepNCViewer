"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var file = require('./file');
var app;


var _getGeometry = function(req , res){
  if (req.params.ncId) {
    let ncId = req.params.ncId;
    var ms = file.getMachineState(ncId);
  }
  if(req.params.type === "shell"){
    console.log(ms.GetGeometryJSON(req.params.uuid , "POLYLINE"));
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "MESH"));

  }
  else if(req.params.type === "annotation"){
    console.log(ms.GetGeometryJSON(req.params.uuid , "POLYLINE"));
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "POLYLINE"));

  }
}
module.exports = function(app, cb) {
  app.router.get("/v2/nc/projects/:ncId/geometry", _getGeometry);
  app.router.get("/v2/nc/projects/:ncId/geometry/:uuid/:type", _getGeometry);
  if (cb) cb();
};
