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

    const totalDays = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    timelineInput.min = 0;
    timelineInput.max = totalDays;
    timelineInput.value = 0;

    function updateMapByDate(index) {
        if (index === 0) {
            dateDisplay.textContent = "Time 0";
            if (earthquakeLayer) myMap.removeLayer(earthquakeLayer);
            return;
        }

        const currentDate = new Date(firstDate);
        currentDate.setDate(firstDate.getDate() + index - 1);
        dateDisplay.textContent = `Date: ${currentDate.toISOString().split("T")[0]}`;

        const filteredFeatures = features.filter(feature => {
            const earthquakeDate = new Date(feature.properties.date);
            return earthquakeDate <= currentDate;
        });

        updateEarthquakeLayer(filteredFeatures);
    }

    function playTimeline(forward = true) {
        clearInterval(intervalId);
        let currentIndex = parseInt(timelineInput.value, 10);

        intervalId = setInterval(() => {
            currentIndex = forward ? currentIndex + 1 : currentIndex - 1;

            if (currentIndex < 0 || currentIndex > totalDays) {
                clearInterval(intervalId);
            } else {
                timelineInput.value = currentIndex;
                updateMapByDate(currentIndex);
            }
        }, 1000);
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
    if (earthquakeLayer) myMap.removeLayer(earthquakeLayer);

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
        center: [37.09, -95.71],
        zoom: 5,
        layers: [street, earthquakes, plates]
    });

    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(myMap);
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
