"use strict";
let StepNC = require("stepncnode/build/Release/StepNC");
let fs = require("fs");
//Query for a json file that maps all projects in the data directory
//to a particular path in the data folder

let path;
let find;
let apt;
let tol;
let ms;

function init(path, machinetool){
	fs.accessSync(path, fs.R_OK , (err) => {
  		process.exit();
	});
	this.apt = new StepNC.AptStepMaker();
	this.find = new StepNC.Finder();
	this.tol = new StepNC.Tolerance();
	this.ms = new StepNC.machineState(path);
	if(machinetool !== ""){
		if(!this.ms.LoadMachine(machinetool))
			console.log("ERROR: Machinetool was not loaded");
		else
			console.log("Loaded Machine Successfully")
	}
	this.apt.OpenProject(path);
	this.find.OpenProject(path);
	return;
}

module.exports.init = init;
module.exports.find = find;
module.exports.apt = apt;
module.exports.tol = tol;
module.exports.ms = ms;
