"use strict";
var request = require('request');

// TODO define in configuration file
var stepServerURL = "http://127.0.0.1";
var stepServerPort = 8081;

function endpoint(name){
  return stepServerURL + ":" + stepServerPort + name;
}

function _getws(req,res){
  if(req.params.ncId && req.params.wsId){
	let ncId = req.params.ncId;
	let wsId = req.params.wsId;
	request(endpoint("/projects/"+ncId+"/plan/"+wsId), function(err,reqres,body){
	if(!err && reqres.statusCode ==200)
		res.status(200).send(body);
	
	else
		res.status(200).send("{'error':null}");
	});

  }
}

module.exports = function(app, cb){
  app.router.get('/v1/nc/:ncId/plan/:wsId',_getws);
  app.ioServer.on('connection', function(socket){
    console.log("New Socket Connection");

    function reqProjects(){
      request(endpoint("/projects"), function(err, res, body){
        if (!err && res.statusCode == 200){
          socket.emit('projects', JSON.parse(body));
        }else{
          console.error(err);
        }
      });
      return "";
    }

    function reqModeltree(id){
      request(endpoint("/projects/" + id + "/plan"), function(err, res, body){
        if (!err && res.statusCode == 200){
          socket.emit('modeltree', JSON.parse(body));
        }else{
          console.error(err);
        }
      });
    }

    function reqToleranceTree(){
      // FIXME currently returning static JSON
      socket.emit("tolerancetree",{
        name: "Tolerances",
        children:
          [{
            name: "Workpiece 1",
            children: [{
              name: "Tolerance 1",
              isLeaf:true
            },{
              name: "Tolerance 2",
              isLeaf:true
            },{
              name: "Tolerance 3",
              isLeaf:true
            },{
              name: "Tolerance 4",
              isLeaf:true
            },{
              name: "Tolerance 5",
              isLeaf:true
            }]
          }, {
            name: "Workpiece 2",
            children: [{
              name: "Tolerance 6",
              isLeaf:true
            }, {
              name: "Tolerance 7",
              isLeaf:true
            }, {
              name: "Tolerance 8",
              isLeaf:true
            }]
          }
        ]
      });
    }


    socket.on('req:projects', reqProjects);
    socket.on('req:modeltree', reqModeltree);
    socket.on('req:tolerancetree', reqToleranceTree);

    socket.on('disconnect', function(){
      console.log("Disconnected")
    });
  });
  if(cb) cb();
};
