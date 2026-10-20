d3.csv("jobs_in_data.csv").then(function (data) {
    // Parse the data
    data.forEach(function (d) {
        d.work_year = +d.work_year;
        d.salary_in_usd = +d.salary_in_usd;
    });

    // One series per job category: average salary and number of records for each year.
    // (Before: every line was drawn once per year, so each category had up to 4 stacked copies.)
    const series = d3.groups(data, d => d.job_category).map(([category, rows]) => ({
        category,
        values: d3.rollups(rows,
            v => ({ avg: d3.mean(v, d => d.salary_in_usd), n: v.length }),
            d => d.work_year)
            .map(([year, s]) => ({ year, category, avg: s.avg, n: s.n }))
            .sort((a, b) => a.year - b.year)
    }));

    // Order categories by their latest average salary, highest first
    series.sort((a, b) => b.values[b.values.length - 1].avg - a.values[a.values.length - 1].avg);

    const years = d3.range(d3.min(data, d => d.work_year), d3.max(data, d => d.work_year) + 1);
    const SMALL_SAMPLE = 10; // fewer records than this is drawn as a hollow point

    // Your original color palette for job categories (set here, so the page theme never changes it)
    const vibrantColors = [
        "#FF5733", "#33FFBD", "#FF33A8", "#3357FF", "#33FF57", "#FF8C33",
        "#D833FF", "#33FFF5", "#FFC733", "#B633FF", "#33FF96", "#FF336F"
    ];

    // Same color assignment as before: categories in the order they appear in the data
    const categories = Array.from(new Set(data.map(d => d.job_category)));
    const color = d3.scaleOrdinal()
        .domain(categories)
        .range(vibrantColors);

    const gridGrey = "#E5E5E5";
    const textColor = "#333";

    // Set up dimensions (the SVG scales to fit its box)
    const margin = { top: 20, right: 230, bottom: 50, left: 70 },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const container = d3.select("#my_dataviz");

    const svgRoot = container.append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("role", "img")
        .attr("aria-label", "Line chart of average salary by data job category, 2020 to 2023");

    const svg = svgRoot.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Tooltip
    const div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("display", "none");

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);

    const allValues = series.flatMap(s => s.values.map(v => v.avg));
    const y = d3.scaleLinear()
        .domain([d3.min(allValues) * 0.85, d3.max(allValues) * 1.05])
        .nice()
        .range([height, 0]);

    // Light grid lines: horizontal for salary, vertical for each year,
    // so every point (including lines that start in 2021 or 2022) lines up with its year
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").attr("stroke", gridGrey));

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickValues(years).tickSize(-height).tickFormat(""))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line").attr("stroke", gridGrey));

    // Axes
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format("d")))
        .call(g => g.selectAll("text").attr("font-size", 13));

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => "$" + d / 1000 + "k"))
        .call(g => g.selectAll("text").attr("font-size", 13));

    // Axis titles
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 42)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", textColor)
        .text("Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -56)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("fill", textColor)
        .text("Average salary (USD)");

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.avg))
        .curve(d3.curveLinear); // straight segments between yearly averages (no invented curves between years)

    // One group per category: the line, a wider invisible hover target, points and an end label
    const groups = svg.selectAll(".series")
        .data(series)
        .join("g")
        .attr("class", "series");

    groups.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", d => color(d.category))
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", d => line(d.values));

    groups.append("path")
        .attr("class", "hit")
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 14)
        .attr("d", d => line(d.values))
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => highlight(d.category, true))
        .on("mouseout", () => highlight(selected))
        .on("click", (event, d) => select(d.category));

    // A point for every year, so each line is anchored where its data starts and ends
    groups.selectAll(".point")
        .data(d => d.values)
        .join("circle")
        .attr("class", "point")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.avg))
        .attr("r", 4)
        .attr("stroke-width", 2)
        .attr("fill", d => d.n < SMALL_SAMPLE ? "#FFFFFF" : color(d.category))
        .attr("stroke", d => color(d.category))
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            div.style("display", "block")
                .html(`<strong>${d.category}</strong><br>${d.year}: ${d3.format("$,.0f")(d.avg)}<br>` +
                    `<span class="note">Based on ${d.n} job record${d.n === 1 ? "" : "s"}` +
                    (d.n < SMALL_SAMPLE ? " (small sample)" : "") + `</span>`)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseout", () => div.style("display", "none"));

    // Value labels above the points (shown when highlighted)
    groups.selectAll(".value")
        .data(d => d.values)
        .join("text")
        .attr("class", "value")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.avg) - 12)
        .attr("text-anchor", d => d.year === years[0] ? "start" : d.year === years[years.length - 1] ? "end" : "middle")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("fill", textColor)
        .style("display", "none")
        .text(d => "$" + Math.round(d.avg / 1000) + "k");

    // Category names at the end of each line, nudged apart so they don't overlap.
    // A short connector joins each name to the end of its line, so no label floats on its own.
    const LABEL_X = width + 34;
    const labels = series.map(s => {
        const last = s.values[s.values.length - 1];
        return { category: s.category, endX: x(last.year), y: y(last.avg), target: y(last.avg) };
    }).sort((a, b) => a.y - b.y);
    const GAP = 15;
    for (let i = 1; i < labels.length; i++) {
        if (labels[i].y - labels[i - 1].y < GAP) labels[i].y = labels[i - 1].y + GAP;
    }
    const overflow = labels[labels.length - 1].y - height;
    if (overflow > 0) labels.forEach(l => l.y -= overflow);
    const labelFor = new Map(labels.map(l => [l.category, l]));

    groups.append("path")
        .attr("class", "connector")
        .attr("fill", "none")
        .attr("stroke", d => color(d.category))
        .attr("stroke-width", 1.5)
        .attr("d", d => {
            const l = labelFor.get(d.category);
            return `M${l.endX + 6},${l.target} L${l.endX + 16},${l.target} L${LABEL_X - 8},${l.y} L${LABEL_X - 4},${l.y}`;
        });

    groups.append("text")
        .attr("class", "end-label")
        .attr("x", LABEL_X)
        .attr("y", d => labelFor.get(d.category).y)
        .attr("dy", "0.35em")
        .attr("font-size", 12)
        .style("cursor", "pointer")
        .text(d => d.category)
        .on("mouseover", (event, d) => highlight(d.category, true))
        .on("mouseout", () => highlight(selected))
        .on("click", (event, d) => select(d.category));

    // Highlight one category (or none) across the lines, points, labels and buttons
    let selected = null;

    function highlight(category, hovering) {
        groups.each(function (d) {
            const g = d3.select(this);
            const on = d.category === category;
            const dim = category !== null && !on;
            // Other lines fade instead of disappearing, so you can still compare
            g.select(".line")
                .attr("stroke-opacity", dim ? 0.15 : 1)
                .attr("stroke-width", on ? 4 : 3);
            g.select(".end-label")
                .attr("fill", textColor)
                .attr("fill-opacity", dim ? 0.35 : 1)
                .attr("font-weight", on ? "bold" : "normal");
            g.selectAll(".point")
                .attr("r", on ? 6 : 4)
                .attr("opacity", dim ? 0.15 : 1);
            g.select(".connector")
                .attr("stroke-opacity", dim ? 0.15 : 1);
            g.selectAll(".value").style("display", on ? null : "none");
            if (on) g.raise();
        });
        if (!hovering) {
            buttonsContainer.selectAll("button")
                .attr("aria-pressed", function () { return this.dataset.category === (category || "all"); });
        }
    }

    function select(category) {
        selected = category === selected ? null : category;
        highlight(selected);
    }

    // Create buttons for category selection
    const buttonsContainer = container.append("div")
        .attr("class", "buttons-container")
        .attr("role", "group")
        .attr("aria-label", "Highlight a job category");

    // Add "Show All" button
    buttonsContainer.append("button")
        .attr("class", "cat-btn")
        .attr("data-category", "all")
        .style("background-color", "#aaa") // your original "Show All" color
        .text("Show All")
        .on("click", function () {
            selected = null;
            highlight(null);
        });

    // Add a button for each category, in the same order as the chart (highest latest salary first)
    series.forEach(s => {
        buttonsContainer.append("button")
            .attr("class", "cat-btn")
            .attr("data-category", s.category)
            .style("background-color", color(s.category)) // button matches its line, as before
            .text(s.category)
            .on("click", function () { select(s.category); });
    });

    // Note under the chart
    d3.select("#histogram").append("p")
        .attr("class", "line-note")
        .text("Hollow points are based on fewer than " + SMALL_SAMPLE + " job records that year, so read them with caution.");

    highlight(null);
}).catch(function (error) {
    console.error(error);
    d3.select("#my_dataviz").append("p").text("The line chart couldn't load its data. Refresh the page to try again.");
});
