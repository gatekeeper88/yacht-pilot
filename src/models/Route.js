var Joi = require('joi');


var mongo = require('mongodb-wrapper')
var db = mongo.db('localhost', 27017,'MapDb') // db connection
var RoutesCollection = db.collection('routes')  // db collection

var routeSchema = Joi.object().keys({
	points: Joi.array().items(Joi.object())
});

exports.save = function(route, callback) {
	Joi.validate(route, routeSchema, function (err, value) { 
		if (err) callback(err);
		RoutesCollection.save(route, function(err, record) {
	 		if (err) callback(err);
	 		else callback(null);
		});
	});		
}

exports.getAll = function(callback) {
	RoutesCollection.find().toArray(function(err, items) {
		if (err) callback(err);
		else callback(items);
	});
}

