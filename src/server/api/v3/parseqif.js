'use strict';
let xml2js = require('xml2js');
let _ = require('lodash');
let request = require('superagent');
let file = require('./file');
let parseQIF=(qif)=>{
    if(qif.MTConnectError) return false;
    let document = qif.MTConnectAssets.Assets[0].QIFResult[0].QIFDocument[0];
    let mappedIDs={};
    //Map the UUIDs to the dumb CharacteristicNominalId thingy
    _.forIn(document.Characteristics[0].CharacteristicItems[0],(value,key)=>{
        if(key==='$') return;
        _.each(value,v=>{
            mappedIDs[v.$.id] = {'uuid':v.Attributes[0].AttributeQPId[0].Value[0]};
        });
    })
    _.each(document.MeasurementsResults[0].MeasurementResultsSet[0].MeasurementResults,(v)=>{
        _.forIn(v.MeasuredCharacteristics[0].CharacteristicActuals[0],(value,key)=>{
            if(key==='$') return;
            _.each(value,v=>{
                let id = v.CharacteristicItemId[0];
                mappedIDs[id].value = v.Value[0];
            });
        });
    });
    return mappedIDs;
};
let getQIF = (assetName) => {
    return new Promise((resolve,reject)=>{
         request.get('swim:5000/assets/' + assetName).then((data)=> {
         xml2js.parseString(data.text, (err, res) => {
             if (err) {
                 console.log(err);
                 reject();
             }
             if (res === undefined) resolve();
                let rtn=parseQIF(res);
                if(rtn ===false) reject();
                resolve(rtn);
            });
        });
    });
};
module.exports.loadQIF = (name) => {
    return getQIF(name)
        .then((r) => {
            _.forIn(r, (value, key) => {
                if (value.value) {
                    file.tol.SetToleranceMeasuredValue(value.uuid, Number(value.value));
                }
            });
        });
};