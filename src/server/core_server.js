/* Copyright G. Hemingway, 2015 - All rights reserved */
'use strict';

var opts = require('commander');
var winston = require('winston');
var configurator = require('../../config');
var file = require('./api/v3/file.js');
var fs = require('fs');

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
      'Configuration File [./config/config.json]',
      './config/config.json'
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
    .parse(process.argv);
  this.config = configurator(opts.config, opts.environment);
  this.port = opts.port || this.config.port || 8080;

  // set up machine tool option
  if(opts.tool){
    try{
      fs.accessSync(opts.tool, fs.R_OK);
      this.machinetool = opts.tool;
    }
    catch(err){
      console.log('Couldn\'t Access Path Provided For Machine, Ending...');
      this.machinetool = null;
      process.exit();
    }
  }
  else if(this.config.machine !== undefined && this.config.machine.dir !== undefined){
    if(this.config.machine.dir.trim() !== ""){
      try{
        fs.accessSync(this.config.machine.dir, fs.R_OK);
        this.machinetool = this.config.machine.dir;
      }
      catch(err){
        console.log('Couldn\'t Access Path Provided For Machine, Ending...');
        this.machinetool = null;
        process.exit();
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
  this.models = {};
  this.controllers = {};
  this.logger = new winston.Logger({
    transports: [
      new (winston.transports.Console)({level: 'debug'}),
    ],
  });
}

module.exports = CoreServer;
