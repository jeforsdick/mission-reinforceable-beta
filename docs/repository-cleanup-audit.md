# Repository cleanup audit

**Audit date:** 2026-09-22

**Scope:** all 325 tracked paths at commit `fafaec0`, plus ignored/untracked state, Git size, cross-file references, deployment configuration, and the executable Node test suite.

**Constraint:** analysis only. This report is the sole repository change; it does not remove, relocate, rename, reformat, or otherwise alter an existing file.

## Executive summary

The repository is generally coherent and unusually well protected by architecture tests. The active static application, serverless routes, shared server modules, research-admin modules, validators, fictional fixtures, and all 54 canonical Supabase migrations have discoverable runtime, deployment, test, documentation, or operational roles. **No canonical file in `supabase/migrations/` is a removal candidate.** Later migrations intentionally repair or retire behavior introduced by earlier migrations; the complete ordered chain remains required for reproducible database history.

The audit found no tracked build output, cache, local dependency tree, secret file, database dump, or participant export. The working copy contains an ignored `node_modules/` directory, as expected. The main cleanup opportunities are:

1. five unlinked design mockups (about 9.9 MiB total), which are archive candidates;
2. three historical/manual SQL files in `research/supabase/`, which must not be confused with canonical migrations and are archive/review candidates rather than immediately disposable files;
3. completed-phase audit documents that are useful provenance but could move to a clearly labeled archive;
4. two explicitly temporary or compatibility surfaces (`/api/teacher-reminder-smoke-test` and `/beta/`) that require an owner decision;
5. a one-time pre-study cleanup script whose execution status is not recorded in Git;
6. an apparently unused `resend` package dependency; all current email code calls the Resend HTTP API with `fetch` instead;
7. a stale README statement naming the nonexistent `server/test-mission-email.js`;
8. substantial binary weight: the three homepage GIFs total about 76.6 MiB, led by a 64 MiB GIF. They are actively referenced, so optimization—not deletion—is appropriate.

The conservative result is **0 current file-level SAFE-TO-REMOVE candidates**, **8 REVIEW groups**, and **13 ARCHIVE candidate paths** (including three SQL files that must first clear the associated REVIEW decisions). That is intentional: lack of a browser import is not enough to establish removability, and several seemingly old files are test fixtures, operational tools, or immutable migration history.

## Method and decision rules

The audit used the tracked-file inventory (`git ls-files`), repository-wide reference searches, HTML script/stylesheet inspection, CommonJS/ES module import inspection, documentation-link inspection, Git history, per-file disk usage, Git object statistics, ignored-file status, SQL comments and tests, Vercel routes/crons, and the GitHub workflow. It also ran `node --test`; all **442 tests passed**.

Classifications mean:

- **KEEP:** required by current runtime/deployment/tests/research operations, or explicitly and reasonably retained.
- **REVIEW:** removal or consolidation may be desirable, but deployment state, external links, completed operations, or policy must be confirmed by a human.
- **SAFE-TO-REMOVE CANDIDATE:** no runtime, deployment, research, test, documentation, migration, or operational dependency was found.
- **ARCHIVE CANDIDATE:** not needed for the current application, but has historical/design/research provenance worth preserving outside the active tree.

Reference searches are evidence, not proof of absence: public URLs can be linked externally, SQL may have been run manually, and operational documents may be used outside Git. Accordingly, uncertainty is classified as KEEP or REVIEW.

## Current repository structure

