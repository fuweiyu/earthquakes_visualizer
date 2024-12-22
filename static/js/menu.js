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
        { id: "printChart", label: "Print Chart" },
        { id: "downloadPNG", label: "Download PNG" },
        { id: "downloadJPEG", label: "Download JPEG" },
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

    // Additional container for date range
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
    const printChartBtn = document.getElementById("printChart");
    const downloadPNGBtn = document.getElementById("downloadPNG");
    const downloadJPEGBtn = document.getElementById("downloadJPEG");
    const downloadCSVBtn = document.getElementById("downloadCSV");
    const downloadXLSBtn = document.getElementById("downloadXLS");
    const exportOptions = document.getElementById("export-options");
    const confirmExportBtn = document.getElementById("confirmExportBtn");
    const allDataCheckbox = document.getElementById("allDataCheckbox");
    const dateFromInput = document.getElementById("dateFrom");
    const dateToInput = document.getElementById("dateTo");

    // MENU EVENT HANDLERS
    printChartBtn.addEventListener("click", () => {
        hamburgerMenu.classList.add("hidden");
        if (window.myChart && typeof window.myChart.print === "function") {
            window.myChart.print();
        } else {
            window.print();
        }
    });

    downloadPNGBtn.addEventListener("click", () => {
        hamburgerMenu.classList.add("hidden");
        if (window.myChart && typeof window.myChart.exportChart === "function") {
            window.myChart.exportChart({ type: "image/png" });
        } else {
            alert("PNG export requires Highcharts or a custom method.");
        }
    });

    downloadJPEGBtn.addEventListener("click", () => {
        hamburgerMenu.classList.add("hidden");
        if (window.myChart && typeof window.myChart.exportChart === "function") {
            window.myChart.exportChart({ type: "image/jpeg" });
        } else {
            alert("JPEG export requires Highcharts or a custom method.");
        }
    });

    function showExportOptions(format) {
        exportOptions.setAttribute("data-format", format);
        exportOptions.classList.remove("hidden");
    }

    downloadCSVBtn.addEventListener("click", () => showExportOptions("csv"));
    downloadXLSBtn.addEventListener("click", () => showExportOptions("xls"));

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

        let filteredData = [];
        if (allData) {
            filteredData = window.allEarthquakes || [];
        } else {
            // Convert string to Date
            let fromDate = new Date(dateFrom);
            let toDate = new Date(dateTo);

            filteredData = (window.allEarthquakes || []).filter(eq => {
                let eqDate = new Date(eq.properties.date);
                return eqDate >= fromDate && eqDate <= toDate;
            });
        }

        if (format === "csv") {
            downloadCSVData(filteredData);
        } else {
            downloadXLSData(filteredData);
        }
    });

    // Helper functions
    function downloadCSVData(data) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Place,Magnitude,Depth\n";
        data.forEach(feature => {
            const d = feature.properties.date;
            const p = feature.properties.place;
            const m = feature.properties.magnitudo;
            const depth = feature.geometry.coordinates[2];
            csvContent += `${d},${p},${m},${depth}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "earthquakes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function downloadXLSData(data) {
        let table = `<table border="1">
      <tr><th>Date</th><th>Place</th><th>Magnitude</th><th>Depth</th></tr>
    `;
        data.forEach(feature => {
            const d = feature.properties.date;
            const p = feature.properties.place;
            const m = feature.properties.magnitudo;
            const depth = feature.geometry.coordinates[2];
            table += `<tr><td>${d}</td><td>${p}</td><td>${m}</td><td>${depth}</td></tr>`;
        });
        table += `</table>`;

        const xlsData = "data:application/vnd.ms-excel;base64," + btoa(table);
        const link = document.createElement("a");
        link.setAttribute("href", xlsData);
        link.setAttribute("download", "earthquakes.xls");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
