/* Main Javascript sheet by Zac Pinard, 2023 */

/* Map of GeoJSON data from Offsets_Data_test_2.geojson */

var dataStats = {};

//function to instantiate the Leaflet map
function createMap() {
    //create the map
    var map = L.map('map', {
        center: [40, -95],
        zoom: 3.5
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    /*L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.{ext}', {
        minZoom: 0,
        maxZoom: 18,
        //attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>',
        //attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        Authorization: 'Stadia-Auth 502fff87-7877-46cf-a784-0e0b8e563a03',
        ext: 'png'
    }).addTo(map); */   
    
    //call getData function
    getData(map);
};

function calculateMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each project
    for(var project of data.features){
        //get credits for each project
        var value = project.properties["Total_Number_of_Offset_Credits_Registered"];
        //add value to array
        allValues.push(value);
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.366) * minRadius
    
    return radius;
};

//function to attach popups to each mapped featureg
function onEachFeature(feature, layer) {
};

//Step 2: Import GeoJSON data
//function to retrieve the data and place it on the map
function getData(map) {
    
    //load the data
    fetch("data/Offsets_Data_test_2.geojson")
        
        .then(function (response) {
            return response.json();
        })
        
        .then(function (json) {
            //create an attributes array
            var attributes = processData(json);
            minValue = calculateMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, map, attributes);
            calcStats(json);
            createLegend(attributes, map)
            //calling our renamed function  
        })
        
}

//Step 3: Add circle markers for point features to the map
function createPropSymbols(data, map, attributes) {
    
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            
            return pointToLayer(feature, latlng, attributes, map);
        }
    }).addTo(map);
}

function createPopupContent(properties, carboncredits){
    //create variable for photo
    var photoImg = '<img src="data/NDVI/Images/' + properties.Project_ID + '/' + properties.Project_ID + '.png" height="150px" width="150px"/>';
    //console.log([photoImg]);

    //add project to popup content string
    //console.log("properties:", properties)
    var popupContent = "<p><b>Project Name:</b> " + properties.Project_Name + "</p>";
    popupContent += "<p><b>Project Developer:</b> " + properties.Project_Developer + "</p>";
    popupContent += "<p><b>Registry:</b> " + properties.Registry + "</p>";
    popupContent += "<p><b>Start Date:</b>" + properties.Project_Registered_Date_or_ACR_Current_Crediting_Period_Start_Date + "</p>";
    popupContent += "<p><b>NDVI Change: </b><h2>" + photoImg + "</h2></p>";
    popupContent += "<p><b>Carbon Credits Issued: </b><h2>" + properties[carboncredits] + "</h2></p>";
    //popupContent += "<p><b>Lat:</b>"+ [feature.geometry.coordinates[0]] + "</p>";
    //popupContent += "<p><b>Long:</b>" + [feature.geometry.coordinates[1]] + "</p>"

    return popupContent;
};


