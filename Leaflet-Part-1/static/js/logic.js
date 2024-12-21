// Store our API endpoints as queryUrl and plateUrl
let queryUrl = "static/data/Chunk.json"; // Earthquake data
let plateUrl = "static/data/PB2002_boundaries.json"; // Tectonic plate data

let myMap; // Declare the map variable globally
let earthquakeLayer; // Keep track of the earthquake layer

// Perform a GET request to both URLs
d3.json(queryUrl).then(function (earthquakeData) {
    d3.json(plateUrl).then(function (plateData) {
        console.log(earthquakeData);
        console.log(plateData);
        createFeatures(earthquakeData.features, plateData.features);

        // Find the first and last dates
        const { firstDate, lastDate } = findFirstAndLastDates(earthquakeData);

        console.log("First Date:", firstDate);
        console.log("Last Date:", lastDate);

        // Initialize the timeline
        initializeTimeline(firstDate, lastDate, earthquakeData.features);
    });
});

// Function to find the first and last dates from the dataset
function findFirstAndLastDates(data) {
    const dates = data.features
        .map(feature => new Date(feature.properties.date))
        .filter(date => !isNaN(date)); // Exclude invalid dates

    console.log("Filtered Valid Dates:", dates);

    if (dates.length === 0) {
        console.error("No valid dates found in the dataset.");
        return { firstDate: null, lastDate: null };
    }

    const firstDate = new Date(Math.min(...dates));
    const lastDate = new Date(Math.max(...dates));
    return { firstDate, lastDate };
}

// Initialize the timeline
function initializeTimeline(firstDate, lastDate, features) {
    const timelineInput = document.getElementById("timeline");
    const playButton = document.getElementById("playButton");
    const dateDisplay = document.getElementById("date_title_bottom");
    let intervalId = null;

    // Set up the slider range based on the timeline
    const totalDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)); // Days between
    timelineInput.min = 0;
    timelineInput.max = totalDays;
    timelineInput.value = 0;

    console.log("Total Days:", totalDays);

    // Update the map by the selected date
    function updateMapByDate(features, startDate, index) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);

        console.log("Current Date on Timeline:", currentDate);

        const dateDisplay = document.getElementById("date_title_bottom");
        if (dateDisplay) {
            dateDisplay.textContent = `Date: ${currentDate.toISOString().split("T")[0]}`;
        } else {
            console.error("Element with id 'date_title_bottom' not found.");
        }

        const filteredFeatures = features.filter(feature => {
            const earthquakeDate = new Date(feature.properties.date);
            return earthquakeDate <= currentDate;
        });

        console.log("Filtered Features:", filteredFeatures.length);
        updateEarthquakeLayer(filteredFeatures);
    }


    // Play the timeline
    function playTimeline() {
        let currentIndex = parseInt(timelineInput.value, 10);
        clearInterval(intervalId);

        intervalId = setInterval(() => {
            if (currentIndex > totalDays) {
                clearInterval(intervalId);
            } else {
                console.log("Playing Index:", currentIndex);
                timelineInput.value = currentIndex;
                updateMapByDate(features, firstDate, currentIndex);
                currentIndex++;
            }
        }, 1000); // Adjust speed as needed
    }

    // Event listeners for controls
    playButton.addEventListener("click", playTimeline);
    timelineInput.addEventListener("input", (e) => {
        const index = +e.target.value;
        updateMapByDate(features, firstDate, index);
    });

    // Initial map update
    updateMapByDate(features, firstDate, 0);
}

// Update earthquake markers on the map
function updateEarthquakeLayer(filteredFeatures) {
    if (earthquakeLayer) {
        myMap.removeLayer(earthquakeLayer); // Remove the existing layer
    }

    earthquakeLayer = L.geoJSON(filteredFeatures, {
        pointToLayer: createMarker,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(`<h3>Location:</h3> ${feature.properties.place}
                             <h3>Magnitude:</h3> ${feature.properties.magnitudo}
                             <h3>Depth:</h3> ${feature.geometry.coordinates[2]} km
                             <h3>Date:</h3> ${feature.properties.date}`);
        }
    });

    earthquakeLayer.addTo(myMap); // Add the updated layer to the map
}

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
    // Check if the map already exists
    if (myMap) {
        myMap.remove();
    }

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
    myMap = L.map("map", {
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
    return depth > 90 ? '#1a9850' :  // Deep earthquakes (green)
        depth > 70 ? '#91cf60' :
            depth > 50 ? '#d9ef8b' :
                depth > 30 ? '#fee08b' :
                    depth > 10 ? '#fc8d59' :
                        '#d73027';  // Shallow earthquakes (red)
}
