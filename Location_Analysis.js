document.addEventListener('DOMContentLoaded', function () {
    const svg = d3.select("#mapSVG");
    const mapDiv = d3.select("#map");
    const caption = d3.select("#mapCaption");

    // Draw in a fixed coordinate space and let the SVG scale to its container.
    // (Before: a fixed 1400px-wide SVG was cropped by the 400px-tall box.)
    const width = 960;
    const height = 500;
    svg.attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Hatched pattern for countries with no data, so "no data" never looks like "low salary"
    const defs = svg.append("defs");
    const pattern = defs.append("pattern")
        .attr("id", "noDataPattern")
        .attr("width", 4)
        .attr("height", 4)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "rotate(45)");
    pattern.append("rect").attr("width", 4).attr("height", 4).attr("fill", "#FFFFFF");
    pattern.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 4)
        .attr("stroke", "#CCCCCC").attr("stroke-width", 2);

    // Everything that zooms lives in one group
    const mapLayer = svg.append("g");

    // Natural Earth keeps country sizes closer to reality than Mercator
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath().projection(projection);

    const tooltip = d3.select("#tooltip");

    // Legend inside the map box. (Before: it was added to "#mapContainer", which doesn't exist.)
    const legend = mapDiv.append("div").attr("class", "map-legend");

    // Names in the CSV that are spelled differently in the map file
    const countryNameToCode = {
        "United States": "United States of America",
        "Bahamas": "The Bahamas"
    };

    // Your original color palette and salary steps.
    // (Before: 7 bin edges for 7 colors, so salaries of $120k+ got no color and the US was drawn black.
    //  Now 6 edges split the range into 7 bins, one per color.)
    const colorRanges = [20000, 40000, 60000, 80000, 100000, 120000];
    const colorPalette = ["#ffffcc", "#ffeda0", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026", "#67000d"];
    const colorScale = d3.scaleThreshold()
        .domain(colorRanges)
        .range(colorPalette);

    const money = d3.format("$,.0f");
    const short = v => "$" + (v / 1000) + "k";

    legend.html(`
        <h4>Average salary (USD)</h4>
        ${colorPalette.map((c, i) => {
            const label = i === 0 ? `Under ${short(colorRanges[0])}`
                : i === colorPalette.length - 1 ? `${short(colorRanges[i - 1])}+`
                : `${short(colorRanges[i - 1])} – ${short(colorRanges[i])}`;
            return `<div class="row"><span class="swatch" style="background:${c}"></span>${label}</div>`;
        }).join("")}
        <div class="row"><span class="swatch no-data"></span>No data</div>
    `);

    Promise.all([
        d3.json('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'),
        d3.csv('jobs_in_data.csv')
    ]).then(function ([geojson, data]) {
        data.forEach(d => {
            d.company_location = countryNameToCode[d.company_location] || d.company_location;
            d.salary_in_usd = +d.salary_in_usd;
        });

        // Some shapes in this map file are wound the opposite way to what D3 expects.
        // D3 then draws them as "the whole globe except this country", which painted
        // a giant block over the map. Flip any shape that covers more than half the globe.
        geojson.features.forEach(f => {
            if (d3.geoArea(f) > 2 * Math.PI) {
                const flip = rings => rings.forEach(ring => ring.reverse());
                if (f.geometry.type === "Polygon") flip(f.geometry.coordinates);
                if (f.geometry.type === "MultiPolygon") f.geometry.coordinates.forEach(flip);
            }
        });

        // Leave out Antarctica so the rest of the world gets the space
        const features = geojson.features.filter(f => f.properties.name !== "Antarctica");
        projection.fitExtent([[10, 10], [width - 10, height - 10]], { type: "FeatureCollection", features });

        let stats = new Map();

        const countries = mapLayer.selectAll("path")
            .data(features)
            .join("path")
            .attr("d", path)
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("vector-effect", "non-scaling-stroke")
            .on("mouseover", function (event, d) {
                const s = stats.get(d.properties.name);
                d3.select(this).raise()
                    .attr("stroke-width", 2);
                tooltip.style("display", "block")
                    .html(`<strong>${d.properties.name}</strong><br>` + (s
                        ? `Average salary: ${money(s.avg)}<br>Job records: ${s.n}`
                        : `<span class="note">No job records for this selection</span>`));
                moveTooltip(event);
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
                tooltip.style("display", "none");
                d3.select(this)
                    .attr("stroke-width", 0.5);
            });

        // Position the tooltip inside the map box, next to the cursor
        function moveTooltip(event) {
            const [mx, my] = d3.pointer(event, mapDiv.node());
            const box = mapDiv.node().getBoundingClientRect();
            const tip = tooltip.node();
            const left = Math.min(mx + 14, box.width - tip.offsetWidth - 8);
            tooltip.style("left", left + "px")
                .style("top", (my - tip.offsetHeight - 10) + "px");
        }

        function drawMap(year) {
            const rows = year === "all" ? data : data.filter(d => d.work_year === year);

            // Average once per country instead of re-filtering the whole CSV for every country
            stats = d3.rollup(rows,
                v => ({ avg: d3.mean(v, d => d.salary_in_usd), n: v.length }),
                d => d.company_location);

            countries.attr("fill", d => {
                const s = stats.get(d.properties.name);
                return s ? colorScale(s.avg) : "url(#noDataPattern)";
            });

            const shown = features.filter(f => stats.has(f.properties.name)).length;
            caption.text(`Showing ${year === "all" ? "all years (2020–2023)" : year} · ${rows.length.toLocaleString()} job records · ${shown} countries with data`);

            d3.selectAll(".button-container button")
                .attr("aria-pressed", function () { return this.id === "year" + (year === "all" ? "All" : year); });
        }

        document.getElementById('yearAll').addEventListener('click', () => drawMap("all"));
        document.getElementById('year2020').addEventListener('click', () => drawMap("2020"));
        document.getElementById('year2021').addEventListener('click', () => drawMap("2021"));
        document.getElementById('year2022').addEventListener('click', () => drawMap("2022"));
        document.getElementById('year2023').addEventListener('click', () => drawMap("2023"));

        drawMap("all");
    }).catch(function (error) {
        console.error(error);
        caption.text("The map couldn't load. Check your internet connection and refresh the page.");
    });

    // Zoom and pan by moving the group, not by re-projecting.
    // (Before: the zoom handler reset the projection to a different scale and to the top-left corner, so the map jumped on the first scroll.)
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", event => mapLayer.attr("transform", event.transform));

    svg.call(zoom);
});
