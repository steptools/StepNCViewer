var http = require('http');
var xml2js = require('xml2js');
var contentLength=0;
var body='';
//cb called if we have a finished body
function responseParser(chunk,cb){
	if(contentLength){//We're already parsing a thing.
		if(body.length+chunk.length>contentLength){
			oldbodylen = body.length;
			body +=chunk.substring(0,contentLength-body.length);
			chunk = chunk.substring(contentLength-oldbodylen);
		}
		else {
			body +=chunk;
			chunk='';
		}
		if(body.length === contentLength){
			cb(body);
			contentLength = 0;
			if(chunk.length>0){
			       	responseParser(chunk,cb);
			}
		}
	}
	else {
		body='';
		//Get final length of body
		chunk = chunk.substring(chunk.indexOf('Content-length: ')+16);
		contentLength = parseInt(chunk.substring(0,chunk.indexOf('\n')));
		chunk=chunk.substring(chunk.indexOf('\n')+1);
		if(chunk.length >contentLength) //Shit.
		{
			body=chunk.substring(0,contentLength);
			cb(body);
			responseParser(chunk,cb);
		}
		body=chunk;
	}
}
//Handles the weird x-multipart-replace request.
//Takes in options same as a http request, see:
//https://nodejs.org/api/http.html#http_http_request_options_callback
//
//Also takes a callback of form callback(string);
//Which will get called every time a complete response is received.
function getMultiPartRequest(options,cb){
http.get(options,function(res){
	if(res.statusCode!=200){
		console.log("error: recieved status "+res.statusCode+' '+res.statusMessage);
		return;
	}
	res.setEncoding('utf8');
	var body = '';
	res.on('data',(chunk)=>{
		responseParser(chunk,cb);
		});
	});
	return;
}
module.exports =getMultiPartRequest;
