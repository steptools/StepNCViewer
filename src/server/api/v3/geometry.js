"use strict";
var StepNC = require('stepncnode/build/Release/StepNC');
var file = require('./file');

///*******************************************************************\
//|                                                                    |
//|                       Helper Functions                             |
//|                                                                    |
//\*******************************************************************/



///*******************************************************************\
//|                                                                    |
//|                       Endpoint Functions                           |
//|                                                                    |
//\*******************************************************************/

let _getGeometry = function(req , res){
  let ms = file.ms;

  if(req.params.type === "shell"){
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "MESH"));
    return;
  }
  else if(req.params.type === "annotation"){
    res.status(200).send(ms.GetGeometryJSON(req.params.uuid , "POLYLINE"));
    return;
  }
  res.status(200).send(ms.GetGeometryJSON());
  return;
}

module.exports = function(app, cb) {
  app.router.get("/v3/nc/geometry", _getGeometry);
  app.router.get("/v3/nc/geometry/:uuid/:type", _getGeometry);
  if (cb) cb();
};
