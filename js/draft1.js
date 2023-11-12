(function(){  //localize everything to this .js file by wrapping it in a function

    //pseudo-global variables
    //variables for data join
    var attrArray = ["OFFSET CREDITS"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 45,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 70000]);
    
    
    
    //begin script when window loads
    window.onload = setMap();
    
    //set up choropleth map
    function setMap(){
    
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 650;
    
        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        //create Albers equal area conic projection centered on Africa
        //Site for troubleshooting: https://stackoverflow.com/questions/71272770/using-d3-to-retrieve-a-topojson-u-s-county-from-coordinates
        var projection = d3.geoAlbersUsa()
            .scale(1000)
            .translate([400, 300]);
    
        var path = d3.geoPath()
            .projection(projection);
    
    
    
    
    
        //use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/Offsets_Data_test_2.csv"),
                        d3.json("data/boundaries/active/MapShaper_TopoJSON/output.json"),
                        d3.json("data/states-10m.json")                                       
                        ];
          
        Promise.all(promises).then(callback);
    
    
    
    
    
        function callback(data){    
            csvData = data[0];        
            Boundaries = data[1];
            Land = data[2];
            //console.log(csvData);
            console.log(Boundaries);    
    
    
            //place graticule on the map
            setGraticule(map, path);
    
            //translate Offset Projects TopoJSON
            var states = topojson.feature(Land, Land.objects.states),
                OffsetBoundaries = topojson.feature(Boundaries, Boundaries.objects.Boundaries_polygons).features;
            
            //add States to map
            var USAStates = map.append("path")
                .datum(states)
                .attr("class", "statename")
                .attr("d", path);

            
    
            //join csv data to GeoJSON enumeration units
            OffsetBoundaries = joinData(OffsetBoundaries, csvData);
    
            var colorScale = makeColorScale(csvData);
    
            //add enumeration units to the map
            setEnumerationUnits(OffsetBoundaries, map, path, colorScale);
    
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
    
            //add dropdown menu
            createDropdown(csvData, colorScale)
        }
    }
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });
    
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Species");
        
        var attrArray2 = ["CARBON CREDITS ISSUED"]; //list of attributes
    
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray2)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    
        var top = document.querySelector(".map").getBoundingClientRect().top + 20,
            left =  document.querySelector(".map").getBoundingClientRect().left;
            document.querySelector(".dropdown").style.top = top + "px";
    
        console.log(document.querySelector(".dropdown"))
    };
    
    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;
    
        //recreate the color scale
        var colorScale = makeColorScale(csvData);
    
        //recolor enumeration units
        var projects = d3.selectAll(".projects")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                    var value = d.properties[expressed];
                    if (value == -1) {
                        return "#ACADA8"; 
                    } else if (value == 0) {                
                        return "#ffffff";            
                    } else {
                        return colorScale(d.properties[expressed]);  
                    }
        });     
    
        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 60
            })
            .duration(500);
    
        console.log(bars)
           
        updateChart(bars, csvData.length, colorScale);
    }
    
    function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
    
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };       
    
    function joinData(OffsetBoundaries, csvData){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvBoundary = csvData[i]; //the current region
            var csvKey = csvBoundary.OffsetBoundary; //the CSV primary key
    
            //loop through geojson regions to find correct region
            for (var a=0; a<OffsetBoundaries.length; a++){
    
                var geojsonProps = OffsetBoundaries[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.OPR_ID; //the geojson primary key
    
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvBoundary[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
    
        return OffsetBoundaries;
    };
    
    function setEnumerationUnits(OffsetBoundaries, map, path, colorScale){
        //add National Parks to map
        var projects = map.selectAll(".projects")
            .data(OffsetBoundaries)
            .enter()
            .append("path")
            .attr("class", function(d){
                console.log(d.properties)
                return "projects d" + d.properties.ID;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if (value == -1) {
                    return "#ACADA8"; 
                } else if (value == 0) {                
                    return "#ffffff";            
                } else {
                    return colorScale(d.properties[expressed]);  
                }
            })
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);
            var desc = projects.append("desc")
                .text('{"stroke": "#6a4a3a", "stroke-width": "2px"}')
    
        //console.log(africanCountries)
        console.log(OffsetBoundaries)
    };
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#c7e9c0",
            "#74c476",
            "#238b45",
            "#005a32"
        ];
        
        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
    
        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
    
        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 4);
    
        console.log(clusters)
    
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();
    
        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);
    
        return colorScale;
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        
    
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar d" + d.ID;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            })
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
    
        //annotate bars with attribute value text
       /* var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.ID;
            })
            .attr("text-anchor", "middle")
            .attr("width", chartInnerWidth / csvData.length - 1)
    
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .text(function(d){
                return d[expressed];
            });*/
    
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);
    
        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
    
        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 28)
            .attr("class", "chartTitle")
            .text("Number of " + expressed + "s assigned to each Forest Carbon Offset Project");
    
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);    
    };
    
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        
        //position bars
        bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
            })
            .attr("height", function(d, i){
                if (isNaN(parseFloat(d[expressed])))
                    return chartInnerHeight - yScale(0);
                else
                    return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                if (isNaN(parseFloat(d[expressed])))
                    return yScale(0) + topBottomPadding;
                else
                    return yScale(parseFloat(d[expressed])) + topBottomPadding; 
            })
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else if (value == 0) {                
                    return "#ffffff";            
                } else{
                    return "#ACADA8";   
                }    
        });
    
        var chartTitle = d3.select(".chartTitle")
        .text("Number of " + expressed + "s assigned to each Forest Carbon Offset Project");
    };
    
    function highlight(props){
        console.log('hello')//change stroke
        var selected = d3.selectAll(".d" + props.ID)
            .style("stroke", "#E31B23")
            .style("stroke-width", "2");
    
        setLabel(props)
    };
    
    function dehighlight(props){
        var selected = d3.selectAll(".d" + props.ID)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });
    
        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();
    
            var styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };
    
        d3.select(".infolabel")
            .remove();
    };
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";
    
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.ID + "_label")
            .html(labelAttribute);
    
        var OffsetID = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.OffsetBoundary);
    };
    
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        //use coordinates of mousemove event to set label coordinates
        var x = event.clientX + 10,
            y = event.clientY - 75 + window.scrollY
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y;
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
    })(); //finished wrapping everything