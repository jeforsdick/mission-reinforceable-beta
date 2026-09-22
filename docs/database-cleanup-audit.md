# Supabase database cleanup audit

**Audit date:** 2026-09-22  
**Scope:** repository-defined `public` schema, application/API access, RPCs,
triggers, RLS, scheduled jobs, tests, documentation, and checked-in SQL.  
**Change policy:** analysis only. This audit does not alter the database.

## Executive summary

The ordered migration chain reconstructs **40 current application tables**. Of
those, this audit classifies **39 KEEP**, **1 REVIEW**, and **0 SAFE-TO-REMOVE
CANDIDATE**. The one REVIEW table,
`research_admin_test_account_actions`, overlaps the newer/general
`research_onboarding_actions` audit stream, but it is still written by the test
password endpoint. It therefore is **not safe to remove today**.

Four other tables occur in history but are already dropped by later migrations:
`mission_bank_comparability_reviews`, `weekly_teacher_checkins`,
`research_classroom_observation_records`, and
`research_classroom_ioa_results`. They are not current tables and must not be
counted as cleanup candidates. The migration chain replaces their old duties
with, respectively, prepared-content signoffs/current authoring validation,
external Qualtrics administration metadata, and summary-revision observation
storage.

Important conclusions:

* Similar names generally describe deliberately separate layers: authoring
  drafts, immutable published versions, and the current gameplay projection;
  participant capability tokens and append-only events; reminder preferences
  and delivery events; or research configuration and audit events.
* Browser `.from(...)` calls understate usage. Much of the research application
  calls security-definer RPCs whose SQL reads/writes the research tables.
* The two production cron routes depend on `teacher_reminder_settings`,
  `teacher_reminder_events`, `participants`, `cases`, `profiles`, and
  `game_sessions`, via reminder RPCs. No database-resident `pg_cron` job is
  defined in the repository.
* There is no checked-in generated Supabase `Database` type file. SQL
  migrations, RPC return contracts, application queries, and tests are the
  repository's schema contract.

## Method and limitations

This is a static, repository-wide audit. The inventory was built by replaying
the intent of every file in `supabase/migrations/` in timestamp order, then
checking all JavaScript, SQL, tests, docs, `vercel.json`, and legacy SQL under
`research/supabase/` and `scripts/`. A table created and subsequently dropped is
reported separately from the current inventory.

This audit does **not** query a deployed Supabase project. Consequently it
cannot detect console-created objects, migrations applied out of order, local
schema drift, table row counts, or external consumers (for example, ad-hoc BI
queries). Before any removal, compare this report with `pg_catalog`, Supabase
logs, backups, and deployed migration history.

Classification standard:

* **KEEP:** an active application/API/RPC/test workflow uses the table, or it is
  a necessary relational/audit component of that workflow.
* **REVIEW:** overlap or legacy naming exists and consolidation may be useful,
  but current evidence prevents removal.
* **SAFE-TO-REMOVE CANDIDATE:** no current repository dependency was found.
  Static absence alone would still require production verification.

## Current-table summary

“DB objects” summarizes important functions, triggers, and RLS rather than
listing every grant. Unless noted, current tables have RLS enabled; application
writes are either narrowly policy-controlled or routed through privileged RPCs.

