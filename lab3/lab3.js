// D3 is loaded first in index.html.
if (typeof d3 === "undefined") {
    document.getElementById("record-count").textContent = "Not loaded";
    document.getElementById("table-status").textContent =
        "D3 could not load. Check your internet connection and reload the page.";
} else {
    d3.csv("../data/lab3_data.csv")
        .then(data => {
            if (data.length === 0) {
                throw new Error("The dataset is empty.");
            }

            const columns = data.columns;
            const labels = {
                id: "ID",
                title: "Title",
                price_gbp: "Price (GBP)",
                rating: "Rating (1–5)",
                availability: "Availability"
            };

            // CSV values start as strings. Convert numeric columns before sorting.
            data.forEach(book => {
                book.id = +book.id;
                book.price_gbp = +book.price_gbp;
                book.rating = +book.rating;
            });

            const count = data.length.toLocaleString("en-US");
            d3.select("#record-count").text(count);
            d3.select("#table-status").text("Showing all " + count + " books.");

            let sortColumn = null;
            let ascending = true;
            const table = d3.select("#data-table");
            const header = table.select("thead").append("tr");

            const headings = header.selectAll("th")
                .data(columns)
                .join("th")
                .attr("scope", "col")
                .attr("aria-sort", "none");

            // Buttons make the headings work with both a mouse and a keyboard.
            headings.append("button")
                .attr("type", "button")
                .text(column => labels[column])
                .on("click", function(event, column) {
                    if (sortColumn === column) {
                        ascending = !ascending;
                    } else {
                        sortColumn = column;
                        ascending = true;
                    }

                    data.sort((a, b) => {
                        if (ascending) {
                            return d3.ascending(a[column], b[column]);
                        }
                        return d3.descending(a[column], b[column]);
                    });

                    headings.attr("aria-sort", name => {
                        if (name !== sortColumn) {
                            return "none";
                        }
                        return ascending ? "ascending" : "descending";
                    });

                    const direction = ascending ? "ascending" : "descending";
                    d3.select("#table-status")
                        .text(labels[column] + ": " + direction + ". Showing all " + count + " books.");

                    updateRows();
                });

            function updateRows() {
                const rows = table.select("tbody")
                    .selectAll("tr")
                    .data(data)
                    .join("tr");

                rows.selectAll("td")
                    .data(book => columns.map(column => {
                        if (column === "price_gbp") {
                            return book[column].toFixed(2);
                        }
                        return book[column];
                    }))
                    .join("td")
                    .text(value => value);
            }

            updateRows();
        })
        .catch(() => {
            d3.select("#record-count").text("Not loaded");
            d3.select("#table-status")
                .text("The dataset could not load. Check that data/lab3_data.csv is available and reload the page.");
        });
}
