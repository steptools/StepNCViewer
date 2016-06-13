"use strict";
var file = require("./file");
var fs = require("fs");

function _getProjects(req, res){
	let content = fs.readFileSync("data/pathmap.json");
	let projects = JSON.parse(content);
	let rtn = {};
	for(let proj in projects)
		rtn[proj] = projects[proj];
	res.status(200).send(rtn);
}

function _getSpecProject(req, res){
	let ncId = req.params.ncId;
	let project = {
		"path" : file.getPath(ncId),
	}
	res.status(200).send(project);
}

module.exports = function(app, cb){
	app.router.get('/v2/nc/projects/', _getProjects);
	app.router.get('/v2/nc/projects/:ncId', _getSpecProject);

	if(cb) cb();
}