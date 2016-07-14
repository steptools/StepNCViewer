"use strict";
var StepNC = require('stepncnode/build/Release/StepNC');
var file = require('./file');
var tol = file.tol;
var apt = file.apt;
var find = file.find;

///*******************************************************************\
//|                                                                    |
//|                       Helper Functions                             |
//|                                                                    |
//\*******************************************************************/

var exeFromId = function(id) {
	let ws = {
		"id": id,
		"name": find.GetExecutableName(id),
		'baseTime' : find.GetExecutableBaseTime(id),
		'timeUnits' : find.GetExecutableTimeUnit(id),
		'distance' : find.GetExecutableDistance(id),
		'distanceUnits' : find.GetExecutableDistanceUnit(id),
    'setupID' : _getSetupFromId(id)
	};
	if(find.IsEnabled(id))
		ws.enabled = true;
	else
		ws.enabled = false;
	if (find.IsWorkingstep(id)) {
		ws.type = "workingstep";
		ws.tool = find.GetWorkingstepTool(id);

		return ws;
	} else if (find.IsSelective(id)) {
		ws.type = "selective";
	} else if(find.IsWorkplanWithSetup(id)){
		ws.type = "workplan-setup";
	} else if (find.IsWorkplan(id)) {
		ws.type = "workplan";
	}
	let children = find.GetNestedExecutableAll(id);
	if (children !== undefined) {
		ws.children = children.map(exeFromId);
	}
	return ws;
};

///*******************************************************************\
//|                                                                    |
//|                       Endpoint Functions                           |
//|                                                                    |
//\*******************************************************************/

var _getExeFromId = function(req, res) {
	if (req.params.wsId !== undefined){
		let wsId = req.params.wsId;
		let id_new = parseInt(wsId);
		let exe = exeFromId(id_new);
		if (exe !== undefined)
            res.status(200).send(exe);
		else {
			res.status(404).send("Executable not found");
		}
	}
	else {
		res.status(404).send("No workstep ID provided");
	}
};

var _getMwp = function(req, res) {
	let mwpId = find.GetMainWorkplan();
	res.status(200).send(exeFromId(mwpId));
};

var _getSetupFromId = function(id) {
  let currentid = parseInt(id);
  while(currentid !== 0 && !find.IsWorkplanWithSetup(currentid))
  {
    currentid = find.GetExecutableContainer(currentid);
  }
  return currentid;
};

var _getSetup = function(req, res) {
  if (req.params.wsId !== undefined){
    let wsId = req.params.wsId;
    let id_new = _getSetupFromId(parseInt(wsId));
    console.log(id_new);
    res.status(200).send(String(id_new));
  }
};

module.exports = function(app, cb) {
	app.router.get('/v3/nc/workplan/:wsId',_getExeFromId);
	app.router.get('/v3/nc/workplan',_getMwp);
  app.router.get('/v3/nc/setup/:wsId', _getSetup);
	if (cb) cb();
};

module.exports._getSetupFromId = _getSetupFromId;
