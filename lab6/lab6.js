const width = 1000;
const height = 760;
const statuses = ["Increase", "Unchanged", "Decrease"];
const color = d3.scaleOrdinal()
    .domain(statuses)
    .range(["#8ebadd", "#d0d0d0", "#edb580"]);
const formatGDP = d3.format(",.0f");
const tooltip = d3.select("#tooltip");

const legend = d3.select("#legend")
    .selectAll("span.legend-item")
    .data(statuses)
    .join("span")
    .attr("class", "legend-item");
legend.append("span")
    .attr("class", "swatch")
    .style("background-color", d => color(d));
legend.append("span").text(d => d);

function countryDetails(d) {
    return `${d.data.name}\nContinent: ${d.parent.parent.data.name}`
        + `\nArea: ${d.parent.data.name}\nGDP: ${formatGDP(d.value)} billion USD`
        + `\nStatus: ${d.data.status}`;
}

function showTooltip(event, d) {
    tooltip.text(countryDetails(d)).property("hidden", false);
    const bounds = event.currentTarget.getBoundingClientRect();
    let x = event.clientX ?? bounds.left + bounds.width / 2;
    let y = event.clientY ?? bounds.top + bounds.height / 2;
    const box = tooltip.node().getBoundingClientRect();
    x = Math.max(8, Math.min(x + 12, window.innerWidth - box.width - 8));
    y = Math.max(8, Math.min(y + 12, window.innerHeight - box.height - 8));
    tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

function hideTooltip() {
    tooltip.property("hidden", true);
}

function headingSpace(d) {
    if (d.depth === 1) return 23;
    // A tiny area must keep room for its countries instead of a heading.
    if (d.depth === 2 && d.y1 - d.y0 >= 45) return 19;
    return 3;
}

// Shorten labels using their actual SVG text width.
function fitLabel() {
    const text = d3.select(this);
    const available = Number(text.attr("data-width"));
    const fullName = text.text();
    let shortened = fullName;
    while (this.getComputedTextLength() > available && shortened.length > 0) {
        shortened = shortened.slice(0, -1);
        text.text(shortened + "…");
    }
    if (shortened.length === 0) {
        text.text("");
    }
}

function drawTreemap(data, selector, tile) {
    // Each layout gets its own hierarchy because D3 changes node coordinates.
    const root = d3.hierarchy(data)
        .sum(d => d.gdp || 0)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .tile(tile)
        .size([width, height])
        .paddingOuter(3)
        .paddingInner(2)
        .paddingTop(headingSpace)(root);

    const svg = d3.select(selector).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("aria-label", `${selector.slice(1)}: GDP by continent, area, and country`);

    const groups = svg.selectAll("g.group")
        .data(root.descendants().filter(d => d.depth === 1 || d.depth === 2))
        .join("g")
        .attr("class", "group");

    groups.append("rect")
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => d.depth === 1 ? "#e8e8e8" : "#f7f7f7")
        .attr("stroke", d => d.depth === 1 ? "#555" : "#aaa");

    groups.filter(d => headingSpace(d) > 3).append("text")
        .attr("class", d => d.depth === 1 ? "group-label continent-label" : "group-label")
        .attr("x", d => d.x0 + 5)
        .attr("y", d => d.y0 + (d.depth === 1 ? 16 : 13))
        .attr("data-width", d => Math.max(0, d.x1 - d.x0 - 10))
        .text(d => d.data.name)
        .each(fitLabel);
    groups.append("title").text(d => d.ancestors().reverse().map(n => n.data.name).join(" → "));

    const cells = svg.selectAll("g.country")
        .data(root.leaves())
        .join("g")
        .attr("class", "country")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", d => countryDetails(d))
        .on("pointerenter pointermove click focus", showTooltip)
        .on("pointerleave blur", hideTooltip)
        .on("keydown", event => {
            if (event.key === "Escape") hideTooltip();
        });

    cells.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.status))
        .attr("stroke", "#fff");

    cells.filter(d => d.y1 - d.y0 >= 18).append("text")
        .attr("x", 4).attr("y", 14)
        .attr("data-width", d => Math.max(0, d.x1 - d.x0 - 8))
        .text(d => d.data.name)
        .each(fitLabel);
    return root;
}

d3.json("../data/lab6_assignment_gdp.json").then(data => {
    const root = drawTreemap(data, "#squarify", d3.treemapSquarify);
    drawTreemap(data, "#binary", d3.treemapBinary);

    const countries = root.leaves().sort((a, b) => {
        const pathA = a.ancestors().reverse().map(d => d.data.name).join("/");
        const pathB = b.ancestors().reverse().map(d => d.data.name).join("/");
        return d3.ascending(pathA, pathB);
    });
    const rows = d3.select("#country-rows").selectAll("tr")
        .data(countries).join("tr");
    rows.selectAll("td").data(d => [
        d.parent.parent.data.name, d.parent.data.name, d.data.name,
        formatGDP(d.value), d.data.status,
    ]).join("td").text(d => d);

    d3.select("#chart-status").text(
        `${countries.length} countries · ${root.children.length} continents · `
        + `Total GDP: ${formatGDP(root.value)} billion USD`
    );
}).catch(error => {
    d3.selectAll(".diagram svg").remove();
    d3.select("#chart-status").text("Could not load the GDP charts. Please reload the page or use the CSV link above.");
    console.error("GDP treemap error:", error);
});

window.addEventListener("scroll", () => {
    const focused = document.activeElement;
    if (focused && focused.classList.contains("country") && !tooltip.property("hidden")) {
        showTooltip({ currentTarget: focused }, d3.select(focused).datum());
    } else {
        hideTooltip();
    }
}, true);
window.addEventListener("resize", hideTooltip);
