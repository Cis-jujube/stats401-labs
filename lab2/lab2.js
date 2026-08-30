const tooltip = d3.select("#tooltip");

const width = 800;
const height = 500;

const margin = {
    top: 40,
    right: 170,
    bottom: 70,
    left: 70
};

// Tasks 1-12: student practice scatterplot
d3.csv("../data/students_multivariate.csv", d => ({
    name: d.name,
    study_hours: +d.study_hours,
    score: +d.score,
    major: d.major,
    year: d.year
}))
.then(data => {
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.study_hours))
        .nice()
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.score))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const majors = Array.from(
        new Set(data.map(d => d.major))
    );

    const colorScale = d3.scaleOrdinal()
        .domain(majors)
        .range(d3.schemeTableau10);

    const sizeScale = d3.scaleOrdinal()
        .domain([
            "Freshman",
            "Sophomore",
            "Junior",
            "Senior"
        ])
        .range([5, 7, 9, 11]);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
        .attr(
            "transform",
            `translate(0, ${height - margin.bottom})`
        )
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left}, 0)`
        )
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .text("Study Hours");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text("Exam Score");

    svg.selectAll(".student-point")
        .data(data)
        .join("circle")
        .attr("class", "student-point")
        .attr("cx", d => xScale(d.study_hours))
        .attr("cy", d => yScale(d.score))
        .attr("r", d => sizeScale(d.year))
        .attr("fill", d => colorScale(d.major))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.name}</strong><br>
                    Study Hours: ${d.study_hours}<br>
                    Score: ${d.score}<br>
                    Major: ${d.major}<br>
                    Year: ${d.year}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            tooltip
                .style("opacity", 0);
        });

    const legend = svg.append("g")
        .attr(
            "transform",
            `translate(${width - margin.right + 25}, 60)`
        );

    const legendItems = legend
        .selectAll(".legend-item")
        .data(majors)
        .join("g")
        .attr("class", "legend-item")
        .attr(
            "transform",
            (d, i) => `translate(0, ${i * 28})`
        );

    legendItems.append("circle")
        .attr("r", 6)
        .attr("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text(d => d);
});

// Assignment: four-dimensional city scatterplot
d3.csv("../data/cities_multivariate.csv", d => ({
    city: d.city,
    population: +d.population,
    temp_c: +d.temp_c,
    development_level: d.development_level,
    region: d.region
}))
.then(data => {
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.population))
        .nice()
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.temp_c))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const regions = ["North", "South", "East", "West"];

    const colorScale = d3.scaleOrdinal()
        .domain(regions)
        .range(d3.schemeTableau10);

    const developmentLevels = ["Low", "Medium", "High"];

    const sizeScale = d3.scaleOrdinal()
        .domain(developmentLevels)
        .range([6, 10, 14]);

    const svg = d3.select("#city-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
        .attr(
            "transform",
            `translate(0, ${height - margin.bottom})`
        )
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left}, 0)`
        )
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .text("Population (millions)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text("Average Temperature (°C)");

    svg.selectAll(".city-point")
        .data(data)
        .join("circle")
        .attr("class", "city-point")
        .attr("cx", d => xScale(d.population))
        .attr("cy", d => yScale(d.temp_c))
        .attr("r", d => sizeScale(d.development_level))
        .attr("fill", d => colorScale(d.region))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.city}</strong><br>
                    Population: ${d.population} million<br>
                    Temperature: ${d.temp_c}°C<br>
                    Development Level: ${d.development_level}<br>
                    Region: ${d.region}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            tooltip
                .style("opacity", 0);
        });

    const regionLegend = svg.append("g")
        .attr(
            "transform",
            `translate(${width - margin.right + 25}, 55)`
        );

    regionLegend.append("text")
        .attr("y", -15)
        .attr("font-weight", "bold")
        .text("Region");

    const regionItems = regionLegend
        .selectAll(".region-item")
        .data(regions)
        .join("g")
        .attr("class", "region-item")
        .attr(
            "transform",
            (d, i) => `translate(0, ${i * 28})`
        );

    regionItems.append("circle")
        .attr("r", 6)
        .attr("fill", d => colorScale(d));

    regionItems.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text(d => d);

    const sizeLegend = svg.append("g")
        .attr(
            "transform",
            `translate(${width - margin.right + 25}, 225)`
        );

    sizeLegend.append("text")
        .attr("y", -20)
        .attr("font-weight", "bold")
        .text("Development");

    const sizeItems = sizeLegend
        .selectAll(".size-item")
        .data(developmentLevels)
        .join("g")
        .attr("class", "size-item")
        .attr(
            "transform",
            (d, i) => `translate(14, ${i * 38})`
        );

    sizeItems.append("circle")
        .attr("r", d => sizeScale(d))
        .attr("fill", "#999");

    sizeItems.append("text")
        .attr("x", 22)
        .attr("y", 4)
        .text(d => d);
});
