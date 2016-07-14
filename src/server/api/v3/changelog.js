"use strict";
var StepNC = require('stepncnode/build/Release/StepNC');
var fs = require('fs');

///*******************************************************************\
//|                                                                    |
//|                       Helper Functions                             |
//|                                                                    |
//\*******************************************************************/




///*******************************************************************\
//|                                                                    |
//|                       Endpoint Functions                           |
//|                                                                    |
//\*******************************************************************/

var _getchangelog = function(req,res){
    fs.readFile("changelog.md", "utf8", function(err,data){
      if(err) {
        return console.log(err);
      }
      res.status(200).send(data);
    })


}

module.exports = function(app, cb) {
  app.router.get('/log', _getchangelog);
  if (cb) cb();
};