| Area | Current role | Classification |
| --- | --- | --- |
| `.github/workflows/` | Runs the clean, local Supabase migration replay on pull requests/manual dispatch. | KEEP |
| Root HTML/config | Public landing page, favicon, package metadata, ignore rules, Vercel cron configuration, and project overview. | KEEP, except specific REVIEW findings below |
| `assets/game/` | Runtime game art and audio. Every tracked asset has a textual reference. | KEEP |
| `assets/site/` | Shared public CSS/navigation and three referenced homepage preview GIFs. | KEEP; optimize large GIFs |
| `api/` | Vercel functions plus colocated Node architecture/unit tests. Routes are referenced by clients, Vercel cron config, server modules, tests, or operational docs. | KEEP, except temporary smoke route is REVIEW |
| `server/` | Server-only email, calendar, reminder, weekly-check-in/recap, and study-status modules imported by API routes and tests. | KEEP |
| `game/` | Authenticated game, shared engine, styles, telemetry, calendar/access logic, tests, and fictional development fixture. | KEEP |
| `demo/`, `demo-game/` | Current public demo landing/playable fictional demo; linked from public navigation and tested. | KEEP |
| `beta/` | Documented compatibility redirect to the demo. | REVIEW |
| `intake/` | Current public intake form and tests. | KEEP |
| `coach-dashboard/` | Current authenticated coach/research dashboard and tests. | KEEP |
| `research-admin/` | Current research operations UI, modular models/views, and extensive security/architecture tests. | KEEP |
| `research/` | Public research page plus fictional CASE-999 fixtures and historical/manual SQL. | Mixed: public page/fixtures KEEP; SQL findings below |
| `study-day-status/`, `weekly-checkin-complete/`, `set-password/` | Current public token-completion and account-setup pages. | KEEP |
| `scripts/` | Validators, private-content builder/starter, clean database replay, tests, and a one-time cleanup tool. | KEEP, except cleanup SQL is REVIEW |
| `supabase/migrations/` | Canonical, ordered, replay-tested migration history. | KEEP—all files |
| `docs/` | Active operating/research contracts plus completed-phase provenance and unlinked design mockups. | Mixed; findings below |

## KEEP findings

### Canonical migration history

Keep **every** file under `supabase/migrations/`. The first migration bootstraps legacy foundations for a fresh database; later files add, repair, supersede, or explicitly retire schema behavior. Tests inspect both introduction and retirement migrations, the migration-order test enforces prerequisites and unique versions, and the GitHub workflow replays the entire chain. Removing an already-applied migration would break fresh replay and erase deployment history even when its final objects are later dropped.

This includes migrations with names such as `cleanup`, `repair`, `fix`, `retire`, `legacy`, or `archive`. Those names describe additive history, not disposable scripts. In particular:

- weekly check-in/report creation and retirement migrations are intentionally tested together;
- raw observation creation, summary transition, Cleanup 2A, and Cleanup 2B preserve an auditable transition;
- the archived demo fixture migration records a deliberate data-state change;
- repair migrations remain necessary after the original definitions during clean replay.

### Test suites and test-only fixtures

Keep all `*.test.js` and `*.test.mjs` files. They are discovered by `node --test` even when no production module imports them. The full run exercised 442 tests, including authorization boundaries, SQL architecture, replay ordering, fixtures, validators, browser contracts, route contracts, and retired-feature assertions.

Keep these deceptively non-runtime fixtures/tools:

- `game/teachers/demo-2/**`: fictional source fixture used by the protected-content builder, structure/resource/fidelity validators, and tests; the README correctly says it is not a participant runtime fallback.
- `research/fixtures/case-999/**`: fictional Resource Map fixture used by `scripts/case-999-resource-map.test.js` and validation tests.
- `docs/examples/**`: fictional authoring examples tied to the mission-authoring workflow and protected by `scripts/fictional-resource-files.test.js`.
- `scripts/protected-content-loader.js`: shared test/build loader; it is not browser code but is required by the protected-content pipeline tests.
- `scripts/replay-clean-supabase.sh`: invoked by `.github/workflows/clean-supabase-replay.yml` and documented as the clean replay procedure.

### Application, APIs, and deployment

Keep the current public/authenticated route directories, shared assets, all non-temporary API routes, and `server/` modules. Vercel schedules `/api/teacher-daily-prompt` and `/api/teacher-daily-prompt-retry`; browser/research-admin code calls the other operational endpoints. `api/research-admin-server.js` is a shared serverless helper rather than a browser import.

Keep `.vercelignore`, even though it should be broadened after testing: it prevents `api/*.test.mjs` from being interpreted as serverless routes. Keep `vercel.json`; it is the only declared production cron configuration.

### Assets

