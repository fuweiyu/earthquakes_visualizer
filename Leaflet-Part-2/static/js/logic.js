// Store our API endpoints as queryUrl and plateUrl
let queryUrl = "static/data/Chunk.json";
let plateUrl = "static/data/PB2002_boundaries.json";

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
        fillColor: markerColor(feature.geometry.coordinates[2]),
        color: "#000",
        weight: 0.5,
        opacity: 0.5,
        fillOpacity: 1
    });
}

// Process earthquake and tectonic plate data
function createFeatures(earthquakeData, plateData) {
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
            weight: 2
        }
    });

    // Send layers to createMap function
    createMap(earthquakes, plates);
}

function createMap(earthquakes, plates) {
    let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors'
    });

    let baseMaps = { "Street Map": street, "Topographic Map": topo };
    let overlayMaps = { "Earthquakes": earthquakes, "Tectonic Plates": plates };

    let myMap = L.map("map", {
        center: [37.09, -95.71],
        zoom: 5,
        layers: [street, earthquakes, plates]
    });

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(myMap);

    let legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        let div = L.DomUtil.create('div', 'info legend'),
            grades = [-10, 10, 30, 50, 70, 90];

        for (let i = 0; i < grades.length; i++) {
            div.innerHTML += `<i style="background:${markerColor(grades[i] + 1)}"></i> ${grades[i]}${grades[i + 1] ? '&ndash;' + grades[i + 1] : '+'}<br>`;
        }
        return div;
    };
    legend.addTo(myMap);
}
