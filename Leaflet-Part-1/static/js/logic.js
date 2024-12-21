// Store our API endpoint as queryUrl
let queryUrl = "static/data/Chunk.json"; // Adjust path based on where Chunk.json is stored

// Perform a GET request to the query URL
d3.json(queryUrl).then(function (earthquakeData) {
    // Log the fetched data to verify
    console.log(earthquakeData);
    createFeatures(earthquakeData.features);
});

// Create markers whose size increases with magnitude and color with depth
function createMarker(feature, latlng) {
    return L.circleMarker(latlng, {
        radius: markerSize(feature.properties.magnitudo), // Adjust based on "magnitudo" property
        fillColor: markerColor(feature.geometry.coordinates[2]), // Depth is the third coordinate
        color: "#000",
        weight: 0.5,
        opacity: 0.5,
        fillOpacity: 1
    });
}

function createFeatures(earthquakeData) {
    // Define function to run for each feature in the features array
    // Provide popups with detailed earthquake info
    function onEachFeature(feature, layer) {
        layer.bindPopup(`<h3>Location:</h3> ${feature.properties.place}
                         <h3>Magnitude:</h3> ${feature.properties.magnitudo}
                         <h3>Depth:</h3> ${feature.geometry.coordinates[2]} km`);
    }

    // Create a GeoJSON layer containing the earthquake data
    let earthquakes = L.geoJSON(earthquakeData, {
        onEachFeature: onEachFeature,
        pointToLayer: createMarker
    });

    // Send earthquakes layer to the createMap function
    createMap(earthquakes);
}

function createMap(earthquakes) {
    // Create the base map layer
    let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Initialize the map
    let myMap = L.map("map", {
        center: [37.09, -95.71], // Center on the US
        zoom: 5,
        layers: [street, earthquakes]
    });

    // Add a legend for depth representation
    let legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info legend'),
            grades = [-10, 10, 30, 50, 70, 90],
            labels = [];

        // Loop through intervals to generate a label with a colored square for each interval
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                `<i style="background:${markerColor(grades[i] + 1)}"></i> ` +
                `${grades[i]}${grades[i + 1] ? `&ndash;${grades[i + 1]}<br>` : '+'}`;
        }

        return div;
    };

    legend.addTo(myMap);
}

// Helper functions for marker size and color
function markerSize(magnitude) {
    return magnitude * 5;
}

function markerColor(depth) {
    return depth > 90 ? '#1a9850' :  // Deep earthquakes (green)
        depth > 70 ? '#91cf60' :
            depth > 50 ? '#d9ef8b' :
                depth > 30 ? '#fee08b' :
                    depth > 10 ? '#fc8d59' :
                        '#d73027';  // Shallow earthquakes (red)
}