Keep every file under `assets/game/`: the reference audit found a CSS, HTML, JavaScript, email-template, or test reference for each file. Keep the three `assets/site/game-preview*.gif` files for now because `index.html` renders all three. Their size is an optimization concern, not evidence that they are unused.

## REVIEW findings

Each item below requires a human decision or external-state check.

### 1. `beta/index.html`

1. **Likely purpose:** compatibility redirect from the old `/beta/` participant/demo entry point to the current public demo.
2. **Current references:** README route table explicitly calls it a compatibility-only redirect; the path may also have external bookmarks that cannot be found by repository search.
3. **Replacement:** `/demo/` and `/demo-game/`.
4. **Removal risk:** medium; old links would become 404s and externally published material may still point here.
5. **Recommended action:** retain until access logs and known external materials show no `/beta/` traffic; then prefer a deployment-level permanent redirect before deleting the compatibility page.

### 2. `api/teacher-reminder-smoke-test.js`

1. **Likely purpose:** protected manual smoke endpoint for reminder delivery and a temporary Resend-path test.
2. **Current references:** README, `docs/teacher-daily-reminders.md`, `api/teacher-reminder-smoke-test.js`, `server/teacher-reminder-service.js`, and reminder-service tests.
3. **Replacement:** production sending uses `/api/teacher-daily-prompt` and `/api/teacher-daily-prompt-retry`; no replacement exists for manual smoke verification.
4. **Removal risk:** medium; deleting only the route would leave docs/tests/service branches stale and remove a launch diagnostic.
5. **Recommended action:** product/operations owner should decide whether launch verification is complete. If retired, remove the route and its smoke-only service branch/tests and update both docs in one later PR.

### 3. `scripts/pre-study-fake-case-cleanup.sql`

1. **Likely purpose:** guarded, preview-first, one-time removal of specifically approved fake cases before study launch.
2. **Current references:** `docs/PRE_STUDY_LAUNCH_READINESS.md`, its dedicated test, `research/supabase/004_update_case_999_resources_v5.sql` in comments, and repository-wide schema validation tests.
3. **Replacement:** current Research Admin archival workflow can hide obsolete cases but does not perform the same destructive cleanup.
4. **Removal risk:** high until the operator confirms whether the script was executed and whether rollback/audit evidence is stored elsewhere.
5. **Recommended action:** record execution/non-execution and final disposition in an operations log. After completion, move the SQL and test to a controlled operations archive; do not convert it into a canonical migration.

### 4. `research/supabase/003_seed_demo2_full_protected.sql`

1. **Likely purpose:** generated SQL seed for the fictional `CASE-DEMO-2` protected game.
2. **Current references:** default/legacy output of `scripts/build-protected-seed.js`, README/database docs, and tests of the legacy positional builder invocation; it is not part of canonical migration replay.
3. **Replacement:** reproducible generation from `game/teachers/demo-2/**` via `scripts/build-protected-seed.js`, plus database-side authoring/publishing for current cases.
4. **Removal risk:** medium; operators may still use the checked-in seed to restore the reserved demo fixture, and changing the builder default affects workflow compatibility.
5. **Recommended action:** decide whether checked-in generated seed output is still an accepted restore artifact. If not, update the builder/docs/tests first, regenerate only on demand outside the repository, then archive the existing SQL.

### 5. `research/supabase/004_update_case_999_resources_v5.sql`

1. **Likely purpose:** guarded one-off deployment of fictional CASE-999 Resource Map version 5.
2. **Current references:** `scripts/case-999-resource-map.test.js`, the fake-case cleanup SQL, and database cleanup documentation.
3. **Replacement:** its content is represented by `research/fixtures/case-999/`; current authoring/publishing is database-backed.
4. **Removal risk:** medium; execution state is external, and its test currently validates privacy, exact targets, and the guarded version transition.
5. **Recommended action:** confirm deployment and preservation requirements. If complete, archive the SQL with its execution evidence and refocus the fixture test on the JSON/JS source rather than a retired deployment artifact.

### 6. `research/supabase/001_protected_game_content.sql`

