var express = require("express");
var app = express();

app.use(express.static('public'));

var bodyParser = require('body-parser')

var path = require('path');

var Route = require('./models/route');


 /* serves main page */
 app.get("/", function(req, res) {
 	var filePath = path.join(__dirname, './public', 'app.html')
 	res.sendFile(filePath);
 });

 app.put('/api/route', bodyParser.json(), function(req, res) {
 	var newRoute = req.body;
 	Route.save(newRoute, function(err) {
 		if (err) res.send(err);
 		else res.send({ done: true });
 	});
 });

app.get('/api/route', function(req, res) {
 	Route.getAll(function(err, routes) {
 		if (err) res.send(err);
 		else res.send({ routes: routes });
 	});
 });

var port = process.env.PORT || 5000;
app.listen(port, function() {
  	console.log("Listening on " + port);
});