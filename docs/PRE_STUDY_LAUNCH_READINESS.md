# Pre-study launch-readiness audit

Audit date: 2026-08-26. Baseline: `66f46df` (current `main` snapshot supplied to the audit). This audit did not connect to, reset, or modify a linked or production Supabase project.

## PASS — Ready for study

- **Repository regression suite:** `node --test` passed all 355 tests. The suite covers authorization, Research Admin, Coaching Dashboard, observations, reminders, protected authoring/publishing, gameplay and telemetry, study-day status/adherence, weekly Qualtrics tracking, phase boundaries, and calendar parity.
- **Clean replay process:** `scripts/replay-clean-supabase.sh` provides one fail-fast, local-only command that starts Supabase, resets an empty local database through every committed migration, lints the result, and runs the migration architecture test. It never uses `--linked`, a remote database URL, skipped migrations, or repair SQL.
- **Protected authoring:** append-only setup, Resource Map, and mission drafts; full-draft preview/validation; immutable publishing; and version-bound Behavior, Privacy, and QA reviews are represented in migrations and exercised by tests.
- **Gameplay and telemetry:** sessions, responses, hints, completion integrity, QA exclusion, Resource Map events, access audit, and reminder architecture are represented and tested.
- **Study-day excuse and adherence:** hashed status tokens, append-only status events, current teacher-unavailable state, and the expected-mission denominator are represented and tested. Phase calculations exclude Baseline and stop at the next post-Intervention phase.
- **Weekly Qualtrics tracking:** administration/token metadata, service-only generation, idempotent completion, and Research Admin listing are represented and tested; no survey answers are stored by Mission: Reinforceable. The retired MR-hosted Weekly Teacher Report tables and RPCs remain removed.
- **Calendar:** browser and server helpers agree across the complete approved Granite range: weekdays only, enumerated closures excluded, and `America/Denver` authoritative.
- **API footprint:** 12 deployable JavaScript files exist directly under `api/`; test files are not routes. The two cron declarations reuse those routes and create no additional functions.
- **Routine workflow coverage:** the repository provides application/RPC paths for participant intake and approval, readiness/permissions, baseline assignment, observation summaries, authoring/validation/publishing/reviews, orientation and access activation, configured email/reminders, teacher unavailability, adherence, weekly-link generation/completion, Coaching Dashboard reporting, phase transitions, End Measures/Maintenance, and closeout. No routine case operation identified in this audit requires GitHub, a terminal, or the SQL editor.

### Clean replay evidence status

The required **true database replay is not yet evidenced by this execution environment**. The exact command is:

```sh
./scripts/replay-clean-supabase.sh
```

It stopped before touching a database because this environment has neither the Supabase CLI nor Docker. Installing Docker was also blocked by the environment's package mirror. Therefore the clean replay result for this audit run is **FAIL (environment prerequisite unavailable)**, not a claim that a migration failed. No first SQL migration failure was encountered, and no migration was changed.

### Vercel evidence status

Static route/configuration and tests passed, but an actual preview was not possible because this environment has no Vercel CLI, project link, or Vercel credentials. Vercel Ready status is therefore **NOT VERIFIED**, rather than Ready.

## NEEDS MANUAL PRODUCTION CONFIGURATION

- Point and validate the `missionreinforceable.com` production domain.
- Verify the Resend sender/domain.
- Configure production email environment variables.
- Configure the real Qualtrics weekly survey URL.
- Configure the Qualtrics embedded token and completion redirect.
- Keep the production reminder kill switch **OFF** until end-to-end production validation succeeds.
- In an isolated Docker-capable environment, run `./scripts/replay-clean-supabase.sh` and retain its successful output.
- Run a Vercel preview with the production project's authorized credentials and require **Ready** before launch.

## BLOCKERS

- Clean database replay evidence is blocked in this environment by missing Supabase CLI/Docker prerequisites. This is a release-evidence blocker, not a discovered schema defect.
- Vercel preview Ready evidence is blocked in this environment by missing CLI/project credentials. This is a deployment-evidence blocker, not a discovered route defect.
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
