let queryUrl = "static/data/Chunk.json";
let plateUrl = "static/data/PB2002_boundaries.json";

let myMap;
let earthquakeLayer;

d3.json(queryUrl).then(function (earthquakeData) {
    d3.json(plateUrl).then(function (plateData) {
        createFeatures(earthquakeData.features, plateData.features);

        const { firstDate, lastDate } = findFirstAndLastDates(earthquakeData);

        initializeTimeline(firstDate, lastDate, earthquakeData.features);
    });
});

function findFirstAndLastDates(data) {
    const dates = data.features
        .map(feature => new Date(feature.properties.date))
        .filter(date => !isNaN(date));

    const firstDate = new Date(Math.min(...dates));
    const lastDate = new Date(Math.max(...dates));
    return { firstDate, lastDate };
}

function initializeTimeline(firstDate, lastDate, features) {
    const timelineInput = document.getElementById("timeline");
    const playBackButton = document.getElementById("playBackButton");
    const stepBackButton = document.getElementById("stepBackButton");
    const pauseButton = document.getElementById("pauseButton");
    const stepForwardButton = document.getElementById("stepForwardButton");
    const playForwardButton = document.getElementById("playForwardButton");
    const dateDisplay = document.getElementById("date_title_bottom");
    let intervalId = null;

    const totalDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1; // Include last day
    timelineInput.min = 0;
    timelineInput.max = totalDays;
    timelineInput.value = 0;

    function updateMapByDate(index) {
        // Get the selected mode from the radio buttons
        const mode = document.querySelector('input[name="mode"]:checked').value;

        // If index is 0, clear the map and display "Date: --"
        if (index === 0) {
            dateDisplay.textContent = "Date: --";

            // Clear all earthquake layers explicitly
            myMap.eachLayer(layer => {
                if (layer instanceof L.GeoJSON) {
                    myMap.removeLayer(layer);
                }
            });

            earthquakeLayer = null; // Clear reference to the layer
            return; // Exit the function to prevent further processing
        }

        // Calculate the current date based on the index
        const currentDate = new Date(firstDate);
        currentDate.setDate(firstDate.getDate() + (index - 1)); // Align index directly to the date
        dateDisplay.textContent = `Date: ${currentDate.toISOString().split("T")[0]}`;

        // Filter features based on the selected mode
        let filteredFeatures;
        if (mode === "cumulative") {
            // Include earthquakes up to and including the current date
            filteredFeatures = features.filter(feature => {
                const earthquakeDate = new Date(feature.properties.date);
                return earthquakeDate <= currentDate;
            });
        } else if (mode === "daily") {
            // Include only earthquakes on the exact current date
            filteredFeatures = features.filter(feature => {
                const earthquakeDate = new Date(feature.properties.date);
                return (
                    earthquakeDate.getFullYear() === currentDate.getFullYear() &&
                    earthquakeDate.getMonth() === currentDate.getMonth() &&
                    earthquakeDate.getDate() === currentDate.getDate()
                );
            });
        }

        // Debugging Logs
        console.log("Mode:", mode);
        console.log("Timeline Index:", index);
        console.log("Current Date:", currentDate);
        console.log("Filtered Earthquakes Count:", filteredFeatures.length);

        // Update the earthquake layer with the filtered features
        updateEarthquakeLayer(filteredFeatures);
    }

    function playTimeline(forward = true) {
        clearInterval(intervalId);
        let currentIndex = parseInt(timelineInput.value, 10);

        intervalId = setInterval(() => {
            if ((forward && currentIndex >= totalDays) || (!forward && currentIndex <= 0)) {
                clearInterval(intervalId);
            } else {
                currentIndex = forward ? currentIndex + 1 : currentIndex - 1;
                timelineInput.value = currentIndex;
                updateMapByDate(currentIndex);
            }
        }, 1000); // Adjust speed as needed
    }

    playBackButton.addEventListener("click", () => playTimeline(false));
    playForwardButton.addEventListener("click", () => playTimeline(true));
    stepBackButton.addEventListener("click", () => {
        let currentIndex = parseInt(timelineInput.value, 10);
        if (currentIndex > 0) {
            timelineInput.value = --currentIndex;
            updateMapByDate(currentIndex);
        }
    });
    stepForwardButton.addEventListener("click", () => {
        let currentIndex = parseInt(timelineInput.value, 10);
        if (currentIndex < totalDays) {
            timelineInput.value = ++currentIndex;
            updateMapByDate(currentIndex);
        }
    });
    pauseButton.addEventListener("click", () => clearInterval(intervalId));
    timelineInput.addEventListener("input", (e) => {
        updateMapByDate(parseInt(e.target.value, 10));
    });

    updateMapByDate(0);
}

function updateEarthquakeLayer(filteredFeatures) {
    // Remove the existing earthquake layer, if any
    if (earthquakeLayer) {
        myMap.removeLayer(earthquakeLayer);
        earthquakeLayer = null; // Clear reference to the removed layer
    }

    // If no features are passed, do not add a new layer
    if (!filteredFeatures || filteredFeatures.length === 0) {
        return;
    }

    // Create a new earthquake layer with the filtered features
    earthquakeLayer = L.geoJSON(filteredFeatures, {
        pointToLayer: createMarker,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(`<h3>Location:</h3> ${feature.properties.place}
                             <h3>Magnitude:</h3> ${feature.properties.magnitudo}
                             <h3>Depth:</h3> ${feature.geometry.coordinates[2]} km
                             <h3>Date:</h3> ${feature.properties.date}`);
        }
    });

    earthquakeLayer.addTo(myMap);
}


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

function createFeatures(earthquakeData, plateData) {
    let earthquakes = L.geoJSON(earthquakeData, {
        pointToLayer: createMarker,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(`<h3>Location:</h3> ${feature.properties.place}
                             <h3>Magnitude:</h3> ${feature.properties.magnitudo}
                             <h3>Depth:</h3> ${feature.geometry.coordinates[2]} km`);
        }
    });

    let plates = L.geoJSON(plateData, {
        style: { color: "blue", weight: 2.5 }
    });

    createMap(earthquakes, plates);
}

function createMap(earthquakes, plates) {
    if (myMap) myMap.remove();

    let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors'
    });

    let baseMaps = { "Street Map": street, "Topographic Map": topo };
    let overlayMaps = { "Earthquakes": earthquakes, "Tectonic Plates": plates };

    myMap = L.map("map", {
        center: [0, 0],
        zoom: 3,
        layers: [street, earthquakes, plates]
    });

    let layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(myMap);

    // Add a listener for when the "Earthquakes" checkbox is toggled
    myMap.on('overlayadd', function (e) {
        if (e.name === "Earthquakes") {
            // Ensure the correct layer is shown based on the selected mode
            const index = parseInt(document.getElementById("timeline").value, 10);
            updateMapByDate(index);
        }
    });

    myMap.on('overlayremove', function (e) {
        if (e.name === "Earthquakes") {
            // Remove the earthquake layer if it's toggled off
            if (earthquakeLayer) {
                myMap.removeLayer(earthquakeLayer);
            }
        }
    });

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


function markerSize(magnitude) {
    return magnitude * 5;
}

function markerColor(depth) {
    return depth > 90 ? '#1a9850' :
        depth > 70 ? '#91cf60' :
            depth > 50 ? '#d9ef8b' :
                depth > 30 ? '#fee08b' :
                    depth > 10 ? '#fc8d59' :
                        '#d73027';
}
