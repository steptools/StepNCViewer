'use strict';
let StepNC = require('../../../../../STEPNode/build/Release/StepNode');
let fs = require('fs');

function init(path, machinetool) {
  fs.accessSync(path, fs.R_OK , () => process.exit());
  this.apt = new StepNC.AptStepMaker();
  this.find = new StepNC.Finder();
  this.tol = new StepNC.Tolerance();

  this.apt.OpenProject(path);
  this.find.OpenProject(path);

	this.ms = new StepNC.machineState(path);
	if(machinetool !== null){
		if(!this.ms.LoadMachine(machinetool))
			console.log("ERROR: Machinetool was not loaded");
		else
			console.log("Loaded Machine Successfully")
	}
	return;
}

module.exports.init = init;
module.exports.find = this.find;
module.exports.apt = this.apt;
module.exports.tol = this.tol;
module.exports.ms = this.ms;
