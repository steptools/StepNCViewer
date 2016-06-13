"use strict";
var StepNC = require('../../../../../StepNCNode/build/Release/StepNC');
var find = new StepNC.Finder();
var file = require('./file');

function exeFromId(id) {
	let ws = {
		"id": id,
		"name": find.GetExecutableName(id)
	};
	if (find.IsWorkingstep(id)) {
		ws.type = "workingstep";
		return ws;
	} else if (find.IsSelective(id)) {
		ws.type = "selective";
	} else if (find.IsWorkplan(id)) {
		ws.type = "workplan";
	}
	ws.children = find.GetNestedExecutableAll(id).map(exeFromId);
	return ws;
}

function _getExeFromId(req, res) {
	if (req.params.ncId && req.params.wsId){
		let ncId = req.params.ncId;
		let wsId = req.params.wsId;
		let id_new = parseInt(wsId);
		find.OpenProject(file.getPath(ncId));
		res.status(200).send(exeFromId(id_new));
	}
} 

function _getMwp(req, res) {
	if (req.params.ncId) {
		let ncId = req.params.ncId;
		find.OpenProject(file.getPath(ncId));
		let mwpId = find.GetMainWorkplan();
		res.status(200).send(exeFromId(mwpId));
	}
}


module.exports = function(app, cb) {
	//This route gets the executable given an Id and returns a JSON object with its 
	//name, id and all its children (and children's children, etc.)
	app.router.get('/v2/nc/projects/:ncId/workplan/:wsId',_getExeFromId);

	//This route gets the main workplan for the project that is specified by 
	//ncId
	app.router.get('/v2/nc/projects/:ncId/workplan',_getMwp);
	if (cb) cb();
};
