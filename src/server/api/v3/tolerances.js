"use strict";
var StepNC = require('stepncnode/build/Release/StepNC');
var file = require('./file');
var _ = require('lodash');
var tol = file.tol;
var apt = file.apt;
var find = file.find;

///*******************************************************************\
//|                                                                    |
//|                       Helper Functions                             |
//|                                                                    |
//\*******************************************************************/

var getWorkingstepsForTolerance = function(exe, tolId) {
    if (find.IsWorkingstep(exe)) {
        let allTols = tol.GetWorkingstepToleranceAll(exe);
        if (_.indexOf(allTols, tolId) !== -1) {
            return [exe];
        }
        else {
            return [];
        }
    }
    else if (find.IsWorkplan(exe) || find.IsSelective(exe)) {
        let rtn = [];
        let children = find.GetNestedExecutableAll(exe);
        if (children !== undefined) {
            _.each(children, (childId) => {
                rtn = rtn.concat(getWorkingstepsForTolerance(childId, tolId));
            });
        }
        return rtn;
    }
    else {
        console.log("something's afoot");
        return [];
    }
};

var getTolerance = function(id) {
  let steps = getWorkingstepsForTolerance(find.GetMainWorkplan(), id);
  let name = tol.GetToleranceType(id);
  let tolType;
  if (name) {
    name = name.replace(/_/g, ' ').toLowerCase();
    tolType = name.split(' ')[0];
  }

  return {
    "id": id,
    "type": 'tolerance',
    "name": name,
    "toleranceType": tolType,
    "value": tol.GetToleranceValue(id),
    "workingsteps": steps,
    "unit" : tol.GetToleranceUnit(id),
    "workpiece": tol.GetWorkpieceOfTolerance(id),
    "leaf" : true
  };
};

var getWp = function(id, type) {
  let name = find.GetWorkpieceName(id);
  let tolerances = tol.GetWorkpieceToleranceAll(id);
  let ret = {
    "id": id,
    "name": name,
    "wpType": type,
    "tolerances": tolerances
  };
  if (type)
    ret.type = "workpiece";

  let asm_list = find.GetWorkpieceImmediateSubAssemblyAll(id);
  let subs = [];

  for (let sub_id of asm_list) {
    if (id !== sub_id) {
      let sub = getWp(sub_id, type);
      if(sub.children === undefined)
        sub.children = [];
      for(let toler in sub.tolerances){
        sub.children.push(getWsTols(sub.tolerances[toler]));
      }
      subs.push(sub);
    }
  }

  if (subs.length > 0)
    ret.children = subs;

  return ret;
};

var getWsTols = function(wsId) {
  if (find.IsWorkingstep(wsId)) { // this may be able to be factored out later
    let tolerances = JSON.stringify(tol.GetWorkingstepToleranceAll(wsId));
    return tolerances;
  }
  else {  // we are looking for a tolerance
    let tol = getTolerance(Number(wsId));
    return tol;
  }
};

///*******************************************************************\
//|                                                                    |
//|                       Endpoint Functions                           |
//|                                                                    |
//\*******************************************************************/

var _getWsTols = function(req,res) {
  if (req.params.wsId){
    let wsId = req.params.wsId;
    if (find.IsWorkingstep(wsId)) { // this may be able to be factored out later
      let tolerances = JSON.stringify(tol.GetWorkingstepToleranceAll(wsId));
      res.status(200).send(tolerances);
    }
    else {  // we are looking for a tolerance
      let tol = getTolerance(Number(req.params.wsId));
      res.status(200).send(tol);
    }
  }
};

var _getTols = function(req,res) {
  let tol_list = tol.GetToleranceAll();
  let ret = [];
  for (let id of tol_list){
      ret.push(getTolerance(id));
  }
  res.status(200).send(ret);
};

var _getWps = function(req,res) {
  let wps = find.GetWorkpieceAll();
  let ret = [];
  for (let id of wps) {
    let type = find.GetWorkpieceType(id);
    let wp = getWp(id, type);
    if(wp.children === undefined)
      wp.children = [];
    for(let wp_tol in wp.tolerances){
      wp.children.push(getWsTols(wp.tolerances[wp_tol]));
    }
    if (wp.wpType === 'workpiece')
      ret.push(wp);
  }
  res.status(200).send(ret);
};

module.exports = function(app, cb) {
  app.router.get('/v3/nc/tolerances/:wsId',_getWsTols);
  app.router.get('/v3/nc/tolerances/',_getTols);
  app.router.get('/v3/nc/workpieces/',_getWps);

  if (cb) cb();
};
