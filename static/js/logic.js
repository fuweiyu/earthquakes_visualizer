// Store our API endpoints as queryUrl and plateUrl
let queryUrl = "static/data/Chunk.json"; // Earthquake data
let plateUrl = "static/data/PB2002_boundaries.json"; // Tectonic plate data

// Perform a GET request to both URLs
d3.json(queryUrl).then(function (earthquakeData) {
    d3.json(plateUrl).then(function (plateData) {
        console.log(earthquakeData);
        console.log(plateData);
        createFeatures(earthquakeData.features, plateData.features);
    });
});

// Create markers for earthquakes
function createMarker(feature, latlng) {
    return L.circleMarker(latlng, {
        radius: markerSize(feature.properties.magnitudo),
        fillColor: markerColor(feature.geometry.coordinates[2]), // Depth is the 3rd coordinate
        color: "#000",
        weight: 0.5,
        opacity: 0.5,
        fillOpacity: 1
    });
}

// Process earthquake and tectonic plate data
function createFeatures(earthquakeData, plateData) {
    // Function to bind popups for earthquake data
    function onEachFeature(feature, layer) {
        layer.bindPopup(`<h3>Location:</h3> ${feature.properties.place}
                         <h3>Magnitude:</h3> ${feature.properties.magnitudo}
                         <h3>Depth:</h3> ${feature.geometry.coordinates[2]} km`);
    }

    // Earthquake layer
    let earthquakes = L.geoJSON(earthquakeData, {
        onEachFeature: onEachFeature,
        pointToLayer: createMarker
    });

    // Tectonic plate layer
    let plates = L.geoJSON(plateData, {
        style: {
            color: "blue",
            weight: 2.5
        }
    });

    // Send layers to the createMap function
    createMap(earthquakes, plates);
}

function createMap(earthquakes, plates) {
    // Create the base layers
    let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors'
    });

    // Define base and overlay maps
    let baseMaps = { "Street Map": street, "Topographic Map": topo };
    let overlayMaps = { "Earthquakes": earthquakes, "Tectonic Plates": plates };

    // Create the map object
    let myMap = L.map("map", {
        center: [37.09, -95.71],
        zoom: 5,
        layers: [street, earthquakes, plates]
    });

    // Add layer controls to the map
    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(myMap);

    // Add a legend for depth
    let legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        let div = L.DomUtil.create('div', 'info legend'),
            grades = [-10, 10, 30, 50, 70, 90];

        // Loop through depth intervals and generate a label with a colored square
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML += `<i style="background:${markerColor(grades[i] + 1)}"></i> ${grades[i]}${grades[i + 1] ? `&ndash;${grades[i + 1]}` : '+'}<br>`;
        }
        return div;
    };

    legend.addTo(myMap);
}

// Helper functions for marker size and color
function markerSize(magnitude) {
    return magnitude * 5; // Scale up magnitude for better visibility
}

function markerColor(depth) {
    return depth > 90 ? '#d73027' :
        depth > 70 ? '#fc8d59' :
            depth > 50 ? '#fee08b' :
                depth > 30 ? '#d9ef8b' :
                    depth > 10 ? '#91cf60' :
                        '#1a9850';
}
