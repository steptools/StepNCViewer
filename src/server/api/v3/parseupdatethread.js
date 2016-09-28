var xml2js = require('xml2js');
var getMultipartRequest = require(process.cwd()+'/src/server/api/v3/getmultipartrequest.js');
var _ = require('lodash');

var dump=1;
var sdump=1;
var fdump=1;
var updateLoop = function(data){
    xml2js.parseString(data,(err,res)=>{
        if(err){
            console.log(err);
            return;
        }
        if(res===undefined) return;
        //Need to parse samples and events.
        //Important things are:
        //MS1speed (spindle speed update)
        //Mp1LPathPos (tool position update)
        //Mp1BlockNumber (gcode update)
        //Mp1block (gcode update)
        //Mp1Fact (feedrate update)
        try{
            _.each(res.MTConnectStreams.Streams[0].DeviceStream[0].ComponentStream,
                (e)=>{
                    _.each(e.Samples,(f)=>{
                        _.forIn(f,(val)=>{
                            _.each(val,(g)=>{
                                switch(g.$.dataItemId){
                                    case "MS1speed":
                                        if(sdump++%100) break;
                                        sdump=1;
                                        postMessage({'speedUpdate':g._});
                                        break;
                                    case "Mp1Fact":
                                        if(fdump++%100) break;
                                        fdump=1;
                                        postMessage({'feedUpdate':g._});
                                        break;
                                    case "Mp1LPathPos":
                                        if(dump++%10) break;
                                        dump=1;
                                        postMessage({'pathUpdate':g._});
                                        break;
                                }
                            });
                        });
                    });
                    _.each(e.Events,(f)=>{
                        _.forIn(f,(val)=>{
                            _.each(val,(g)=>{
                                switch(g.$.dataItemId){
                                    case "Mp1BlockNumber":
                                        postMessage({'blockNumberUpdate':g._});
                                        break;
                                    case "Mp1block":
                                        postMessage({'blockUpdate':g._});
                                        break;
                                }
                            });
                        });
                    });
                });
        } catch(e){
            console.log(e);
        }
    })
};

onmessage =function(f){
    f=f.data;
    if(f.msg==='start'){
        getMultipartRequest({'hostname':f.machineAddress,'port':f.machinePort,'path':'/sample?from='+f.startSequence+'&interval=0&heartbeat=10000'},(r)=>{updateLoop(r);});
    }
};