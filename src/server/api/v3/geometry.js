'use strict';
var file = require('./file');
var fs = require('fs');
/***************************** Endpoint Functions *****************************/

function _getDelta(req,res){
  file.ms.GetDeltaGeometryJSON(Number(req.params.current))
    .then((rtn)=>{
      res.status(200).send(rtn);
    });
}

function _getGeometry(req, res) {
  let ms = file.ms;
  let find = file.find;
  //Route the /geometry/delta/:current endpoint first.
  if(req.params.id === 'delta') {
    req.params.current = req.params.type;
    _getDelta(req, res);
    return;
  }
  if (req.params.type === 'shell') {
    ms.GetGeometryJSON(req.params.id , 'MESH')
      .then((out)=>{
        res.status(200).send(out);
      });
    return;
  } else if (req.params.type === 'annotation') {
    ms.GetGeometryJSON(req.params.id , 'POLYLINE')
      .then((out)=>{
        res.status(200).send(out);
      });
    return;
  } else if (req.params.type === 'tool') {
    let toolId = find.GetToolWorkpiece(Number(req.params.id));
    res.status(200).send(find.GetJSONProduct(toolId)); // toolId));
    return;
  } else if (!req.params.type && req.params.eid) {
    if (!isNaN(Number(req.params.eid)) && isFinite(Number(req.params.eid))) {
      res.status(200).send(find.GetJSONProduct(Number(req.params.eid)));
    } else {
      res.status(200).send(find.GetJSONGeometry(req.params.eid, 'MESH'));
    }
    return;
  }
  ms.GetGeometryJSON()
    .then((out)=>{
      res.status(200).send(out);
    });
  return;
}

function _getEIDfromUUID(req, res){
  let ms = file.ms;
  if(req.params.uuid){
    ms.GetEIDfromUUID(req.params.uuid)
      .then((out)=>{
        res.status(200).send(out)
      });
    return;
  }
}

module.exports = function(app, cb) {
  app.router.get('/v3/nc/geometry', _getGeometry);
  app.router.get('/v3/nc/geometry/:id/:type', _getGeometry);
  app.router.get('/v3/nc/geometry/:eid', _getGeometry);
  app.router.get('/v3/nc/id/:uuid', _getEIDfromUUID);
  if (cb) {
    cb();
  }
};
