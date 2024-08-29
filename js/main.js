/* Main Javascript sheet by Zac Pinard, 2023 */

var dataStats = {};

//function to instantiate the Leaflet map
function createMap() {
    //create the map
    var map = L.map('map', {
        center: [40, -95],
        zoom: 3.5
    });

    var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    OpenStreetMap_Mapnik.addTo(map);
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

//Import GeoJSON data
//function to retrieve the data and place it on the map
function getData(map) {
    
    //load the data
    fetch("data/Offsets_Data.geojson")
        
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
    var photoImg = '<img src="data/NDVI/' + properties.Project_ID + '/' + properties.Project_ID + '.png" height="300px" width="300px"/>';

    //add project to popup content string
    var popupContent = "<p><b>Project Name:</b> " + properties.Project_Name + "</p>";
    popupContent += "<p><b>Project Developer:</b> " + properties.Project_Developer + "</p>";
    popupContent += "<p><b>Registry:</b> " + properties.Registry + "</p>";
    popupContent += "<p><b>Start Date:</b>" + properties.Project_Registered_Date_or_ACR_Current_Crediting_Period_Start_Date + "</p>";
    popupContent += "<p><b>NDVI Gain: </b><h2>" + photoImg + "</h2></p>";
    popupContent += "<p><b>Carbon Credits Issued: </b><h2>" + properties[carboncredits] + "</h2></p>";
    return popupContent;
};


//Replace the anonymous function within the createPropSymbols() function with a call to the new pointToLayer() function
function pointToLayer(feature, latlng, attributes, map){
    //Assign the carbon credits attribute based on its index in the attributes array
    var carboncredits = attributes[14];
    //create marker options
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#4c5c44",
        color: "#CC5500",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[carboncredits]);

    //Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer1 = L.circleMarker(latlng, geojsonMarkerOptions);
    layer1.addTo(map)

    var popupContent = createPopupContent(feature.properties, carboncredits);
    console.log("coordinates: ", [feature.geometry.coordinates[0]],[feature.geometry.coordinates[1]])
    
    //bind the popup to the circle marker
    layer1.bindPopup(popupContent,{
        offset: new L.Point(100,-geojsonMarkerOptions.radius)
    });
    
    layer1.on('click', function(e) {
        //load JSON file and add to map
        var loadGeoJSONPolygon = fetch("data/boundaries/" + feature.properties.Project_ID + ".json")
            .then(function(response) {
                var jsonresponse = response.json()
                return jsonresponse;
            })
            .then(function(data) {
                jsonlayer = L.geoJSON(data);
                jsonlayer.addTo(map);
                var projectGeometry = data.features[0].geometry.coordinates
                bounds = jsonlayer.getBounds()
                console.log("bounds: ", bounds)
                map.fitBounds([[bounds._northEast],[bounds._southWest]])
            })
            .then(function(data){
                layer1.openPopup();
            })
            
        console.log(loadGeoJSONPolygon)
    });


    //return the circle marker to the L.geoJson pointToLayer option
    return layer1;
}



//Add a legend control
function createLegend(attributes, map){
    var LegendControl = L.Control.extend({
        options: {
            position: 'topleft'
        },
        
        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add formatted attribute to panel content string
            container.insertAdjacentHTML('beforeend', "<p><b>Offset Project Carbon Credits</b></p>")

            //Start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';

            //Array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){  
                console.log("dataStats[circles[i]]", dataStats[circles[i]])
                console.log("dataStats", dataStats)
                //Assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 59 - radius;  
    
                //circle string  
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#4c5c44" fill-opacity="0.8" stroke="#CC5500" stroke-width="2" cx="30"/>';
                
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

    //push each attribute name into attributes array
    for (var attribute in properties){
        attributes.push(attribute);
    };
    return attributes;
};

function roundNumber(number) {
    return Math.round(number / 1000) * 1000;
}

function calcStats(data){
    //create empty array to store all data values
    var allValues = []
    
    //loop through each project
    for(var project of data.features){
        //get number of credits for project
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