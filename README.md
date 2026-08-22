# Mission: Reinforceable

Mission: Reinforceable is a static, multi-route web application with Supabase-backed participant, coach, intake, and research-administration workflows. The public pages and game engine use plain HTML, CSS, and JavaScript; server-only API routes support operational integrations.

## Current routes

| Route | Purpose |
| --- | --- |
| `/` | Public website. |
| `/research/` | Public research information. |
| `/intake/` | Public individualized-game intake. |
| `/demo/` | Public demo explanation and entry point. |
| `/demo-game/` | Playable fictional demo. |
| `/game/` | Authenticated participant game. |
| `/coach-dashboard/` | Authenticated coach dashboard. |
| `/research-admin/` | Authenticated Research Admin operations. |
| `/beta/` | Compatibility-only redirect to the public demo; not the current participant entry point. |

Additional repository areas include `scripts/` for protected-content generation and validation, `docs/` for active and historical documentation, and `assets/` for shared media.

## Three game modes

### Public demo

`/demo/` and `/demo-game/` use fictional sample content and the shared game engine. The playable demo loads its dedicated fixture from `demo-game/content/` directly and does not use the legacy teacher-folder loader. They require no participant study account. Demo progress may use browser `localStorage`; it is not participant study data.

### Authenticated participant game

`/game/` is the current participant application. It uses Supabase email/password authentication and requires an active participant linked to an active case. It loads protected case content, daily access/completion state, and (where applicable) the weekly study workflow from Supabase. Mission sessions and responses are written to relational Supabase telemetry.

### Research Admin QA Preview

Research Admin can generate a QA-only preview using the shared game engine. Preview activity is explicitly QA data: it does not count as participant study data and does not activate participant or case access.

## Protected content and development fixtures

Authenticated and QA gameplay require `case_game_content`; there is no public-folder fallback or URL-based content selection. `game/teachers/demo-2/` remains only as a fictional development/build fixture for validators and is never loaded by participant runtime. Real teacher, student, or BIP-derived content must never be committed. See [Private Content Build Workflow](docs/PRIVATE_CONTENT_BUILD_WORKFLOW.md) and the [Mission Authoring Standard](docs/MISSION_AUTHORING_STANDARD.md).

## Deployment

Vercel on the project's custom domain is the intended current deployment model. Relative browser assets and navigation should remain portable for local static testing, but GitHub Pages is not the production deployment model. Vercel environment variables provide server-only configuration for API routes.

Production reminder cron routes exist at `/api/teacher-daily-prompt` and
`/api/teacher-daily-prompt-retry`; the protected smoke-test route is
`/api/teacher-reminder-smoke-test`. The dissertation does not deploy or schedule
a follow-up reminder route. See [Teacher Daily Reminders](docs/teacher-daily-reminders.md).

## Database bootstrap

> **Fresh database replay begins with the canonical legacy bootstrap.**

The canonical migration chain now includes a fresh-project bootstrap for the historical `cases`, `participants`, `intake_requests`, and `case_game_content` foundations. It is a **fresh-database starting point**, not a migration to run blindly on the existing dissertation database. Existing production requires isolated replay, catalog comparison, and deliberate migration-history reconciliation before appropriate additive repairs are applied. See the [Supabase reproducibility audit](docs/SUPABASE_REPRODUCIBILITY_AUDIT.md) for provenance, security boundaries, and verification status. Files under `research/supabase/` preserve historical setup and seed material but are not part of the canonical replay.

## Security configuration

Supabase publishable/anon browser keys are public client configuration and do not grant service-role access; authorization still depends on RLS and server-side checks. Supabase service-role keys, Resend credentials, cron secrets, and all other privileged credentials remain server-only and must never be committed or exposed to browser code.

## Local testing

Start a static server from the repository root:

```sh
python3 -m http.server 8000
```

Then visit the relevant route at `http://localhost:8000/`, such as `/demo-game/` or `/game/`. Authenticated and server-backed behavior also requires the appropriate deployed/local service configuration.

## Privacy

Keep the repository free of real student names, inappropriate real teacher identifiers, and identifiable classroom details. Author and retain individualized participant content only in approved access-controlled storage.
