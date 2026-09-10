// Load both CSV files before drawing either view.
if (typeof d3 === "undefined") {
    document.getElementById("chart-status").textContent = "D3 could not load. Please reload the page.";
} else {
    Promise.all([
        d3.csv("../data/lab5_assignment_stations.csv", d => ({
            id: d.id,
            station_name: d.station_name,
            district: d.district,
            daily_passengers: +d.daily_passengers,
            station_type: d.station_type
        })),
        d3.csv("../data/lab5_assignment_routes.csv", d => ({
            source: d.source,
            target: d.target,
            travel_time_min: +d.travel_time_min,
            route_type: d.route_type
        }))
    ]).then(([nodes, links]) => {
        const districts = ["Central", "North", "South", "East", "West"];
        const stationTypes = ["Local", "Transfer", "Terminal"];
        const routeTypes = ["Metro", "Express", "Shuttle"];
        const ids = new Set(nodes.map(d => d.id));

        if (nodes.length !== 50 || links.length !== 50 || ids.size !== 50 ||
            nodes.some(d => !Number.isFinite(d.daily_passengers) || d.daily_passengers <= 0 ||
                !districts.includes(d.district) || !stationTypes.includes(d.station_type)) ||
            links.some(d => !ids.has(d.source) || !ids.has(d.target) ||
                !Number.isFinite(d.travel_time_min) || d.travel_time_min <= 0 ||
                !routeTypes.includes(d.route_type))) {
            throw new Error("Invalid assignment data.");
        }

        const width = 960;
        const height = 650;
        const colorScale = d3.scaleOrdinal()
            .domain(districts)
            .range(["#4e79a7", "#b07924", "#4e8560", "#9863a2", "#b85858"]);
        const sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.daily_passengers)])
            .range([0, 19]);
        const routeColorScale = d3.scaleOrdinal()
            .domain(routeTypes)
            .range(["#526b88", "#aa6235", "#5c7e59"]);
        const timeScale = d3.scaleLinear()
            .domain(d3.extent(links, d => d.travel_time_min))
            .range([1, 6]);
        const opacityScale = d3.scaleLinear()
            .domain(timeScale.domain())
            .range([0.3, 1]);

        function borderWidth(type) {
            return type === "Transfer" ? 3.5 : type === "Terminal" ? 2 : 1.2;
        }

        function borderDash(type) {
            return type === "Terminal" ? "3,2" : null;
        }

        // D3 replaces source and target IDs with node objects here.
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(70))
            .force("charge", d3.forceManyBody().strength(-140))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => sizeScale(d.daily_passengers) + 12))
            .force("x", d3.forceX(width / 2).strength(0.025))
            .force("y", d3.forceY(height / 2).strength(0.045));

        function connected(a, b) {
            return links.some(d => (d.source.id === a.id && d.target.id === b.id) ||
                (d.source.id === b.id && d.target.id === a.id));
        }

        function stationInfo(d) {
            const neighbors = links.filter(l => l.source.id === d.id || l.target.id === d.id)
                .map(l => l.source.id === d.id ? l.target.id : l.source.id);
            return d.station_name + " (" + d.id + ")\nDistrict: " + d.district +
                "\nDaily passengers: " + d.daily_passengers.toLocaleString("en-US") +
                "\nStation type: " + d.station_type + "\nDirect neighbors: " + neighbors.length +
                (neighbors.length ? " (" + neighbors.join(", ") + ")" : " (isolated)");
        }

        function routeInfo(d) {
            return d.source.station_name + " — " + d.target.station_name +
                "\nTravel time: " + d.travel_time_min + " min\nRoute type: " + d.route_type;
        }

        const tooltip = d3.select("#tooltip");

        function moveTooltip(event) {
            const box = tooltip.node().getBoundingClientRect();
            tooltip.style("left", Math.max(8, Math.min(event.clientX + 12, innerWidth - box.width - 8)) + "px")
                .style("top", Math.max(8, Math.min(event.clientY + 12, innerHeight - box.height - 8)) + "px");
        }

        function showTooltip(event, text) {
            tooltip.property("hidden", false).text(text).style("opacity", 1);
            moveTooltip(event);
        }

        function hideTooltip() {
            tooltip.property("hidden", true).style("opacity", 0);
        }

        const svg = d3.select("#chart").append("svg")
            .attr("width", width).attr("height", height)
            .attr("role", "img")
            .attr("aria-label", "Undirected network of 50 transit stations. Use the station selector for station details and neighbors.");

        const link = svg.append("g").attr("class", "links")
            .selectAll("line").data(links).join("line")
            .attr("stroke", d => routeColorScale(d.route_type))
            .attr("stroke-width", d => timeScale(d.travel_time_min))
            .attr("opacity", 0.7);
        link.append("title").text(routeInfo);

        const node = svg.append("g").attr("class", "nodes")
            .selectAll("circle").data(nodes).join("circle")
            .attr("r", d => sizeScale(d.daily_passengers))
            .attr("fill", d => colorScale(d.district))
            .attr("stroke", "#222")
            .attr("stroke-width", d => borderWidth(d.station_type))
            .attr("stroke-dasharray", d => borderDash(d.station_type))
            .style("cursor", "grab");
        node.append("title").text(stationInfo);

        const label = svg.append("g").attr("class", "network-labels")
            .selectAll("text").data(nodes).join("text")
            .text(d => d.id).attr("font-size", 11)
            .attr("dx", d => sizeScale(d.daily_passengers) + 4).attr("dy", 4);

        simulation.on("tick", () => {
            nodes.forEach(d => {
                // Leave room for circles and labels at the SVG edges.
                d.x = Math.max(30, Math.min(width - 60, d.x));
                d.y = Math.max(30, Math.min(height - 30, d.y));
            });
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            label.attr("x", d => d.x).attr("y", d => d.y);
        });

        node.call(d3.drag()
            .on("start", (event, d) => {
                hideTooltip();
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = Math.max(30, Math.min(width - 60, event.x));
                d.fy = Math.max(30, Math.min(height - 30, event.y));
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));

        let selectedStation = null;

        function highlightStation(station) {
            node.attr("opacity", d => !station || d.id === station.id || connected(station, d) ? 1 : 0.15);
            label.attr("opacity", d => !station || d.id === station.id || connected(station, d) ? 1 : 0.15);
            link.attr("opacity", d => !station ? 0.7 :
                d.source.id === station.id || d.target.id === station.id ? 1 : 0.1);
        }

        node.on("mouseover", (event, d) => {
            highlightStation(d);
            showTooltip(event, stationInfo(d));
        }).on("mousemove", moveTooltip).on("mouseout", () => {
            highlightStation(selectedStation);
            hideTooltip();
        }).on("click", (event, d) => {
            d3.select("#station-select").property("value", d.id);
            selectStation(d.id);
        });

        link.on("mouseover", (event, route) => {
            link.attr("opacity", d => d === route ? 1 : 0.1);
            node.attr("opacity", d => d.id === route.source.id || d.id === route.target.id ? 1 : 0.15);
            label.attr("opacity", d => d.id === route.source.id || d.id === route.target.id ? 1 : 0.15);
            showTooltip(event, routeInfo(route));
        }).on("mousemove", moveTooltip).on("mouseout", () => {
            highlightStation(selectedStation);
            hideTooltip();
        });

        d3.select("#station-select").selectAll("option.station-option")
            .data(nodes).join("option").attr("class", "station-option")
            .attr("value", d => d.id).text(d => d.station_name + " (" + d.id + ")");

        function selectStation(id) {
            selectedStation = nodes.find(d => d.id === id) || null;
            highlightStation(selectedStation);
            d3.select("#selection-details").text(selectedStation ? stationInfo(selectedStation) :
                "All stations shown. Select a station to see its details and direct neighbors.");
            cells.attr("stroke", d => selectedStation && (d.row.id === id || d.col.id === id) ? "#555" : "none")
                .attr("stroke-width", 0.8);
        }

        d3.select("#station-select").on("change", event => selectStation(event.target.value));
        d3.select("#reset-selection").on("click", () => {
            d3.select("#station-select").property("value", "");
            selectStation("");
            hideTooltip();
        });

        // Same nodes and links; sorting a copy preserves the force simulation's order.
        const orderedNodes = [...nodes].sort((a, b) =>
            districts.indexOf(a.district) - districts.indexOf(b.district) ||
            +a.id.slice(1) - +b.id.slice(1));
        const matrixData = [];
        orderedNodes.forEach(row => {
            orderedNodes.forEach(col => {
                const route = links.find(d => (d.source.id === row.id && d.target.id === col.id) ||
                    (d.source.id === col.id && d.target.id === row.id));
                matrixData.push({row, col, route});
            });
        });

        const matrixSize = 750;
        const matrixScale = d3.scaleBand().domain(orderedNodes.map(d => d.id))
            .range([0, matrixSize]).padding(0.05);
        const matrixSvg = d3.select("#matrix").append("svg")
            .attr("width", 900).attr("height", 875)
            .attr("role", "img").attr("aria-label", "Symmetric station adjacency matrix, grouped by district. Colored cells show direct routes.");
        const matrixGroup = matrixSvg.append("g").attr("transform", "translate(115,95)");

        function matrixInfo(d) {
            if (d.row.id === d.col.id) return d.row.station_name + ": same station (no self-route).";
            return d.route ? routeInfo(d.route) :
                d.row.station_name + " — " + d.col.station_name + "\nNo direct connection.";
        }

        const cells = matrixGroup.selectAll("rect.cell").data(matrixData).join("rect")
            .attr("class", "cell")
            .attr("x", d => matrixScale(d.col.id)).attr("y", d => matrixScale(d.row.id))
            .attr("width", matrixScale.bandwidth()).attr("height", matrixScale.bandwidth())
            .attr("fill", d => d.route ? routeColorScale(d.route.route_type) : "#f0f0f0")
            .attr("fill-opacity", d => d.route ? opacityScale(d.route.travel_time_min) : 1)
            .on("mouseover", (event, d) => showTooltip(event, matrixInfo(d)))
            .on("mousemove", moveTooltip).on("mouseout", hideTooltip);
        cells.append("title").text(matrixInfo);

        matrixGroup.append("g").attr("class", "row-labels")
            .selectAll("text").data(orderedNodes).join("text")
            .attr("x", -8).attr("y", d => matrixScale(d.id) + matrixScale.bandwidth() / 2)
            .attr("text-anchor", "end").attr("dominant-baseline", "middle")
            .attr("font-size", 11).attr("fill", d => colorScale(d.district))
            .text(d => d.station_name)
            .on("mouseover", (event, d) => showTooltip(event, stationInfo(d)))
            .on("mousemove", moveTooltip).on("mouseout", hideTooltip);

        matrixGroup.append("g").attr("class", "column-labels")
            .selectAll("text").data(orderedNodes).join("text")
            .attr("transform", d => "translate(" + (matrixScale(d.id) + matrixScale.bandwidth() / 2) + ",-8) rotate(-60)")
            .attr("font-size", 11).attr("fill", d => colorScale(d.district))
            .text(d => d.id)
            .on("mouseover", (event, d) => showTooltip(event, stationInfo(d)))
            .on("mousemove", moveTooltip).on("mouseout", hideTooltip);

        districts.forEach((district, i) => {
            const start = i * matrixSize / districts.length;
            matrixGroup.append("text").attr("x", start + 75).attr("y", -55)
                .attr("text-anchor", "middle").attr("font-size", 12)
                .attr("fill", colorScale(district)).text(district);
            if (i > 0) {
                matrixGroup.append("line").attr("x1", start).attr("x2", start)
                    .attr("y1", 0).attr("y2", matrixSize).attr("stroke", "#aaa")
                    .attr("pointer-events", "none");
                matrixGroup.append("line").attr("y1", start).attr("y2", start)
                    .attr("x1", 0).attr("x2", matrixSize).attr("stroke", "#aaa")
                    .attr("pointer-events", "none");
            }
        });

        // Small legends use the same scales as the charts.
        function legendItem(container, text) {
            const item = d3.select(container).append("span").attr("class", "legend-item");
            const sample = item.append("svg").attr("width", 52).attr("height", 44).attr("aria-hidden", "true");
            item.append("span").text(text);
            return sample;
        }

        districts.forEach(d => {
            legendItem("#district-legend", d).append("circle")
                .attr("cx", 26).attr("cy", 22).attr("r", 8).attr("fill", colorScale(d));
        });
        [1500, 5000, 9800].forEach(value => {
            legendItem("#size-legend", value.toLocaleString("en-US") + " passengers").append("circle")
                .attr("cx", 26).attr("cy", 22).attr("r", sizeScale(value))
                .attr("fill", "#ddd").attr("stroke", "#222");
        });
        stationTypes.forEach(type => {
            legendItem("#station-type-legend", type).append("circle")
                .attr("cx", 26).attr("cy", 22).attr("r", 12).attr("fill", "#ddd")
                .attr("stroke", "#222").attr("stroke-width", borderWidth(type))
                .attr("stroke-dasharray", borderDash(type));
        });
        routeTypes.forEach(type => {
            legendItem("#route-legend", type).append("line")
                .attr("x1", 4).attr("x2", 48).attr("y1", 22).attr("y2", 22)
                .attr("stroke", routeColorScale(type)).attr("stroke-width", 3);
        });
        [2, 9, 16].forEach(time => {
            legendItem("#time-legend", time + " min").append("line")
                .attr("x1", 4).attr("x2", 48).attr("y1", 22).attr("y2", 22)
                .attr("stroke", "#555").attr("stroke-width", timeScale(time));
            legendItem("#matrix-legend", time + " min (Express example)").append("rect")
                .attr("x", 16).attr("y", 12).attr("width", 20).attr("height", 20)
                .attr("fill", routeColorScale("Express")).attr("fill-opacity", opacityScale(time));
        });

        d3.select("#chart-status").text("Loaded 50 stations and 50 undirected routes.");
        selectStation("");
    }).catch(error => {
        d3.select("#chart").selectAll("*").remove();
        d3.select("#matrix").selectAll("*").remove();
        d3.select("#chart-status").text("The network could not load. Check the two assignment CSV files and reload the page.");
        console.error("Lab 5:", error);
    });
}