| Table | Class | Current purpose and reference loci | Key dependencies / DB objects |
|---|---|---|---|
| `cases` | **KEEP** | Canonical case/study container. Used by game login, coach access, intake provisioning, research dashboards, case archival, email launch, and nearly every case-scoped RPC. | Parent of most domain tables; archival/readiness/phase triggers and RLS helpers depend on it. Removing it destroys Mission and research scope. |
| `participants` | **KEEP** | Teacher/participant identity, auth assignment, active/test state, intervention dates. Read by game auth, reminder/status/check-in services, research admin, and readiness RPCs. | FK to `cases`; parent of sessions, responses, reminder, status, weekly, launch, telemetry, and fidelity data. Participant-data critical. |
| `intake_requests` | **KEEP** | Public intake submission and admin approval/provisioning queue. Used by `intake/intake.js`, intake notification, admin APIs/RPCs, and cleanup tooling. | Links to converted `cases`; intake request-id trigger/constraints and admin RLS/RPCs. Removing breaks intake/admin onboarding. |
| `case_game_content` | **KEEP** | One current published gameplay JSON projection per case. Read directly at participant login and updated atomically by publishing RPCs. | FK to `cases`; protected-content RLS. **Not replaced** by versions: it is the runtime head while versions preserve provenance/history. Mission-delivery critical. |
| `profiles` | **KEEP** | Auth-linked role, email, display name, and active status for teacher/coach/research-admin authorization. | FK to `auth.users`; referenced throughout research/audit tables and authorization functions. Removing breaks all authenticated roles. |
| `case_coaches` | **KEEP** | Active coach-to-case assignments for coach dashboard scoping. | FKs to `cases` and `profiles`; coach/research-admin RLS and case-access helpers. |
| `case_intake` | **KEEP** | Approved, normalized case-plan/intake snapshot used by coach and research dashboards. | One-to-one FK to `cases`; provision/edit-intake RPCs and admin/coach RLS. Distinct from the pending `intake_requests` queue. |
| `fidelity_targets` | **KEEP** | Case-specific behavioral/fidelity targets shown in gameplay and attached to responses. | FK to `cases`; referenced by `game_responses`; participant/coach policies and target-key constraints. Mission and outcome-data critical. |
| `game_sessions` | **KEEP** | Mission attempt/session outcomes, timing, score, mission identity, content version, QA flag, and daily completion lock. | FKs to participant/case; parent of responses; completion/adherence/reminder/weekly-summary RPCs and RLS. Core participant research data. |
| `game_responses` | **KEEP** | Per-decision response/alignment and hint telemetry for sessions. | Composite FK to `game_sessions`, FK to `fidelity_targets`; coach dashboard and procedural-fidelity evidence RPCs. Core outcome data. |
| `teacher_reminder_settings` | **KEEP** | Per-participant opt-in state for production daily prompts. | FK to `participants`; admin setter and eligibility RPCs; reminder cron depends on it. Not duplicated by event log. |
| `teacher_reminder_events` | **KEEP** | Idempotent delivery claim/status/provider audit for daily and follow-up reminders. | FKs to participant/case; claim/recovery functions, service-role update policy, and both Vercel cron routes. Reminder infrastructure critical. |
| `research_onboarding_actions` | **KEEP** | General append-only admin audit for account creation/linking, setup, and QA password actions. | FK actor to `profiles`, optional case link; written by research-admin server helpers and protected by admin-only RLS. |
| `case_protected_content_signoffs` | **KEEP** | Append-only prepared-content reviewer signoffs and content hashes used by readiness gates. | FKs to `cases`/`profiles`; signoff recording/readiness/publish functions and admin RLS. Protects Mission launch validity. |
| `mr_procedural_fidelity_reviews` | **KEEP** | Daily/weekly investigator review of required procedural components. | FKs to participant/case/reviewer; evidence/dashboard/submission RPCs and admin RLS. Research-outcome governance data. |
| `research_case_protocol` | **KEEP** | Current per-case protocol configuration (design, planned phase dates, notes). | FK to case and creator/updater profiles; operations dashboard/mutation RPCs and RLS. |
| `research_case_protocol_events` | **KEEP** | Append-only history of protocol changes. | FKs to cases/profiles; operations RPCs and admin RLS. Deliberately complements the current protocol row. |
| `research_protocol_checklist_events` | **KEEP** | Append-only completion/reversal history for protocol checklist items. | FKs to cases/profiles; operations dashboard and checklist RPCs. |
| `research_case_phase_events` | **KEEP** | Append-only effective-dated phase history, including intervention gating and corrections. | FKs to cases/profiles; launch readiness, reminders/check-ins, summaries, adherence, and operations RPCs. Scheduled/communication critical. |
| `research_tasks` | **KEEP** | Case or study-level operational tasks and completion state. | Optional case and profile FKs; operations dashboard/task RPCs, plus Qualtrics task ensure functions. |
| `research_measure_events` | **KEEP** | Append-only administration/status history for external research measures. | FKs to cases/profiles; operations dashboard/measure RPCs and admin RLS. Qualtrics answers themselves are not stored here. |
| `research_coaching_contacts` | **KEEP** | Research log of coaching contacts, channel, purpose, and notes. | FKs to cases/profiles; operations dashboard/contact RPCs and admin RLS. |
| `research_study_events` | **KEEP** | Study incidents/deviations (absence, technical issue, plan change, etc.) and resolution audit. | FKs to cases/profiles; operations dashboard/event RPCs and admin RLS. This is broader than study-day excuse events. |
| `research_observation_setup` | **KEEP** | Current per-case observation measurement configuration. | FK to cases; observation dashboard/setup RPCs and admin RLS. |
| `research_observation_setup_events` | **KEEP** | Append-only observation-setup change history. | FK to cases; observation dashboard/setup RPCs. Complements, rather than duplicates, current setup. |
| `research_observers` | **KEEP** | Coded observer registry and active/training state. | Parent of training events and referenced by classroom observations; observation admin RPCs/RLS. |
| `research_observer_training_events` | **KEEP** | Append-only observer training/reliability history. | FK to observers; observation dashboard/training RPCs. |
| `research_classroom_observations` | **KEEP** | Observation occurrence, observer assignments, context, workflow state, and current summary fields after cleanup 2B. | FKs to cases/observers; parent of summary revisions; record/dashboard RPCs and admin RLS. Research-data critical. |
| `research_classroom_observation_summary_revisions` | **KEEP** | Immutable revision history for scored observation summaries/IOA aggregates. | FK to observations; recording/dashboard functions and admin RLS. Replaces raw record/result persistence, not the observation header. |
| `game_resource_events` | **KEEP** | Participant opens/views of protected game resources, including version and QA context. | Composite participant/case FK; direct game insert, coach dashboard, fidelity evidence, weekly summaries, RLS. Research telemetry. |
| `case_game_resource_draft_revisions` | **KEEP** | Immutable admin revisions of the resource map during authoring. | FKs to cases/profiles; authoring workspace/save/preview/manifest/publish RPCs and admin RLS. |
| `case_game_mission_draft_revisions` | **KEEP** | Immutable per-slot mission draft revisions and validation state. | FKs to cases/profiles; authoring workspace/save/preview/manifest/publish RPCs and admin RLS. |
| `case_game_setup_draft_revisions` | **KEEP** | Immutable case setup draft revisions. | FKs to cases/profiles; authoring workspace/save/preview/manifest/publish RPCs and admin RLS. |
| `research_admin_test_account_actions` | **REVIEW** | Narrow append-only audit of QA test-password/account actions. The endpoint still writes it as a second audit record. | FKs to profiles/cases/participants; admin-only RLS. It overlaps `research_onboarding_actions`; detailed review follows. |
| `case_game_content_versions` | **KEEP** | Immutable publication history with source revision IDs, manifest, hashes, and actor. | FK to cases, resource/setup draft revisions, and profiles; publish/status/game-preview RPCs and RLS. Versions do not replace runtime `case_game_content`. |
| `research_intervention_launch_events` | **KEEP** | Append-only attempt/success/failure audit for game-login delivery and intervention launch. | FKs to cases/participants/profiles; launch-readiness/assertion and email server route. Mission delivery and research audit critical. |
| `participant_study_day_status_tokens` | **KEEP** | Hashed, expiring one-purpose capability tokens for teacher-unavailable reporting. | Composite FK to participants; status issue/record functions and locked-down RLS/grants. Token rows are distinct from durable events. |
| `participant_study_day_status_events` | **KEEP** | Append-only reported/corrected study-day status history. | Participant composite FK, token FK, self-FK for supersession, optional actor FK; status/adherence/operations RPCs. Affects expected Mission days. |
| `participant_weekly_checkins` | **KEEP** | External Qualtrics administration metadata (week, issued/completed timestamps), intentionally not survey answers. | Composite participant FK; generate/complete/list and weekly recap RPCs, admin workflows, RLS. Replaces dropped internal weekly report. |
| `participant_weekly_checkin_tokens` | **KEEP** | Hashed one-use capabilities for completing external weekly check-in administration records. | Composite participant FK; generation/completion RPCs and restricted RLS/grants. Removing breaks completion links. |

