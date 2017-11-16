
var app = angular.module('leafletApp', ['ngResource', 'leaflet-directive']);

app.service('UtilService', function($http) {
	this.extractResponseBody = function(res) {
		return res.data;
	};
});

app.service('MapApiService', function($http, UtilService) {
	this.saveRoute = function(route) {
		return $http.put('http://localhost:5000/api/route', UtilService.extractResponseBody);
	};

	this.getAllRoutes = function() {
		return $http.get('http://localhost:5000/api/route').then(UtilService.extractResponseBody);
	};

	this.getAllMarkers = function() {
		return $http.get('http://localhost:5000/api/marker').then(UtilService.extractResponseBody);
	};
});

app.service('LocationService', function() {
	this.getUserLocation = function(onSuccess, onFailure) {
		if (navigator.geolocation) {
       		navigator.geolocation.getCurrentPosition(onSuccess, onFailure);
   		} else {
       		x.innerHTML = 'Geolocation not supported by this browser.';
        	onFailure();
    	}
	};
});

app.service('PlaceSearchService', function() {
  	this.searchForPlaces = function(placename) {
        return $http.jsonp('http://api.geonames.org/searchJSON?name_startsWith=' +
        		+ placename + '&orderby=relevance&maxRows=10&username=yachtpilot&callback=JSON_CALLBACK')
            .then(function(response) {
            	if (!response || response.data) return [];
                let places = response.data.geonames.map(function(location) {
                    return {
                        title: location.name + ', ' + location.countryName,
                        type: 'location',
                        position: {
                            lat: location.lat,
                            lng: location.lng,
                        },
                        description: location.countryCode,
                    };
                });
                return places;
        	});
    };
});

app.service('WeatherService', function($http, UtilService) {
 	this.getWeatherForecast = function(position) {
e;
 		let coords = {
 			lat: position.coords.latitude,
 			lon: position.coords.longitude,
 		};
		return $http.jsonp('http://api.openweathermap.org/data/2.5/forecast/daily' +
			+ '?lat=' +
			+ coords.lat + '&lon=' + coords.lon + '&cnt=10&mode=json&units=metric&APPID=addcaa36e7580c7679db83e96c7e75c1&callback=JSON_CALLBACK')
		.then(UtilService.extractResponseBody)
		.catch(function(err) {
			console.log('Failed to fetch weather forecast', err);
		});
 	};
});

