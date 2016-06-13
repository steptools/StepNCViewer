var file = require("./file");

function _getProjects(req, res){
	console.log("\n *START* \n");
	var content = fs.readFileSync("data/pathmap.json");
	console.log("Output Content : \n"+ content);
	console.log("\n *EXIT* \n");
}

function _getSpecProject(req, res){
	console.log("\n *START* \n");
	var content = fs.readFileSync("data/pathmap.json");
	var jsoncontent = JSON.parse(content);
	console.log("Specific Project: " + jsoncontent[req.params.ncId]);
}

module.exports = function(app, cb){
	app.router.get('/v2/nc/projects/', _getProjects);
	app.router.get('/v2/nc/projects/:ncId', _getSpecProject);

	if(cb) cb();
}