## REVIEW detail

### `research_admin_test_account_actions`

1. **Original/current intent.** Created as a dedicated append-only audit for
   research-admin changes to QA/test participant accounts, especially test
   password changes. It stores actor, case, participant, action, and timestamp.
2. **All current references.** Its defining migration is
   `20260822050000_research_admin_test_account_actions.sql`. The
   `api/research-admin-set-test-password.js` endpoint inserts an audit row after
   the Auth password update. The paired API test explicitly expects the table,
   its RLS, grants, and the “legacy audit” write. The pre-study fake-case cleanup
   SQL also accounts for test-case dependent records. No browser reads it.
3. **Possible replacement.** `research_onboarding_actions` now accepts
   `qa_test_password_set` and the same endpoint writes that general audit first.
   Thus the narrow table is overlapping, not currently superseded: both writes
   are asserted as part of the endpoint contract.
4. **Foreign keys.** `actor_user_id -> profiles(id)`, `case_id -> cases(id)`, and
   `participant_id -> participants(id)` (default restrictive deletion behavior).
   These FKs can also block case/test-fixture deletion until dependent audit rows
   are handled.
5. **Triggers/functions/RLS.** No trigger or RPC was found that consumes it.
   RLS is enabled with research-admin visibility; broad anon/authenticated table
   privileges are revoked, and the service-role API performs the insert.