app.controller('CenterController', ['$scope',
		'leafletData', '$http', 'MapApiService',
		'LocationService', 'WeatherService', '$compile',
		'$templateRequest', '$sce', '$timeout',
	function($scope,
		leafletData, $http, MapApiService,
		LocationService, WeatherService, $compile,
		$templateRequest, $sce, $timeout) {
	initController();

	$scope.selectedMarker;

	$scope.name = 'Alex';

	$scope.setSelectedMarker = function(marker) {
		$scope.selectedMarker = marker;
	};

	$scope.getSelectedMarker = function() {
		return $scope.selectedMarker;
	};

	$scope.storeMarker = function(marker) {
		$scope.markersCache[marker.id] = marker;
		$scope.markers.push(marker);
	};

	$scope.toggleEditing = function() {
		console.log('Toggling ...');
		marker = $scope.getSelectedMarker();
		marker.editing = !marker.editing;
	};

	function getMarkeryById(id) {
		return $scope.markersCache[id];
	}

	function generateMarkerId() {
		let index = $scope.markers.length;
		if (index == 0) return index; else return index++;
	}

	$scope.getMarkerInfo = function(marker) {
		return {
			id: marker.id,
			position: marker.position,
		};
	};

  	function onMapDrawn(map) {
		initMapDrawControl(map); // 1
		initMapEventHandlers(map); // 2
		drawMapElements(map); // 3
		setUserLocation(); // 4

		function setUserLocation() {
			LocationService.getUserLocation(onUserLocationFound); // 4
		}

		function onUserLocationFound(position) {
			map.panTo(new L.LatLng(position.coords.latitude, position.coords.longitude));
			map.zoomIn(5);
			WeatherService.getWeatherForecast(position)
				.then(displayWeatherForecast);
		}

		function displayWeatherForecast(forecast) {
			let timeZone = 1000 * (new Date().getTimezoneOffset())*(-60);
			if (!forecast) return;
       		forecast.list = forecast.list.slice(0, 5);
            forecast.list.forEach(function(day) {
                day.date = new Date(day.dt * 1000 + timeZone);
                day.imageSrc = '/images/weather/' + day.weather[0].icon + '.png';
            });
		}

		function drawMapElements() {
			MapApiService.getAllRoutes()
				.then(function(routes) {
 routes.forEach(drawRoute);});

			// MapApiService.getAllMarkers()
				// .then(function(markers) { markers.forEach(drawMarker) });
		}

		function drawRoute(route) {
			if (!route || !route.points) return;
			let latLngs = route.points.map(function(point) {
             	return L.latLng(point.lat, point.lng);
           	});
            let polyline = L.polyline(latLngs, {color: 'black'});
            polyline.addTo($scope.map);
            MapEventHandlers.onPolylineDrawn(polyline);
		}

		function drawMarker(marker) {

		}
	}

	function initMapDrawControl(map) {
		$scope.map = map;
		let drawnItems = new L.FeatureGroup();
		map.addLayer(drawnItems);
		let drawControl = new L.Control.Draw({
		    edit: {
		        featureGroup: drawnItems,
		    },
		});
		map.addControl(drawControl);
	}

	function initController() {
    	$scope.routes = [];
    	$scope.markers = [];
    	$scope.markersCache = {};

    	angular.extend($scope, {
	        center: {
	            lat: 40.095,
	            lng: -3.823,
	            zoom: 4,
	        },
	        defaults: {
	            scrollWheelZoom: false,
	        },
    	});

  		leafletData.getMap().then(onMapDrawn);
	}

	var MapEventHandlers = {};

	function initMapEventHandlers(map) {
		let onPolylineDrawn = function(layer) {
			let index = $scope.routes.length;
			let points = layer._latlngs;
			let newRoute = {
				id: index++,
				points: points,
				layer: layer,
			};
			$scope.routes.push(newRoute);
		};	
		MapEventHandlers.onPolylineDrawn = onPolylineDrawn;

		let onMarkerDrawn = function(layer) {
			let id = generateMarkerId();
			layer.id = id;

			let marker = {
				id: id,
				position: layer.getLatLng(),
				layer: layer,
			};

			let templateUrl = $sce.getTrustedResourceUrl('popup-template.html');
			$templateRequest(templateUrl).then(onTemplateLoaded);

			function onTemplateLoaded(template) {
				$timeout(function() {
					marker.editing = true;
					$scope.setSelectedMarker(marker);
					let templateEl = angular.element(template);
					let linkFn = $compile(templateEl);
 					let element = linkFn($scope);
 					$scope.$apply();
					layer.bindPopup(element.html());
					layer.openPopup();
					$scope.storeMarker(marker);
				}, 0);
			}
			layer.on('click', onMarkerClick);
		};
		MapEventHandlers.onMarkerDrawn = onMarkerDrawn;


		function onMarkerClick(e) {
			let id = e.target.id;
			let marker = $scope.markersCache[id];
			if (!marker) return;
			$scope.setSelectedMarker(marker);
		}

		function onDrawCreated(e) {
		    let type = e.layerType,
		        layer = e.layer;

		    if (type === 'marker') {
		    	onMarkerDrawn(layer);
		    } else if (type === 'polyline') {
		    	onPolylineDrawn(layer);
		    }
		    map.addLayer(layer);
		}
		map.on('draw:created', onDrawCreated);
	}

	$scope.showRoute = function(index) {
		let route = $scope.routes[index];
		let bounds = route.layer.getBounds();
		$scope.map.fitBounds(bounds);
	};

	$scope.removeRoute = function(index) {
		console.log('index', index);
		let route = $scope.routes[index];
		$scope.map.removeLayer(route.layer);
	};

	$scope.saveRoute = function(index) {
		let route = $scope.routes[index];
		let routeToSave = {
			points: route.points,
		};
		MapService.saveRoute(routeToSave);
	};

	$scope.showMarker = function(index) {
		let marker = $scope.markersCache[index];
		console.log('Got marker', marker, index);
		if (!marker) return;
		$scope.map.panTo(marker.layer.getLatLng());
	};

	$scope.removeMarker = function(index) {

	};

	$scope.saveMarker = function(index) {

	};
}]);
