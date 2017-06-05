'use strict';
let net = require('net');
let server = net.createServer((socket)=>{
});
let ports = [];
let program ="";
let ping = (data,socket)=>{
    socket.write("* PONG 10000\n");
};
server.listen(7878);
server.on('connection',(socket)=>{
    console.log("connection");
    socket.setKeepAlive({enable:true});
    socket.setNoDelay(true);
    socket.on('data',(r)=>{
        ping(r,socket);
    });
    socket.write(new Date(Date.now()).toISOString()+"|pprogram|"+program+"\n");
    let socketpos = (ports.push(socket) - 1);
    socket.on('close',()=>{ports.splice(socketpos,1);});
});

let sendClients = (msg)=>{
    ports.forEach((client)=>{
        client.write(msg+"\n",()=>{});
    });
};

let setID = (name)=>{
    program=name;
    sendClients(new Date(Date.now()).toISOString()+"|pprogram|"+program+"\n");
};
module.exports.write = sendClients;
module.exports.ProgramID = setID;