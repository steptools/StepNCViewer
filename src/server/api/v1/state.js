"use strict";
var request = require('request');

// TODO define in configuration file
var stepServerURL = "http://127.0.0.1";
var stepServerPort = 8081;
var app;
function endpoint(name){
  return stepServerURL + ":" + stepServerPort + name;
}

var _getdelta = function(pid,key,cb) {
	var reqend = "";
	if(key) {
		reqend = endpoint("/projects/"+pid+"/keystate");
	}
	else {
		reqend = endpoint("/projects/"+pid+"/deltastate");
	}
	request(reqend,function(err,res,body){
		if(!err && res.statusCode == 200){
			app.logger.debug('got ' +body);
			cb(body);
		}
		else{
			console.error(err);
			cb("");
		}
	});
};

var _loopstates = {};

var _getnext = function(pid,cb) {
	request(endpoint("/projects/"+pid+"/workingstep/next"),function(err,res,body){
		if(!err && res.statusCode ==200){
			if(body=="OK") {
				app.logger.debug("Switched!");
				cb();
			}
		}
		else{
			console.error(err);
		}
	});
}

var _looper = function(pid,key) {
	if(_loopstates[pid] ===true)
	{
		app.logger.debug("Loop step "+pid);
		request(endpoint("/projects/"+pid+"/step"),function(err,res,body){
		if(!err && res.statusCode == 200){
			switch(body){
				case "OK":
					_getdelta(pid,key,function(b){
				app.ioServer.emit('nc:delta',JSON.parse(b));
				setTimeout(function(){_looper(pid,false)},300);
			});
					break;
				case "SWITCH":
					app.logger.debug('Switching...');
					_getnext(pid,function(){
						_looper(pid,true);
					});
					break;
			}
		}
		else{console.error(err);}
		});
	}
};

var _update = (val) =>{
		app.ioServer.emit('nc:state',val);
};

var _loop = function(req, res) {
	if(req.params.ncId && req.params.loopstate) {
		var ncId = req.params.ncId;
		switch(req.params.loopstate) {
			case "state":
				if(_loopstates[ncId]===true) {
					res.status(200).send("play");
				}
				else {
					res.status(200).send("pause");
				}
				break;
			case "start":
				if(_loopstates[ncId]===true)
				{
					res.status(200).send("Already Running");
					return;
				}
				app.logger.debug("Looping "+ncId);
				_loopstates[ncId] = true;
				res.status(200).send("OK");
				_update("play");
				_looper(ncId,false);
				break;
			case "stop":
				if(_loopstates[ncId]===false)
				{
					res.status(200).send("Already Stopped");
					return;
				}
				_loopstates[ncId] = false;
				_update("pause");
				res.status(200).send("OK");
				break;
		}
	}
};
module.exports = function(globalApp,cb) {
	app = globalApp;
	app.router.get('/v1/nc/:ncId/loop/:loopstate',_loop);
	if(cb)cb();
};
