# Gameplay Cleanup 3A: public demo dependency audit

## Demo before

The `/demo-game/` page used the shared files under `game/` through its `../game/` base URL. Its startup scripts included `game/js/teacher-loader.js`; then `game/js/demo-app.js` called `MR.loadTeacher('olson')`. The loader reset the runtime, loaded `game/teachers/olson/config.js`, followed that configuration's three mission file paths and resource file path into `game/teachers/olson/content/`, merged the teacher configuration, and exposed the resulting pool and resources to the shared engine. Because the Olson configuration contained a live Google Apps Script URL, the demo app blanked `resultEndpoint` after loading it.

## Demo after

`game/js/demo-app.js` now directly loads the dedicated, explicitly fictional scripts in `demo-game/content/`, validates that daily, mystery, crisis, and Resource Map data are present, and installs that data for the same shared engine. The fixture contains no authenticated assignment or live result endpoint. `demo-game/index.html` no longer loads `teacher-loader.js`. Demo history remains browser-local.

## Intentionally unchanged for Cleanup 3B

Authenticated `/game/` startup, participant authentication and Supabase telemetry, QA Preview, the static fallback, `?teacher=` support, and the legacy Google Apps Script result path are unchanged.

## Remaining Olson dependencies

- `game/js/teacher-loader.js` retains Olson as the legacy default.
- `game/js/app.js` still recognizes Olson for authenticated/static fallback compatibility.
- `game/teachers/olson/index.html` still redirects to `../../index.html?teacher=olson`.
- `game/teachers/olson/config.js` and its content remain in place; the configuration still has the legacy Google Apps Script endpoint.
- `scripts/fictional-resource-files.test.js` still validates Olson's legacy resource fixture.
- Repository history/documentation may describe the legacy folder, but the public demo documentation no longer treats it as a demo dependency.

These items are reported rather than removed because their retirement belongs to Cleanup 3B.
