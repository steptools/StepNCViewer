/* Copyright G. Hemingway, 2015 - All rights reserved */
"use strict";

var path            = require('path');
var app, rootDir;

//TODO: HACK: FIXME.
var request	    = require('request');
var stepServerURL = "http://127.0.0.1";
var stepServerPort = 8081;

function endpoint(name){
	return stepServerURL+":"+stepServerPort+name;
}

/************************************************************************/

/*
 * Fetch a model for visualization
 *
 * @param {req.body.username} Username being logged into
 * @param {req.body.password} Password for the account
 * @return {200,username} Successful login yields the username
 */
var _fetch = function(req, res) {
    var dirPath, filename;
    // Handle NC files
    if (req.params.ncId && req.params.shellId) {
	dirPath = endpoint("/projects/"+req.params.ncId+"/geometry/shell/"+req.params.shellId);
        app.logger.debug('NC Shell');
    } else if (req.params.ncId && req.params.annoId) {
	dirPath = endpoint("/projects/"+req.params.ncId+"/geometry/annotation/"+req.params.annoId);
        app.logger.debug('NC Annotation');
    } else if (req.params.ncId) {
        dirPath = endpoint("/projects/"+req.params.ncId+"/keystate");
        app.logger.debug('NC State');
		if(app.MostCurrentState)
		{
			app.logger.debug('NC: newer state in memory');
			res.status(200).send(app.MostCurrentState);
			return;
		}
    }
    app.logger.debug("Get: "+dirPath);
    request(dirPath,function(err,reqres,body){ 
	    if(!err && reqres.statusCode ==200){
		    res.status(200).send(body);
	    }
	    else{
		    console.error(err);
	    }
    	});
    //res.status(200).sendFile(filename, { root: dirPath });
};

/************************************************************************/

module.exports = function(globalApp) {
    app = globalApp;
    rootDir = path.join(app.config.rootDir, app.config.storage.options.dir);
    app.logger.info('\tNC Root: ' + rootDir);
    app.router.get('/v1/nc/:ncId',                                  _fetch);
    app.router.get('/v1/nc/:ncId/shell/:shellId',                   _fetch);
    app.router.get('/v1/nc/:ncId/annotation/:annoId',               _fetch);
};