1. **Likely purpose:** original manually run setup for protected content and participant read policy.
2. **Current references:** historical schema documentation and database cleanup documentation; it is explicitly outside canonical replay.
3. **Replacement:** `supabase/migrations/20260812000000_legacy_schema_bootstrap.sql` supplies the canonical fresh-replay foundation, followed by the complete migration chain.
4. **Removal risk:** low to medium; runtime/replay does not depend on it, but it documents the pre-canonical policy provenance and may be relevant to production history reconciliation.
5. **Recommended action:** after confirming migration-history reconciliation is complete, move it to a dated SQL provenance archive with a header that says “historical; do not apply.” It is also listed below as an archive candidate because that is its likely final home.

### 7. `package.json` dependency entry `resend: 6.25.0`

1. **Likely purpose:** SDK dependency for Resend email delivery.
2. **Current references:** no source file imports or requires `resend`; current intake, reminder, login, and recap sending calls `https://api.resend.com/emails` with native `fetch`.
3. **Replacement:** native `fetch` in API/server modules.
4. **Removal risk:** low, but deployment behavior should be checked because package metadata can affect the Vercel build even without an import.
5. **Recommended action:** in a cleanup PR, remove the dependency and verify a Vercel preview plus the Node suite. If packages remain later, commit the chosen lockfile for reproducible installs. Do not delete `package.json` itself.

### 8. `README.md` temporary-smoke-test section

1. **Likely purpose:** operational instructions for the temporary Resend path test.
2. **Current references:** describes the still-present smoke route but claims its reusable template is `server/test-mission-email.js`, a path that does not exist. The implementation is in `server/teacher-reminder-service.js` and uses `server/mission-reminder-email.js`.
3. **Replacement:** current service/template files noted above.
4. **Removal risk:** low for correcting the path, medium for deleting the whole section while the endpoint remains.
5. **Recommended action:** correct the stale file reference immediately in the next documentation PR; remove the temporary section only together with the endpoint decision.

## SAFE-TO-REMOVE CANDIDATES

**None at file level.** The audit deliberately does not label the unlinked mockups or old SQL “safe” because both retain plausible design/research provenance, and it does not label test-only files unused because the test runner discovers them without application imports.

The unused `resend` dependency is a low-risk **configuration-entry** removal candidate after deployment verification, but that is recorded as REVIEW rather than a file deletion.

## ARCHIVE candidates

These have no current application/deployment role but may be valuable provenance. “Archive” means preserve in a release attachment, research records store, or a clearly separated `docs/archive/`/`archive/` area according to project policy—not silently delete.

### Historical SQL provenance

| Path | Original/likely purpose | Current references | Replacement | Removal risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `research/supabase/001_protected_game_content.sql` | Original manual protected-content schema/policy setup. | Historical schema and cleanup docs. | Canonical bootstrap plus migrations. | Low–medium: production provenance. | Archive after reconciliation; mark non-runnable. |
| `research/supabase/003_seed_demo2_full_protected.sql` | Generated full fictional demo seed. | Builder default/legacy behavior, docs, tests. | Demo-2 source fixture + generator and current publishing. | Medium: possible restore workflow. | Resolve REVIEW item 4, then archive generated output if restore workflow permits. |
| `research/supabase/004_update_case_999_resources_v5.sql` | One-off guarded CASE-999 content update. | Dedicated test, cleanup script, cleanup docs. | CASE-999 fixture sources/current publishing. | Medium: execution/provenance uncertainty. | Resolve REVIEW item 5; archive with execution record and adapt tests. |

### Completed-phase documentation

