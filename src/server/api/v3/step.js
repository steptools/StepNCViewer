// TODO: styleguide compliance
'use strict';
var file = require('./file');
var find = file.find;
var _ = require('lodash');

/****************************** Helper Functions ******************************/

function exeFromId(id) {
  let ws = {
    'id': id,
    'name': find.GetExecutableName(id),
    'baseTime': find.GetExecutableBaseTime(id),
    'timeUnits': find.GetExecutableTimeUnit(id),
    'distance': find.GetExecutableDistance(id),
    'distanceUnits': find.GetExecutableDistanceUnit(id),
    'setupID': getSetupFromId(id),
    'asIs': {
      id: find.GetExecutableWorkpieceAsIsLocal(id),
      inherited: false,
    },
    'toBe': {
      id: find.GetExecutableWorkpieceToBeLocal(id),
      inherited: false,
    },
    'delta': {
      id: find.GetExecutableWorkpieceRemovalLocal(id),
      inherited: false,
    },
  };

  if (ws.asIs.id === 0) {
    ws.asIs.id = find.GetExecutableWorkpieceAsIs(id);
    ws.asIs.inherited = true;
    if (ws.asIs.id === 0) {
      ws.asIs = null;
    }
  }

  if (ws.toBe.id === 0) {
    ws.toBe.id = find.GetExecutableWorkpieceToBe(id);
    ws.toBe.inherited = true;
    if (ws.asIs.id === 0) {
      ws.asIs = null;
    }
  }

  if (ws.delta.id === 0) {
    ws.delta.id = find.GetExecutableWorkpieceRemoval(id);
    ws.delta.inherited = true;
    if (ws.delta.id === 0) {
      ws.delta = null;
    }
  }

  if (!find.IsWorkingstep(id) && !find.IsNcFunction()) {
    let children = find.GetNestedExecutableAll(id);
    if (children !== undefined) {
      ws.children = children.map(exeFromId);
    }
  }

  if (find.IsEnabled(id)) {
    ws.enabled = true;
  } else {
    ws.enabled = false;
    propagateDisabled(ws);
  }

  if (find.IsWorkingstep(id)) {
    ws.type = 'workingstep';
    ws.tool = find.GetWorkingstepTool(id);
    ws.feedRate = find.GetProcessFeed(id);
    ws.feedUnits = find.GetProcessFeedUnit(id);
    ws.speed = find.GetProcessSpeed(id);
    ws.speedUnits = find.GetProcessSpeedUnit(id);
    let tolerances = file.tol.GetWorkingstepToleranceAll(id);
    if(tolerances.length > 0){
      ws.tolerances = tolerances;
    }
    return ws;
  } else if (find.IsSelective(id)) {
    ws.type = 'selective';
  } else if (find.IsWorkplanWithSetup(id)) {
    ws.type = 'workplan-setup';
  } else if (find.IsWorkplan(id)) {
    ws.type = 'workplan';
  } else if(find.IsNcFunction(id)) {
    ws.type = 'Nc Function';
  }

  return ws;
}

function propagateDisabled(ws) {
  if (ws.children) {
    _.each(ws.children, (child) => {
      child.enabled = ws.enabled;
      propagateDisabled(child);
    });
  }
}


function getSetupFromId(id) {
  let currentid = parseInt(id);
  while (currentid !== 0 && !find.IsWorkplanWithSetup(currentid)) {
    currentid = find.GetExecutableContainer(currentid);
  }
  return currentid;
}

/***************************** Endpoint Functions *****************************/

function _getExeFromId(req, res) {
  if (req.params.wsId !== undefined) {
    let wsId = req.params.wsId;
    let newId = parseInt(wsId);
    let exe = exeFromId(newId);
    if (exe !== undefined) {
      res.status(200).send(exe);
    } else {
      res.status(404).send('Executable not found');
    }
  } else {
    res.status(404).send('No workstep ID provided');
  }
}

function _getMwp(req, res) {
  let mwpId = find.GetMainWorkplan();
  res.status(200).send(exeFromId(mwpId));
}

function _getSetup(req, res) {
  if (req.params.wsId !== undefined) {
    let wsId = req.params.wsId;
    let newId = getSetupFromId(parseInt(wsId));
    res.status(200).send(String(newId));
  }
}
function _getProject(req,res){
  res.status(200).send(find.GetProjectName());
}

module.exports = function(app, cb) {
  app.router.get('/v3/nc/workplan/:wsId', _getExeFromId);
  app.router.get('/v3/nc/workplan', _getMwp);
  app.router.get('/v3/nc/setup/:wsId', _getSetup);
  app.router.get('/v3/nc/project',_getProject);
  if (cb) {
    cb();
  }
};

module.exports.getSetupFromId = getSetupFromId;