6. **Removal impact.** Dropping it now makes test-password setup partially fail
   (the Auth password may already have changed before audit persistence fails),
   breaks its tests, loses a QA security audit, and may alter fake-case cleanup.
   It should not affect participant gameplay, production reminder cron, or
   research outcome calculations directly. **Verdict: REVIEW, not safe to
   remove.** Consolidate only after choosing one authoritative audit stream,
   backfilling unique history, changing the endpoint transaction/error model,
   updating cleanup SQL/tests, and confirming regulatory/audit retention needs.

## Similar names, duplicates, and supersession

### Game content: three layers, not duplicate tables

* `case_game_*_draft_revisions` are immutable working revisions used by the
  research-admin authoring UI.
* `case_game_content_versions` is immutable publication provenance, tied to the
  validated source revisions.
* `case_game_content` is the single current, performant participant-facing
  projection read at login. Publishing updates it while recording a version.

All are active. Removing any layer would respectively break editing/preview,
publication audit/rollback evidence, or participant Mission delivery.

### Intake and participant records

`intake_requests` is a pending-submission/workflow record; `case_intake` is the
normalized approved case snapshot; `cases` provides study scope; `participants`
provides the authenticated teacher assignment. Provisioning links rather than
duplicates these stages. They should not be merged without redesigning intake,
approval, authentication, and historical retention.

### Current-state plus event-history pairs

The following pairs are intentional current-state/event-sourcing patterns:

* `teacher_reminder_settings` / `teacher_reminder_events` (preference versus
  delivery claim/audit);
* `research_case_protocol` / `research_case_protocol_events`;
* `research_observation_setup` / `research_observation_setup_events`;
* capability-token tables / participant status or weekly administration tables.

### Study event versus study-day status

`research_study_events` captures broad investigator-recorded incidents and
interpretive effects. `participant_study_day_status_events` is a narrowly
defined, teacher-capability-driven and correctable record used in Mission
adherence. They can describe related real-world events but are not substitutes.

### Overlapping admin action logs

`research_onboarding_actions` and `research_admin_test_account_actions` both
receive a QA password action. This is the only active-table overlap material
enough for REVIEW. The general log also covers production onboarding actions;
the narrow log provides test-account-specific actor/case/participant evidence.

## Tables present only in migration history

These are already absent after a clean replay. Historical migrations/functions
that mention them are not evidence that the current schema still contains them.

