"use strict";
var StepNC = require('../../../../../STEPNode/build/Release/StepNC');
var file = require('./file');
var tol = file.tol;
var apt = file.apt;
var find = file.find;

var exeFromId = function(id) {
	let ws = {
		"id": id,
		"name": find.GetExecutableName(id),
		'baseTime' : find.GetExecutableBaseTime(id),
		'timeUnits' : find.GetExecutableTimeUnit(id),
		'distance' : find.GetExecutableDistance(id),
		'distanceUnits' : find.GetExecutableDistanceUnit(id)
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
	} else if (find.IsWorkplan(id)) {
		ws.type = "workplan";
	}
	let children = find.GetNestedExecutableAll(id);
	if (children !== undefined) {
		ws.children = children.map(exeFromId);
	}
	return ws;
};

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

module.exports = function(app, cb) {
	app.router.get('/v3/nc/workplan/:wsId',_getExeFromId);
	app.router.get('/v3/nc/workplan',_getMwp);
	if (cb) cb();
};
