# v6 performance and QA

The main map uses DOM images with a single CSS camera transform. No building geometry, canvas drawing, live 3D engine or permanent animation loop runs during interaction. The satellite layer is independent of the local fallback and does not block first display on a WebGL check or image-provider startup.

Requests are limited to 8 in flight for the main imagery and 2 for the minimap. The automatic image-selection budget is 64 visible tiles (36 in low-detail mode, 96 in high-detail mode). Level selection steps down when necessary to cover the viewport within that budget. Active requests that become obsolete are cancelled; previous loaded detail is retained until the replacement viewport has settled, within a bounded retention count.

Failed/hung imagery is reported after a bounded request period and can be retried manually. No synthetic region redraw is used to disguise a failure. Thumbnail requests are lazy and use the same provider, with a labeled local fallback on failure.

`npm run check` verifies exact registration at all source zoom levels, neighboring edges, viewport coverage, coordinate conversion, data and loader failure/cancellation/retry cases. Browser QA checks real imagery loads over Selimiye, Meriç bridge and Karaağaç, zoom navigation and the mobile layout. These checks do not certify the imagery provider's real-world ground accuracy.

## Browser update-cost sample

The v6 built-in benchmark was run in Chrome at 1363 × 936: 55 measured synchronous camera/UI updates after 5 warmups, p95 0.1 ms, max 0.1 ms, median below the observed timer precision, 43 retained image elements at the sampling point, 0 geometry draws per update. These are synchronous JavaScript/UI update costs, **not FPS, GPU frame times or network transfer benchmarks**. Mobile (390 × 844) photo/detail views and a CSP-blocked imagery failure/retry fixture were also checked visually.
