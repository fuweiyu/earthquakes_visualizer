document.addEventListener("DOMContentLoaded", function () {
    const hamburgerIcon = document.getElementById("hamburger-icon");
    const hamburgerMenu = document.getElementById("hamburger-menu");

    // Toggle the dropdown menu
    hamburgerIcon.addEventListener("click", () => {
        hamburgerMenu.classList.toggle("hidden");
    });

    // Build the menu
    const menuList = document.createElement("ul");
    const menuItems = [
        { id: "downloadCSV", label: "Download CSV" },
        { id: "downloadXLS", label: "Download XLS" }
    ];

    menuItems.forEach(item => {
        const li = document.createElement("li");
        li.id = item.id;
        li.textContent = item.label;
        menuList.appendChild(li);
    });
    hamburgerMenu.appendChild(menuList);

    // Additional container for date range (for CSV/XLS)
    const exportOptionsDiv = document.createElement("div");
    exportOptionsDiv.id = "export-options";
    exportOptionsDiv.classList.add("hidden");
    exportOptionsDiv.innerHTML = `
        <p>Customized data range:</p>
        <label>From: <input type="date" id="dateFrom" /></label><br/>
        <label>To: <input type="date" id="dateTo" /></label><br/>
        <label><input type="checkbox" id="allDataCheckbox" /> All the dataset</label>
        <button id="confirmExportBtn">Download</button>
    `;
    hamburgerMenu.appendChild(exportOptionsDiv);

    // References
    const downloadCSVBtn = document.getElementById("downloadCSV");
    const downloadXLSBtn = document.getElementById("downloadXLS");
    const exportOptions = document.getElementById("export-options");
    const confirmExportBtn = document.getElementById("confirmExportBtn");
    const allDataCheckbox = document.getElementById("allDataCheckbox");
    const dateFromInput = document.getElementById("dateFrom");
    const dateToInput = document.getElementById("dateTo");

    // MENU EVENT HANDLERS
    downloadCSVBtn.addEventListener("click", () => showExportOptions("csv"));
    downloadXLSBtn.addEventListener("click", () => showExportOptions("xls"));

    function showExportOptions(format) {
        exportOptions.setAttribute("data-format", format);
        exportOptions.classList.remove("hidden");
    }

    allDataCheckbox.addEventListener("change", () => {
        const isChecked = allDataCheckbox.checked;
        dateFromInput.disabled = isChecked;
        dateToInput.disabled = isChecked;
    });

    confirmExportBtn.addEventListener("click", () => {
        const format = exportOptions.getAttribute("data-format");
        exportOptions.classList.add("hidden");
        hamburgerMenu.classList.add("hidden");

        const allData = allDataCheckbox.checked;
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;

        fetch("/static/data/Chunk.json")
            .then(response => response.json())
            .then(data => {
                const filteredData = allData ? data.features : filterDataByDate(data.features, dateFrom, dateTo);
                if (format === "csv") {
                    downloadCSV(filteredData);
                } else {
                    downloadXLS(filteredData);
                }
            })
            .catch(error => console.error("Error loading data:", error));
    });

    function filterDataByDate(features, dateFrom, dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        return features.filter(feature => {
            const featureDate = new Date(feature.properties.date);
            return featureDate >= fromDate && featureDate <= toDate;
        });
    }

    function escapeCSV(value) {
        if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`; // Escape double quotes
        }
        return value;
    }

    function downloadCSV(data) {
        const headers = [
            "place",
            "status",
            "tsunami",
            "significance",
            "data_type",
            "magnitudo",
            "state",
            "longitude",
            "latitude",
            "depth",
            "date"
        ];

        let csvContent = headers.join(",") + "\n";

        data.forEach(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            const row = [
                escapeCSV(props.place),
                escapeCSV(props.status),
                props.tsunami,
                props.significance,
                escapeCSV(props.data_type),
                props.magnitudo,
                escapeCSV(props.state.trim()),
                coords[0], // longitude
                coords[1], // latitude
                coords[2], // depth
                props.date
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "earthquakes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadXLS(data) {
        let table = `<table border="1">\n<tr>\n<th>Place</th><th>Status</th><th>Tsunami</th><th>Significance</th><th>Data Type</th><th>Magnitudo</th><th>State</th><th>Longitude</th><th>Latitude</th><th>Depth</th><th>Date</th>\n</tr>`;

        data.forEach(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            table += `<tr>\n
                <td>${escapeCSV(props.place)}</td>
                <td>${escapeCSV(props.status)}</td>
                <td>${props.tsunami}</td>
                <td>${props.significance}</td>
                <td>${escapeCSV(props.data_type)}</td>
                <td>${props.magnitudo}</td>
                <td>${escapeCSV(props.state.trim())}</td>
                <td>${coords[0]}</td>
                <td>${coords[1]}</td>
                <td>${coords[2]}</td>
                <td>${props.date}</td>\n</tr>`;
        });

        table += `</table>`;

        const blob = new Blob([table], { type: "application/vnd.ms-excel" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "earthquakes.xls");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
