'use strict';
var file = require('./file');
var _ = require('lodash');
var parseqif = require('./parseqif');
var tol = file.tol;
var apt = file.apt;
var find = file.find;
let app;
/****************************** Helper Functions ******************************/
function getModIcon(mod){
  switch(mod){
    case 'maximum_material_requirement':
      return '\u24C2 ';
    case 'reciprocity_requirement':
      return '\u24C7 ';
    case 'least_material_requirement':
      return '\u24C1 ';
    case 'any_cross_section':
      return '(ACS) ';
    case 'common_zone':
      return '(CZ) ';
    case 'each_radial_element':
      return '(EACH RADIAL ELEMENT)';
    case 'free_state':
      return '\u24BB ';
    case 'line_element':
      return '(LE) ';
    case 'major_diameter':
      return '(MD) ';
    case 'minor_diameter':
      return '(LD) ';
    case 'not_convex':
      return '(NC) ';
    case 'pitch_diameter':
      return '(PD) ';
    case 'separate_requirement':
      return '(SEP REQT) ';
    case 'statistical_tolerance':
      return '<ST> ';
    case 'tangent_plane':
      return '\u24C9 ';
    default:
      return mod + 'hasn\'t been implemented yet';
  }
}

function getDatum(dat){
  let label = tol.GetDatumLabel(dat);
  let faces = tol.GetDatumFaceAll(dat);
  let ret = {
    'type' : 'datum',
    'name' : label,
    'id' : dat,
    'faces' : faces,
  }
  return ret;
}

function getTolerance(id, wp) {
  let name = apt.SetNameGet(id);
  let tolTypeName = tol.GetToleranceType(id);
  let unit = tol.GetToleranceUnit(id);
  let tolType;
  if (tolTypeName) {
    tolTypeName = tolTypeName.replace(/_/g, ' ').toLowerCase();
    tolTypeName = tolTypeName.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
    tolType = tolTypeName.split(' ')[0];
  }

  if (name.trim() === '') {
    name = tolTypeName;
  }
  let range = tol.GetTolerancePlusMinus(id);
  let rangeName;
  let mods = tol.GetToleranceModifierAll(id);
  let modName;
  if(mods.length > 0){
    modName = mods.map((mod) => getModIcon(mod)).join(' ');
  }
  if (!range || range.flag === false) {
    rangeName = '';  
  }
  else{
    if(Math.abs(range.upper) === Math.abs(range.lower)){
      rangeName = '\u00B1 ' + Math.abs(range.upper) + unit;
    }
    else{
      rangeName = range.upper + ' ' + range.lower + ' ' + unit;
    }
  }
  let datum = tol.GetToleranceDatumAll(id);
  let datumLabels = datum.map((dat) => getDatum(dat));
  let status = tol.GetToleranceStatus(id);
  return {
    'id': id,
    'type': 'tolerance',
    'name': name,
    'tolTypeName': tolTypeName,
    'toleranceType': tolType,
    'value': tol.GetToleranceValue(id),
    'unit' : unit,
    'faces': tol.GetToleranceFaceAll(id),
    'range': range,
    'rangeName': rangeName,
    'modifiers': mods,
    'modName': modName,
    'children' : datumLabels,
    'status': status
  };
}

function getWp(id, type) {
  let name = find.GetWorkpieceName(id);
  let steps = apt.GetWorkpieceExecutableAll(id);
  let tolerances = tol.GetWorkpieceToleranceAll(id);
  let datums = tol.GetWorkpieceDatumAllAll(id);
  let datumLabels = datums.map((dat) => {
    let func = getDatum(dat);
    func.workpiece = id;
    return func;
  });

  let ret = {
    'id': id,
    'name': name,
    'workingsteps': steps,
    'wpType': type,
    'tolerances': tolerances,
    'datums' : datumLabels,
    'children': [],
    'subs': [],
  };
  if (type) {
    ret.type = 'workpiece';
  }

  let asmList = find.GetWorkpieceSubAssemblyAll(id);

  for (let subId of asmList) {
    if (id !== subId) {
      let sub = getWp(subId);
      ret.subs.push(sub);
      ret.subs.concat(sub.subs);
    }
  }

  return ret;
}

function getWsTols(wsId, wpId) {
  if (find.IsWorkingstep(wsId)) { // this may be able to be factored out later
    let tolerances = JSON.stringify(tol.GetWorkingstepToleranceAll(wsId));
    return tolerances;
  } else {  // we are looking for a tolerance
    let tol = getTolerance(Number(wsId));
    tol.workpiece = wpId;
    _.each(tol.children, (datum) => {datum.workpiece = wpId})
    return tol;
  }
}

/***************************** Endpoint Functions *****************************/

function _getWsTols(req, res) {
  if (req.params.wsId) {
    let wsId = req.params.wsId;
    if (find.IsWorkingstep(wsId)) { // this may be able to be factored out later
      let tolerances = JSON.stringify(tol.GetWorkingstepToleranceAll(wsId));
      res.status(200).send(tolerances);
    } else {  // we are looking for a tolerance
      let tol = getTolerance(Number(req.params.wsId));
      res.status(200).send(tol);
    }
  }
}

function _getTols(req, res) {
  let tolList = tol.GetToleranceAll();
  let ret = [];
  for (let id of tolList) {
    ret.push(getTolerance(id));
  }
  res.status(200).send(ret);
}

function _getWps(req, res) {
  let wps = find.GetWorkpieceAll();
  let ret = {};
  for (let id of wps) {
    let type = find.GetWorkpieceType(id);
    let wp = getWp(id, type);

    if (wp.wpType === 'workpiece') {
      ret[wp.id] = wp;
      _.each(wp.subs, (child) => {
        wp.tolerances = wp.tolerances.concat(child.tolerances);
      });
      wp.size = find.GetWorkpieceShape(id);
      wp.subs = undefined;
    }

    _.each(wp.tolerances, (wpTol) => wp.children.push(getWsTols(wpTol, wp.id)));
    wp.tolerances = undefined;
  }

  res.status(200).send(ret);
}

function _loadQIF(req,res){
  parseqif.loadQIF(find.GetProjectName()+'_Res.qif')
    .then(() =>{
      res.status(200).send();
      app.ioServer.emit('nc:qifLoad');
    }).catch((err)=>{
      res.status(404).send();
    });
}
function _unloadQIF(req,res){
  file.tol.ResetAllToleranceMeasuredValue();
  app.ioServer.emit('nc:qifLoad');
  res.status(200).send();
}
module.exports = function(globalApp, cb) {
  app=globalApp;
  app.router.get('/v3/nc/tolerances/:wsId', _getWsTols);
  app.router.get('/v3/nc/tolerances/', _getTols);
  app.router.get('/v3/nc/tolerances/qif/load',_loadQIF);
  app.router.get('/v3/nc/tolerances/qif/unload',_unloadQIF);
  app.router.get('/v3/nc/workpieces/', _getWps);

  if (cb) {
    cb();
  }
};
