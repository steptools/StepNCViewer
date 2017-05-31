/* Copyright G. Hemingway, 2015 - All rights reserved */
'use strict';

var opts = require('commander');
var winston = require('winston');
var file = require('./api/v3/file.js');
var fs = require('fs');
var path = require('path');
/******************************************************************************/

function CoreServer() {
  var pjson = require('../../package.json');
  opts
    .version(pjson.version)
    .option(
      '-p, --port [port]',
      'Port on which to run the server [8080]',
      ''
    )
    .option(
      '-c, --config [file]',
      'Configuration File [./config.js]',
      './config.js'
    )
    .option(
      '-e, --environment [env]',
      'Environment to use [development]',
      'development'
    )
    .option(
      '-t, --tool [tool-file]',
      'Machine tool file to use [""]',
      ''
    )
    .option(
      '-f, --file [filepath]',
      'Step NC filepath to use [""]',
      ''
    )
    .option(
      '-n, --no-cache',
      'Run from simulation instead of cached data.'
    )
    .option(
      '-m, --mt-connect',
      'Run the MT Connect server mode. Implies --no-cache.'
    )
    .parse(process.argv);
  let configurator = require(path.join(process.cwd(),opts.config));
  this.config = configurator(opts.environment);
  this.port = opts.port || this.config.port || 8080;
  if(opts.mtConnect) opts.cache = false;
  this.config.noCache = !opts.cache;
  this.config.mtConnect = opts.mtConnect;
  // set up machine tool option
  if(opts.tool && opts.tool!==''){
    try{
      fs.accessSync(opts.tool, fs.R_OK);
      this.machinetool = opts.tool;
    }
    catch(err){
      console.log('Given Tool Does Not Exist.');
      this.machinetool = null;
    }
  }
  else if(this.config.machine !== undefined && this.config.machine.dir !== undefined){
    if(this.config.machine.dir.trim() !== ""){
      try{
        fs.accessSync(this.config.machine.dir, fs.R_OK);
        this.machinetool = this.config.machine.dir;
      }
      catch(err){
        this.machinetool = null;
      }
    }
    else{        
      this.machinetool = null;
    }
  }
  else{
    this.machinetool = null;
  }
  // set up filepath option
  if(opts.file)
      this.project = opts.file;
  else
      this.project = this.config.file.dir;
  file.init(this.project, this.machinetool);

  // Establish core
  this.logger = new winston.Logger({
    transports: [
      new (winston.transports.Console)({level: 'debug'}),
    ],
  });
}

module.exports = CoreServer;
