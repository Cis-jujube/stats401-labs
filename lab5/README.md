# Lab 5: Interactive Network Visualization

Page: https://cis-jujube.github.io/stats401-labs/lab5/

Assignment: https://github.com/hiilab/stats-401/blob/main/Lab5.md

This page uses the assignment's synthetic, undirected transit network: 50 stations
and 50 routes. Both CSV files were downloaded from the course repository;
only line endings were normalized to LF, with all data values unchanged.

- `index.html`: page content, design explanations, and six findings.
- `lab5.css`: simple page, legend, and tooltip styles.
- `lab5.js`: external CSV loading, D3 force layout, interactions, and matrix.
- `../data/lab5_assignment_stations.csv`: station data.
- `../data/lab5_assignment_routes.csv`: route data.

The page reuses the repository's existing D3 7.9.0 file in
`../lab4/vendor/d3.v7.min.js`. No package installation or build is needed.
Open the GitHub Pages URL above; opening the HTML directly as a local file may
prevent the browser from loading CSV files.

The assignment dataset description and final checklist specify `district`,
`daily_passengers`, `station_type`, `travel_time_min`, and `route_type`.
Those are the fields used here; Part A's older tutorial field names do not match
the supplied transit CSVs.

Circle area represents daily passengers, and borders distinguish station types.
The graph and matrix share route colors. Matrix rows and columns are ordered by
district, then numeric station ID. Each undirected route fills two symmetric cells.
Select a station to inspect its neighbor count, including isolated stations.
Force-layout positions are not geographic locations or centrality scores.