| Path | Original/likely purpose | Current references | Replacement | Removal risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `docs/GAMEPLAY_CLEANUP_3A.md` | Records removal of the old Olson public-demo loader/content path. | No incoming doc links; mentions paths already removed. | README’s current three-mode architecture and current demo tests. | Low: historical rationale only. | Archive under a dated cleanup-history area. |
| `docs/cleanup-2a-legacy-raw-observation-dependencies.md` | Dependency map used to plan database Cleanup 2A/2B. | No incoming links; migrations/tests now enforce the result. | Canonical migrations plus `docs/database-cleanup-audit.md`. | Low–medium: research schema provenance. | Archive with database cleanup history. |
| `docs/dissertation-schema-foundation.md` | Historical schema-foundation design and rollout notes. | No incoming links; it links to the newer reproducibility audit. | `docs/SUPABASE_REPRODUCIBILITY_AUDIT.md` and canonical migrations. | Medium: useful design provenance. | Archive, retaining a pointer from the reproducibility audit if needed. |
| `docs/PRE_STUDY_LAUNCH_READINESS.md` | Point-in-time launch audit dated 2026-08-26 at an older baseline and 355 tests. | No incoming links; still points operators to the one-time cleanup. | Current repository state and this audit; no live readiness document fully replaces its operations checklist. | Medium. | Keep active until one-time cleanup status is resolved, then archive as a dated launch record. |
| `docs/teacher-my-progress-freeze.md` | Frozen metric/presentation decision record for teacher progress. | No incoming links; tests encode the constraints. | Current progress implementation and `mission-progress` tests. | Medium: research measurement rationale. | Archive only if formal protocol records preserve the frozen definitions. |

### Unlinked design mockups

| Path | Original/likely purpose | Current references | Replacement | Removal risk | Recommended action |
| --- | --- | --- | --- | --- | --- |
| `docs/mockups/feedback-page-mockup.png` | Design reference for feedback/results UI. | No textual references found. | Current game UI/assets. | Low runtime risk; possible design provenance. | Archive externally or add an index explaining continued value. |
| `docs/mockups/landing-page-mockup.png` | Design reference for initial game landing. | No textual references found. | Current game UI/assets. | Low runtime risk; possible design provenance. | Archive externally or document it. |
| `docs/mockups/landing-page-same-day-return-mockup.png` | Design reference for locked same-day return state. | No textual references found. | Current tested same-day UI/assets. | Low runtime risk; possible design provenance. | Archive externally or document it. |
| `docs/mockups/progress-page-mockup.png` | Design reference for progress UI. | No textual references found. | Current progress implementation/assets. | Low runtime risk; possible design provenance. | Archive externally or document it. |
| `docs/mockups/scenario-page-mockup.png` | Design reference for mission scenario UI. | No textual references found. | Current game UI/assets. | Low runtime risk; possible design provenance. | Archive externally or document it. |

The five PNGs are approximately 1.9–2.1 MiB each (about 9.9 MiB total). If retained in Git, add `docs/mockups/README.md` with dates, status, and what decisions they preserve; otherwise an external design archive is cleaner.

## Dependency and package findings

- `package.json` declares only `resend@6.25.0`, but the codebase has no package import. Email modules use the Resend REST endpoint through built-in `fetch`. Treat the dependency entry as REVIEW and verify a Vercel preview before removal.
- There is no tracked `package-lock.json`; `node_modules/.package-lock.json` exists only inside the ignored local dependency directory. If no dependencies remain, the repository can intentionally stay package-manager-light. If dependencies are retained or added, choose and commit a root lockfile for reproducibility.
- There are no `scripts` in `package.json`. Contributors must infer `node --test` from project practice. Add `"test": "node --test"` in a future configuration PR.
- Node reports `[MODULE_TYPELESS_PACKAGE_JSON]` for `weekly-checkin-complete/completion.js` because it contains ESM syntax but the package has no `type`. Do not add `"type": "module"` casually: most API/server code is CommonJS. Prefer renaming only that browser/test module to `.mjs`, adjusting its imports/script tag as needed, or explicitly accepting the warning after verifying Vercel semantics.
- The browser loads Supabase JS from jsDelivr rather than from npm. That is intentional architecture, but versions should remain pinned (they currently use the major tag `@2`, not an exact version) if reproducibility/security policy requires deterministic browser dependencies.

## `.gitignore` and ignore-policy findings

The existing `.gitignore` appropriately covers OS metadata, environment/secrets, private keys, dependency directories, builds/caches/logs, local Supabase state, dumps/databases, private participant exports, generated protected content, and private BIP/BSP source material. `git status --ignored` confirms local `node_modules/` is ignored, and no ignored files are tracked.

Recommended additions, after owner confirmation:

