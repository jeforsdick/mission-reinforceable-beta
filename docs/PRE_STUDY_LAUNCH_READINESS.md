# Pre-study launch-readiness audit

Audit date: 2026-08-26. Baseline: `66f46df` (current `main` snapshot supplied to the audit). This audit did not connect to, reset, or modify a linked or production Supabase project.

## PASS — Ready for study

- **Repository regression suite:** `node --test` passed all 355 tests. The suite covers authorization, Research Admin, Coaching Dashboard, observations, reminders, protected authoring/publishing, gameplay and telemetry, study-day status/adherence, weekly Qualtrics tracking, phase boundaries, and calendar parity.
- **Clean replay process:** `scripts/replay-clean-supabase.sh` provides one fail-fast, local-only command that starts Supabase, resets an empty local database through every committed migration, lints the result, and runs the migration architecture test. The **Clean Supabase migration replay / Replay every migration from empty** GitHub Actions check runs that command on a disposable Ubuntu runner without production secrets. Neither path uses `--linked`, a remote database URL, skipped migrations, or repair SQL.
- **Protected authoring:** append-only setup, Resource Map, and mission drafts; full-draft preview/validation; immutable publishing; and version-bound Behavior, Privacy, and QA reviews are represented in migrations and exercised by tests.
- **Gameplay and telemetry:** sessions, responses, hints, completion integrity, QA exclusion, Resource Map events, access audit, and reminder architecture are represented and tested.
- **Study-day excuse and adherence:** hashed status tokens, append-only status events, current teacher-unavailable state, and the expected-mission denominator are represented and tested. Phase calculations exclude Baseline and stop at the next post-Intervention phase.
- **Weekly Qualtrics tracking:** administration/token metadata, service-only generation, idempotent completion, and Research Admin listing are represented and tested; no survey answers are stored by Mission: Reinforceable. The retired MR-hosted Weekly Teacher Report tables and RPCs remain removed.
- **Calendar:** browser and server helpers agree across the complete approved Granite range: weekdays only, enumerated closures excluded, and `America/Denver` authoritative.
- **API footprint:** 12 deployable JavaScript files exist directly under `api/`; test files are not routes. The two cron declarations reuse those routes and create no additional functions.
- **Routine workflow coverage:** the repository provides application/RPC paths for participant intake and approval, readiness/permissions, baseline assignment, observation summaries, authoring/validation/publishing/reviews, orientation and access activation, configured email/reminders, teacher unavailability, adherence, weekly-link generation/completion, Coaching Dashboard reporting, phase transitions, Maintenance, End Measures, and closeout. No routine case operation identified in this audit requires GitHub, a terminal, or the SQL editor.

The canonical concluding sequence is `Intervention → Maintenance → End Measures → Closeout`. Mission: Reinforceable access and daily reminders are withdrawn when Maintenance begins, and the Weekly Teacher Report ends with Intervention. Maintenance observations occur before TSES Post, URP-IR, and the post-intervention Teacher Interview; those measures are administered only after the final maintenance observation.

### Clean replay evidence status

The required **true database replay must be evidenced by the GitHub Actions check named `Clean Supabase migration replay / Replay every migration from empty`**. The exact command used locally and in CI is:

```sh
./scripts/replay-clean-supabase.sh
```

The first local attempt stopped before touching a database because the authoring environment had neither the Supabase CLI nor Docker. CI now supplies both prerequisites on an isolated runner. Until the named check completes successfully, clean replay remains **PENDING** and must not be represented as a static-test pass. No SQL migration failure has yet been encountered, and no migration has been changed.

### Vercel evidence status

The PR's Vercel deployment is **Ready**. Static route/configuration checks also confirm 12 deployable API files with no duplicate route introduced by this audit.

## PRE-STUDY DATA CLEANUP

Use the one-time, non-migration `scripts/pre-study-fake-case-cleanup.sql` only in the
Supabase SQL Editor. First run its SELECT-only preview and compare every listed case
with Research Admin. Then run the complete transaction unchanged so its default
`ROLLBACK` provides a rehearsal. Confirm the verification results retain both
`CASE-998` / `MR-998` and `CASE-DEMO-2` / `MR-DEMO-2`, remove only the approved
allowlist, and report no orphan references. Only after that review should the final
`ROLLBACK` be changed to `COMMIT` and the complete script rerun.

The cleanup does not delete Supabase Auth users or profiles. Review its final report
and handle any now-unused fake Auth accounts separately, while preserving Research
Admin and any account that still has another assignment.

## NEEDS MANUAL PRODUCTION CONFIGURATION

- Point and validate the `missionreinforceable.com` production domain.
- Verify the Resend sender/domain.
- Configure production email environment variables.
- Configure the real Qualtrics weekly survey URL.
- Configure the Qualtrics embedded token and completion redirect.
- Keep the production reminder kill switch **OFF** until end-to-end production validation succeeds.

## BLOCKERS

- Clean database replay remains a release-evidence blocker until `Clean Supabase migration replay / Replay every migration from empty` completes successfully. If it fails, the first genuine SQL failure must be repaired and the entire check rerun from empty.
- No repository-architecture blocker was identified by the static audit or 355-test suite.

## POST-LAUNCH / NOT REQUIRED

- Optional UI polish, additional analytics, new surveys/measures, new reminders, new game mechanics/scoring, and automated phase changes are outside launch scope.
- A broader redesign of My Progress or any dashboard is not required.

## Audit conclusions

- **First migration failure:** none encountered; the database engine could not be started.
- **Migration/schema drift:** no new repository drift was discovered. Live catalog drift cannot be inferred without a deliberately read-only production catalog comparison.
- **Security:** no new grant, cross-case access, participant/case mismatch, phase leakage, or `SECURITY DEFINER` issue was identified by the focused tests. Permissions were not broadened.
- **Production history:** no existing migration was rewritten and no new migration was added.
- **Scope:** this audit adds reproducibility evidence/process documentation only; it adds no study feature and changes no research method.