//Replace the anonymous function within the createPropSymbols() function with a call 
//to the new pointToLayer() function
function pointToLayer(feature, latlng, attributes, map){
    //console.log("feature:", feature)
    //Step 4: Assign the carbon credits attribute based on its index in the attributes array
    var carboncredits = attributes[14];
    //check
    //console.log(attribute);

    //create marker options
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#4c5c44",
        color: "#FFFFFF",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    var transparentGeojsonMarkerOptions = {
        radius: 8,
        fillColor: "#4c5c44",
        color: "#FFFFFF",
        weight: 1,
        opacity: 1,
        fillOpacity: 0
    };

    //Step 5: For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[carboncredits]);
    //console.log("attValue:", attValue);

    //Step 6: Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);
    transparentGeojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer1 = L.circleMarker(latlng, geojsonMarkerOptions);
    var layer2 = L.circleMarker(latlng, transparentGeojsonMarkerOptions);


    var popupContent = createPopupContent(feature.properties, carboncredits);

    
    console.log("coordinates: ", [feature.geometry.coordinates[0]],[feature.geometry.coordinates[1]])
    
    //bind the popup to the circle marker
    layer2.bindPopup(popupContent,{
        //offset: new L.Point(100,-geojsonMarkerOptions.radius)
        offset: new L.Point([feature.geometry.coordinates[0]],[feature.geometry.coordinates[1]])
        //offset: feature
    });

    layer1.on('click', function(e) {
        

        //https://leafletjs.com/reference.html#map-fitbounds
        //map.setView(e.latlng,11);
        //map.setView(map.fitBounds(loadGeoJSONPolygon))
        
        

        //load JSON file and add to map
        var loadGeoJSONPolygon = fetch("data/boundaries/active/" + feature.properties.Project_ID + ".json")
            .then(function(response) {
                var jsonresponse = response.json()
                return jsonresponse;
            })

            .then(function(data) {
                jsonlayer = L.geoJSON(data);
                jsonlayer.addTo(map);
                var projectGeometry = data.features[0].geometry.coordinates
                /*var allPoints = []
                for (let i = 0; i < projectGeometry.length; i++){
                    allPoints += projectGeometry[i], "]"
                }
                console.log(allPoints) */

                //console.log('data: ', data.features[0].geometry.coordinates)
                //map.setView(map.fitBounds(L.latLngBounds(L.latLng(allPoints))))
                bounds = jsonlayer.getBounds()
                console.log("bounds: ", bounds)

                map.fitBounds([[bounds._northEast],[bounds._southWest]])
            })
            .then(function(data){
                layer1.remove()
                layer2.addTo(map)
                layer2.openPopup()
            })
            .then(map.on('zoomend', function(data) {
                layer1.addTo(map)
                layer2.closePopup()
            }))
            
            /*
            //This currently doesn't work
            .then(map.on('zoomend', function(data) {
                //jsonlayer.remove()
            }))
            */



            /*.then(function(data) {
                var latLngBounds = data//.features[0].geometry.coordinates[1];
                console.log("latLngBounds: ", latLngBounds)
            })*/
            /*.then(function(response){
                var jsonresponse = response.json()
                console.log("jsonresponse: ", jsonresponse)
            })*/
            
            /* Trying various ways to get circles to disappear on click and reappear on zoom out
            to separate two of the same layers and have one transparent stay and the colored go

            .then(function(){
                var layer1 = L.circleMarker(latlng, transparentGeojsonMarkerOptions);
            })

            
            .then(function(){
                map.removeLayer(layer1);
                layer2.bindPopup(popupContent, {
                    offset: new L.Point(0,-geojsonMarkerOptions.radius)
                })
                map.addLayer(layer2);
            })
            .then(function(){
                map.on('mouseout', function(){
                    map.removeLayer(layer2);
                    map.removeLayer(jsonlayer);
                    map.addLayer(layer1)
                })
            
            })
            */

        //var layer = L.circleMarker(latlng, transparentGeojsonMarkerOptions).addTo(map);
        //map.fitBounds(response)
        //console.log(loadGeoJSONPolygon)
        //console.log("geojsonMarkerOptions:", geojsonMarkerOptions)
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer1;
}



//Example 2.7: Adding a legend control in main.js


function createLegend(attributes, map){
    var LegendControl = L.Control.extend({
        options: {
            position: 'topleft'
        },
        
        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //PUT YOUR SCRIPT TO CREATE THE TEMPORAL LEGEND HERE
            //add formatted attribute to panel content string
            container.insertAdjacentHTML('beforeend', "<p><b>Offset Project Carbon Credits</b></p>")

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Step 2: loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){  
                console.log("dataStats[circles[i]]", dataStats[circles[i]])
                console.log("dataStats", dataStats)
                //Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 59 - radius;  
    
                //circle string  
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#4c5c44" fill-opacity="0.8" stroke="#FFFFFF" cx="30"/>';
                
                 //evenly space out labels            
                var textY = i * 20 + 20;            

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + '</text>';
            };

        //close svg string
        svg += "</svg>";

        //add attribute legend svg to container
        container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //console.log("properties:", properties)

    //push each attribute name into attributes array
    for (var attribute in properties){
        attributes.push(attribute);
    };

    //check result
    //console.log("attributes:", attributes);
    

    return attributes;
};

function roundNumber(number) {
    return Math.round(number / 1000) * 1000;
}

function calcStats(data){
    //create empty array to store all data values
    var allValues = []
    //console.log("allValues:",allValues)
    
    //loop through each project
    for(var project of data.features){
        //get number of credits for project
        //console.log("project.properties:", project.properties)
        var carboncredits = project.properties["Total_Number_of_Offset_Credits_Registered"];
        //add value to array
        allValues.push(carboncredits);
    }
    //get min, max, mean stats for our array
    minValue = roundNumber(Math.min(...allValues));
    maxValue = roundNumber(Math.max(...allValues));
    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    meanValue = sum/ allValues.length;

    //add caculated values to dataStats array
    dataStats.min = minValue
    dataStats.max = maxValue
    dataStats.mean = roundNumber(meanValue)

}

document.addEventListener('DOMContentLoaded', createMap)