- `.vercel/` for local Vercel project metadata;
- common test/runtime artifacts such as `playwright-report/`, `test-results/`, and `*.lcov` if browser/coverage tooling is expected;
- editor folders `.idea/` and `.vscode/` unless shared editor configuration is intentionally planned;
- generated Supabase type outputs only if the team selects a standard output path (for example `supabase/types/`); do not broadly ignore source-bearing directories.

Do **not** ignore `research/supabase/` wholesale while historical SQL remains there: doing so could conceal reviewed provenance or accidentally mask a deliberately retained operational artifact. A clearer directory boundary is preferable.

`.vercelignore` currently excludes only `api/*.test.mjs`. This prevents those tests from becoming functions, but does not minimize deployment upload size or exclude non-API tests, docs, research fixtures, scripts, mockups, `.github`, and canonical SQL. Review Vercel’s build behavior first, then explicitly ignore non-runtime material. Do not exclude assets or route directories used by the static deployment, and do not confuse upload exclusion with Git cleanup.

## Large and generated-file findings

The Git object pack is approximately **120.66 MiB**. The largest tracked working-tree files are:

| Path/group | Approximate size | Reference/status | Action |
| --- | ---: | --- | --- |
| `assets/site/game-preview.gif` | 64 MiB | Rendered by `index.html`. | KEEP; highest-priority optimization. Replace with compressed WebM/MP4 or a much smaller modern animated format with accessible fallback after browser review. |
| `assets/site/game-preview-3.gif` | 6.6 MiB | Rendered by `index.html`. | KEEP; optimize. |
| `assets/site/game-preview-2.gif` | 6.0 MiB | Rendered by `index.html`. | KEEP; optimize. |
| `assets/game/skin-v2/mission-reinforceable-background.png` | 5.4 MiB | Runtime CSS reference. | KEEP; losslessly optimize and consider WebP/AVIF only with visual regression checks. |
| `assets/game/audio/bgm-loop.mp3` | 4.0 MiB | Runtime audio reference. | KEEP; review bitrate/loop encoding. |
| `assets/game/skin-v2/strategy-map.png` | 3.7 MiB | Runtime reference. | KEEP; optimize with visual checks. |
| `docs/mockups/*.png` | about 9.9 MiB total | No references found. | ARCHIVE candidates. |
| `research/supabase/003_seed_demo2_full_protected.sql` | generated text (1,977 lines) | Operational/reproducibility references remain. | REVIEW; avoid routinely committing future generated participant seeds. |

Replacing the three GIFs can materially reduce both checkout and deployment transfer size, but removing them without updating `index.html` would break the homepage. Git history will remain large after ordinary deletion; only consider history rewriting if repository hosting limits justify the coordination cost.

No tracked `dist/`, `build/`, coverage, cache, log, dump, SQLite, CSV/TSV/XLSX export, `.env`, key, or `node_modules/` file was found. No credential value was identified. Browser Supabase project URL/anon-key configuration is public-client configuration by design; privileged service-role, Resend, cron, and operational values are environment variables. Test credentials/domains are placeholders.

## URL, domain, and architecture findings

- `research/supabase/003_seed_demo2_full_protected.sql` contains a legacy Google Apps Script `resultEndpoint`. The current protected runtime no longer uses public teacher-folder/result-endpoint architecture, but the seed could reintroduce confusing obsolete configuration if manually applied. Strip or explicitly document that field before any future regeneration/use; preserve the original only in provenance storage.
- Current production-oriented references use `missionreinforceable.com`, the expected Supabase project URL/anon browser key, Resend’s API, and an approved Qualtrics hostname. No old GitHub Pages production architecture was found in active route configuration.
- Historical `docs/GAMEPLAY_CLEANUP_3A.md` deliberately mentions removed Olson loader/files and an old endpoint; those references are evidence for archival classification, not broken runtime dependencies.
- README’s reference to `server/test-mission-email.js` is stale, as described above.

## Proposed cleaner repository structure

The following is a target, not a change in this PR:

