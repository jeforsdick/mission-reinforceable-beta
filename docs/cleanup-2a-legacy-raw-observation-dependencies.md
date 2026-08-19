# Cleanup 2A: legacy raw-observation dependency map

Cleanup 2A deliberately preserves the legacy observation architecture. The current
schema still has the following dependencies, which must be resolved or redesigned
before Cleanup 2B can remove any raw-observation object.

## Current database dependencies

- `research_admin_create_classroom_observation` inserts the shared observation
  session row in `research_classroom_observations`. The current
  `research_admin_record_classroom_observation_summary` RPC calls it, so this table
  is part of the active summary-only workflow as well as the legacy workflow.
- `research_admin_submit_classroom_observation_record` reads the observation
  session and appends corrections to `research_classroom_observation_records`,
  including raw fidelity-item JSON and 120-interval JSON.
- `research_admin_compute_classroom_ioa` reads the latest primary and secondary
  raw records and appends calculated results to `research_classroom_ioa_results`.
- `research_admin_observation_dashboard` reads
  `research_classroom_observations`, coalesces current summary values with current
  raw-record values, and falls back to legacy calculated IOA results.
- `research_admin_create_legacy_observation_summary` requires an observation and
  a finalized primary raw record, detects secondary raw records, and starts the
  append-only summary correction stream without modifying raw data.
- `research_admin_revise_classroom_observation_summary` reads the shared
  observation session and intentionally directs observations without a summary
  revision back to the raw-record correction workflow.
- `research_observer_status` combines summary IOA alerts with legacy raw
  `research_classroom_ioa_results` when determining qualification or required
  recalibration.

The raw tables also retain foreign-key relationships from
`research_classroom_observation_records` and `research_classroom_ioa_results` to
`research_classroom_observations`, and from IOA results to both raw records.

## Current client paths

- `research-admin/admin.js` records new paper-summary observations through
  `research_admin_record_classroom_observation_summary`, which indirectly creates
  a shared `research_classroom_observations` row.
- `research-admin/admin.js` invokes
  `research_admin_create_legacy_observation_summary` for the first correction of a
  legacy raw observation and `research_admin_revise_classroom_observation_summary`
  for subsequent summary corrections.
- Research Admin observation rendering consumes
  `research_admin_observation_dashboard`; its legacy fallback fields therefore
  remain part of the current database payload.

Cleanup 2A removes only the unused unified raw-entry wrapper
`research_admin_record_classroom_observation`. It does not remove the underlying
raw creation, submission, IOA, correction, status, table, JSON, or dashboard
fallback paths listed above.
