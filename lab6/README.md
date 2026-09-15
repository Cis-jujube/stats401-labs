# Lab 6: GDP Treemaps

Assignment: https://github.com/hiilab/stats-401/blob/main/Lab6.md

Published page: https://cis-jujube.github.io/stats401-labs/lab6/

## Files

- `convert_hierarchy.py`: uses pandas grouping and recursion to convert both provided CSV files.
- `../data/lab6_assignment_gdp.json`: assignment hierarchy, with `gdp` and `status` on country leaves.
- `../data/lab6_small_hierarchy.json`: geographic tutorial hierarchy.
- `index.html`, `lab6.css`, `lab6.js`: the two assignment treemaps, legend, tooltips, table, and design description.

## Recreate the JSON

From the repository root, using the existing Lab 4 Python environment with pandas:

```sh
lab4/.venv/bin/python lab6/convert_hierarchy.py
```

The script resolves data paths relative to its own location. It also works with another Python environment containing pandas. No new dependency declarations are needed. The page reuses the repository's D3 7 bundle and has no build step.

## Design and requirements

Both charts use all 27 countries from the provided synthetic dataset (total GDP: 85,215 billion USD). The hierarchy is World → Continent → Area → Country. Area represents GDP; blue, gray, and orange represent Increase, Unchanged, and Decrease. Squarify and Binary use independent hierarchies, the same dimensions, and the same value sorting.

Continent and area headers show nesting. Country labels are shortened when necessary; tooltips and the table show full names and exact data. Tooltips work with pointer hover, tap, and keyboard focus. Charts and the table scroll horizontally on narrow screens. Padding and heading space slightly affect the visible area proportions.

The page includes a 100–200 word design description. The final assignment asks for two GDP treemaps; the tutorial tree and zoom examples are not listed in the final submission checklist. Submit the direct GitHub Pages link above through the course submission channel.
