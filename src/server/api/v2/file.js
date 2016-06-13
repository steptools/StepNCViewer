var fs = require("fs");
//Query for a json file that maps all projects in the data directory
//to a particular path in the data folder

module.exports.getPath = function (ncId){
	var content = fs.readFileSync("data/pathmap.json");
	var jsoncontent = JSON.parse(content);
	if(jsoncontent[ncId])
		return jsoncontent[ncId];
	else
		return "This project doesn't exist";
}