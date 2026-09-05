// Load the tweet-level CSV, then count each sentiment within each topic.
if (typeof d3 === "undefined") {
    document.getElementById("chart-status").textContent =
        "D3 could not load. Check your internet connection and reload the page.";
} else {
    d3.csv("../data/lab4_clean_tweets.csv", d => ({
        ...d,
        record_id: +d.record_id,
        topic_id: +d.topic_id,
        sentiment_score: +d.sentiment_score
    }))
        .then(data => {
            const sentiments = ["Negative", "Neutral", "Positive"];
            if (data.length < 1000 || data.some(d => !d.topic ||
                !sentiments.includes(d.sentiment) || !Number.isFinite(d.sentiment_score))) {
                throw new Error("The cleaned tweet data is incomplete.");
            }

            const topics = Array.from(new Set(data.map(d => d.topic))).sort();
            const summary = topics.map(topic => {
                const tweets = data.filter(d => d.topic === topic);
                return {
                    topic: topic,
                    total: tweets.length,
                    Negative: tweets.filter(d => d.sentiment === "Negative").length,
                    Neutral: tweets.filter(d => d.sentiment === "Neutral").length,
                    Positive: tweets.filter(d => d.sentiment === "Positive").length
                };
            });

            d3.select("#chart-status").text(
                data.length.toLocaleString("en-US") + " cleaned tweets across " +
                topics.length + " topics. Each row adds up to 100%."
            );

            const width = 940;
            const height = 650;
            const margin = {top: 20, right: 65, bottom: 55, left: 225};
            const x = d3.scaleLinear()
                .domain([0, 1])
                .range([margin.left, width - margin.right]);
            const y = d3.scaleBand()
                .domain(topics)
                .range([margin.top, height - margin.bottom])
                .padding(0.25);
            const color = d3.scaleOrdinal()
                .domain(sentiments)
                .range(["#b85c5c", "#b7c1ca", "#4b8668"]);

            const svg = d3.select("#sentiment-chart").append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("role", "img")
                .attr("aria-labelledby", "chart-title chart-description");
            svg.append("title").attr("id", "chart-title")
                .text("Estimated sentiment by financial tweet topic");
            svg.append("desc").attr("id", "chart-description")
                .text("Horizontal stacked bars show negative, neutral, and positive percentages. " +
                    "The count table below provides the same information as text.");

            svg.append("g")
                .attr("transform", "translate(0," + (height - margin.bottom) + ")")
                .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%")));
            svg.append("g")
                .attr("transform", "translate(" + margin.left + ",0)")
                .call(d3.axisLeft(y).tickSize(0))
                .select(".domain").remove();
            svg.append("text")
                .attr("x", (margin.left + width - margin.right) / 2)
                .attr("y", height - 10)
                .attr("text-anchor", "middle")
                .text("Percentage of tweets within each topic");
            svg.append("text")
                .attr("x", width - margin.right + 10)
                .attr("y", 10)
                .text("n");

            // stackOffsetExpand converts each row of counts to proportions.
            const stacked = d3.stack()
                .keys(sentiments)
                .offset(d3.stackOffsetExpand)(summary);

            stacked.forEach(series => {
                svg.append("g")
                    .attr("fill", color(series.key))
                    .selectAll("rect")
                    .data(series)
                    .join("rect")
                    .attr("x", d => x(d[0]))
                    .attr("y", d => y(d.data.topic))
                    .attr("width", d => x(d[1]) - x(d[0]))
                    .attr("height", y.bandwidth())
                    .append("title")
                    .text(d => d.data.topic + " — " + series.key + ": " +
                        d.data[series.key] + " tweets (" +
                        (100 * d.data[series.key] / d.data.total).toFixed(1) + "%)");
            });

            svg.append("g").selectAll("text")
                .data(summary)
                .join("text")
                .attr("x", width - margin.right + 10)
                .attr("y", d => y(d.topic) + y.bandwidth() / 2)
                .attr("dominant-baseline", "middle")
                .text(d => d.total);

            // The table also makes exact values available without hovering.
            const rows = d3.select("#counts-table tbody").selectAll("tr")
                .data(summary).join("tr");
            rows.append("th").attr("scope", "row").text(d => d.topic);
            rows.selectAll("td")
                .data(d => [d.total, ...sentiments.map(sentiment =>
                    d[sentiment] + " (" + (100 * d[sentiment] / d.total).toFixed(1) + "%)")])
                .join("td")
                .text(d => d);
        })
        .catch(error => {
            d3.select("#sentiment-chart").selectAll("*").remove();
            d3.select("#chart-status").text(
                "The chart could not load. Check that data/lab4_clean_tweets.csv is available. " +
                error.message
            );
        });
}