| Former table | Created for | Dropped / replacement | Residual-risk note |
|---|---|---|---|
| `mission_bank_comparability_reviews` | Admin review of daily mission-bank equivalence/comparability. | Dropped by cleanup 2A after associated functions/policies were removed. Current prepared-content signoffs, draft validation, and publishing gates cover current content governance, but are not a row-for-row data migration. | Confirm deployed migration and any retained study records before assuming historical reviews are gone. Do not issue a second blind drop. |
| `weekly_teacher_checkins` | An earlier internal weekly teacher report with ratings/comments. | Dropped by `20260823000000_retire_mr_weekly_teacher_report.sql`; obsolete RPCs are removed/reworked. `participant_weekly_checkins` now tracks external Qualtrics administration only and deliberately stores no answers. | The newer table is a privacy-conscious workflow replacement, not a data-equivalent rename. External Qualtrics remains the answer system of record. |
| `research_classroom_observation_records` | Raw observer-by-observation scored forms. | Cleanup 2B migrates/normalizes current summary fields and then drops raw records after dependent functions/policies. `research_classroom_observation_summary_revisions` retains append-only summarized revisions. | Summary revisions do not preserve every raw-field use case. Confirm deployed cleanup/retention requirements before interpreting historical exports. |
| `research_classroom_ioa_results` | Persisted IOA calculations linking primary/secondary raw records. | Dropped in cleanup 2B with the raw record model; observation summaries/revisions carry the current aggregate workflow. | Do not recreate or separately drop based only on old tests/docs; verify production migration state. |

The legacy SQL in `research/supabase/001_protected_game_content.sql` also creates
`case_game_content`, but the canonical migration bootstrap now creates that same
active table. Files `003_seed_demo2_full_protected.sql` and
`004_update_case_999_resources_v5.sql` are content seeds/updates, not additional
schema tables.

## Functions, triggers, RLS, and scheduled-job findings

* **Authorization/RLS:** role helpers (`is_research_admin`, case/coach access)
  make `profiles`, `case_coaches`, `cases`, and `participants` transitive
  dependencies even where UI code only calls an RPC. Research and protected
  content tables are not unused merely because direct browser CRUD is absent.
* **Gameplay:** completion functions lock/update `game_sessions`, enforce one
  production mission per participant/study date, and derive reminder/adherence
  state. `game_responses`, `fidelity_targets`, and `game_resource_events` feed
  coach metrics and procedural-fidelity evidence.
* **Publishing:** admin save/preview/manifest/publish RPCs join all three draft
  tables, signoffs, versions, current content, profiles, and cases. Publishing
  is deliberately phase/readiness gated.
* **Observations/operations:** dashboards are JSON-producing RPC façades over
  the many `research_*` tables. Mutation RPCs preserve append-only event
  histories. Their absence from direct `.from(...)` searches is expected.
* **Reminders:** `vercel.json` schedules `/api/teacher-daily-prompt` at 14:00 UTC
  and its retry at 16:00 UTC on weekdays. Both call eligibility, completion, and
  claim RPCs and patch `teacher_reminder_events`. The smoke-test route is not
  scheduled. The weekly recap/check-in code explicitly adds no production cron.
* **Triggers:** schema triggers maintain updated timestamps/intake request IDs
  and enforce or audit lifecycle rules. Removal planning must enumerate deployed
  `pg_trigger` and `pg_depend` results because trigger definitions evolved across
  replacement migrations.
* **RLS:** table removal must be preceded by dropping dependent policies and
  functions in dependency order. Old migrations often drop/recreate functions;
  searching historical text without ordered replay produces false positives.

## Recommended cleanup sequence (no action taken)

1. **Prove deployed parity.** Export schema-only metadata from the target project
   and compare current tables, columns, constraints, functions, triggers,
   policies, grants, and applied migration versions with a clean local replay.
2. **Measure external use.** Review PostgREST/database logs, Supabase logs,
   dashboards, exports, notebooks, and researcher procedures for at least one
   complete study/reporting cycle. Record row counts and newest/oldest timestamps.
3. **Resolve the sole REVIEW item.** Decide whether the general or narrow QA
   audit is authoritative. Document retention requirements and failure semantics;
   do not drop either audit before code stops writing it.
4. **Change consumers first in a separate change set.** If consolidation is
   approved, update `research-admin-set-test-password`, tests, and fake-case
   cleanup; deploy that change; then observe production for unexpected access.
5. **Back up and validate.** Take a restorable backup/export of any proposed
   table, verify FK/`pg_depend` relationships and row parity, and rehearse both
   forward and rollback migrations in a production-shaped environment.
6. **Only then migrate.** Use an explicit, reversible migration that removes
   policies/functions/FKs before the table and includes post-migration RPC,
   participant login, admin, reminder, check-in, observation, and coach smoke
   tests. Never edit old applied migration files.

At present this audit recommends **no table drop**. The best next step is a
deployed-schema/usage audit focused on whether the dual QA action logs have a
documented retention reason.
