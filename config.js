/* Copyright G. Hemingway, 2015 - All rights reserved */
"use strict";


var path            = require('path'),
    _               = require('lodash');

/**********************************************************************************/

/*
 * Establish the configuration of the application
 *
 * @param {configFile} String of the path for the configuration file to be loaded
 * @param {environment} Which profile in the configuration file should be loaded
 * @return {config} The configuration for the given profile
 */
module.exports = function(environment) {
    var config = {
          "host": "",
          "port": 8080,
          "protocol": "http",
          "api_version": "v3",
          "client": {
            "embedded": false,
            "auth": false,
            "two_factor": true,
            "socket": true,
            "upload": true
          },
          "file" : {
            "dir": "./model.stpnc"
          },
          "machine" : {
            "dir" : ""
          }
    };
    try {
        config.env = environment;
        config.rootDir = path.join(__dirname, '../../');
    } catch (err) {
        console.log('Error in node-configurator: %s', err);
        process.exit(-1);
        return config;
    }
    return config;
};
