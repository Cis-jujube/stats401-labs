# Lab 7 — Animated Temporal Commercial Network

Live page: https://cis-jujube.github.io/stats401-labs/lab7/

Assignment: https://github.com/hiilab/stats-401/blob/main/Lab7.md

This implements the **Assignment Parts A–E** following the weather tutorial. The submission is the direct GitHub Pages link above.

## Requirements mapping

| Requirements | Implementation |
| --- | --- |
| 1–4: supplied data, all 60 days, D3, force simulation | Two assignment CSVs with unchanged data values in `../data/`; D3 v7 from the existing repository vendor file; one persistent `d3.forceSimulation` |
| 5: two node attributes/properties | Sector → color; daily incident transaction amount → node size |
| 6: two link properties | Transaction type → color; transaction amount → width |
| 7–8: changing links, entering/disappearing relationships | Undirected pair-keyed join with fade-in/fade-out transitions |
| 9–12: playback and manual inspection | Play, Pause, Reset, day 1–60 slider, visible day/date; playback stops at day 60; manual scrubbing pauses playback |
| 13: tooltips | Node and link details available by pointer, touch, and keyboard focus |
| 14: mental map | Reused node objects and simulation, fixed circular anchors, low-strength link force, gentle reheating |
| 15: legend | Sector/type swatches, numeric size/width explanations, fixed scales across frames |
| 16: temporal questions | Five data-supported answers in the page, supplemented by daily connectivity overview and selected-day transaction table |

## Data and calculations

CSV line endings are normalized from CRLF to LF; data values are unchanged. The fabricated dataset has 12 companies and 367 daily relationship records from 2026-01-01 through 2026-03-01. Each day/pair is unique. Links are undirected and each frame contains only that day's records. Raw rows are preserved; forceLink receives copies because it mutates endpoints.

- Node incident value sums every adjacent amount once for that company. Summing across companies would double-count total network value.
- Daily total sums each record once. Degree counts distinct daily partners.
- Components include isolated companies. Cross-region share counts active pair-day observations, not amounts or transaction_count.
- Period comparisons use days 1–20, 21–40, and 41–60. Mean daily links: 5.50, 5.60, 7.25. Cross-region shares: 70/110, 71/112, 105/145.
- The stable positions aid tracking; geometric proximity does not establish a cluster. Inspect actual links and component counts.
- Reduced-motion preference disables visual transitions. Playback remains explicitly user-controlled and pauses when the page is hidden.

## Verification

Browser checks compare all 60 frames against CSV-derived link counts, active companies, daily totals, and table rows. Control checks cover Play, Pause, Reset, endpoint stopping, manual scrubbing, and keyboard tooltips. Desktop and 390 px mobile screenshots are reviewed; the diagram/table scroll horizontally on narrow screens.

No package installation or build step is needed. The page uses the existing vendored D3 file and relative asset paths compatible with GitHub Pages.

## LLM Usage Disclosure

I used OpenAI Codex to help implement, test, and document this visualization and analyze the provided data.