```text
/
├── api/                         # Vercel functions only
├── server/                      # shared server-only implementation
├── app/ or existing route dirs  # public/authenticated static routes
├── assets/
│   ├── game/
│   └── site/                    # optimized production media
├── fixtures/
│   ├── demo-2/                  # explicitly fictional validator/build fixture
│   └── case-999/                # explicitly fictional research fixture
├── scripts/
│   ├── build/
│   ├── validate/
│   ├── database/
│   └── operations/              # active, owner/date/status documented
├── supabase/
│   ├── config.toml
│   └── migrations/              # immutable canonical chain only
├── docs/
│   ├── architecture/
│   ├── operations/
│   ├── research/
│   ├── authoring/
│   └── archive/                 # dated historical docs, if policy permits in Git
└── archive/                     # optional SQL/design provenance; never deployment input
```

Avoid a large path move solely for aesthetics before the study: many tests and documents intentionally use exact paths. The most valuable structural change is to separate **canonical migrations**, **currently runnable operational SQL**, and **historical SQL** with README files that state execution policy. The next most valuable change is a documentation index marking each document Active, Historical, or Superseded.

## Phased cleanup plan

### Phase 0 — record decisions and external state (no removals)

1. Confirm whether the pre-study fake-case cleanup and CASE-999 v5 update were executed; record date, operator, environment, outcome, and retained evidence outside sensitive source control.
2. Confirm whether `/beta/` receives traffic or appears in external study materials.
3. Decide whether the temporary reminder smoke route remains part of supported operations.
4. Decide where research/design provenance must be retained and for how long.

### Phase 1 — lowest-risk documentation/configuration corrections

1. Correct README’s nonexistent `server/test-mission-email.js` reference.
2. Add a documented `npm test` script without changing module mode.
3. Remove the unused `resend` dependency only after a successful Vercel preview and Node suite.
4. Add a docs index with Active/Historical/Superseded labels.
5. Add conservative `.gitignore` entries for `.vercel/` and agreed tooling output.

### Phase 2 — archive unreferenced provenance

1. Export the five unlinked mockups to the approved design/research archive; then remove them from the active repository, or retain them behind a documented mockup index.
2. Move completed cleanup/foundation documents into a dated documentation archive while preserving any required protocol citations.
3. Update all links/tests in the same PR and rerun the full suite.

### Phase 3 — resolve one-time and historical SQL

1. After operational confirmation, archive `research/supabase/001_protected_game_content.sql` as historical/non-runnable.
2. Decide whether generated Demo-2 SQL is a supported restore artifact. If not, change builder defaults/docs/tests, generate outside Git, and archive the current seed.
3. Archive the CASE-999 update with execution evidence and make fixture validation independent of the one-off SQL.
4. Archive the pre-study cleanup SQL and its dedicated test only after execution/disposition is recorded.
5. Never squash or delete files in `supabase/migrations/` as part of this work.

### Phase 4 — optimize large production media

1. Re-encode the three homepage GIFs, beginning with the 64 MiB file; preserve accessibility and responsive behavior.
2. Losslessly optimize large PNGs and review MP3 bitrate/loop quality.
3. Compare screenshots and media playback across supported desktop/mobile browsers before replacing originals.
4. Consider Git LFS only for source/design masters that truly must remain versioned; normal optimized web assets should stay directly deployable.

### Phase 5 — deployment and compatibility cleanup

1. Expand `.vercelignore` based on a verified preview/deployment manifest so tests, docs, research sources, and operational scripts are not uploaded unnecessarily.
2. Retire `/beta/` only after traffic/external-link review and preferably replace it with a platform redirect.
3. Retire the temporary smoke endpoint only as an atomic code/test/docs change.
4. Run `node --test`, the clean Supabase replay workflow, a Vercel preview, link checks, and visual smoke tests after each independently reviewable batch.

## Baseline conclusion

The clean baseline is strong: all 442 Node tests pass, migration replay is represented by both a script and CI workflow, and no tracked generated/cache/private export material was found. Cleanup should focus first on documentation correctness, unused dependency metadata, and unreferenced design artifacts—not source code or migration deletion. All findings involving external links, applied SQL, research provenance, or deployment behavior remain REVIEW/ARCHIVE until a human records the relevant operational decision.
