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

Additional repository areas include `scripts/` for protected-content generation and validation, `docs/` for active and historical documentation, `assets/` for shared media, and `google-apps-script/` for a retained legacy integration.

## Three game modes

### Public demo

`/demo/` and `/demo-game/` use fictional sample content and the shared game engine. They require no participant study account. Demo progress may use browser `localStorage`; it is not participant study data.

### Authenticated participant game

`/game/` is the current participant application. It uses Supabase email/password authentication and requires an active participant linked to an active case. It loads protected case content, daily access/completion state, and (where applicable) the weekly study workflow from Supabase. Mission sessions and responses are written to relational Supabase telemetry.

### Research Admin QA Preview

Research Admin can generate a QA-only preview using the shared game engine. Preview activity is explicitly QA data: it does not count as participant study data and does not activate participant or case access.

## Legacy/static compatibility

The static teacher loader, `?teacher=...`, and `/game/teachers/<id>/` folders remain for legacy/static compatibility and public/demo/fallback support. Their `localStorage` progress and optional Google Apps Script `resultEndpoint` logging are not the normal authenticated participant architecture. This compatibility implementation is retained unchanged and is under review for future retirement.

Demo-2 and other public fixtures are fictional test/reference content. Real teacher, student, or BIP-derived content must never be committed. See [Private Content Build Workflow](docs/PRIVATE_CONTENT_BUILD_WORKFLOW.md) and the [Mission Authoring Standard](docs/MISSION_AUTHORING_STANDARD.md).

## Deployment

Vercel on the project's custom domain is the intended current deployment model. Relative browser assets and navigation should remain portable for local static testing, but GitHub Pages is not the production deployment model. Vercel environment variables provide server-only configuration for API routes.

Reminder endpoints exist at `/api/teacher-daily-prompt` and `/api/teacher-followup-reminder`, but this repository does **not** configure cron scheduling. See [Teacher Daily Reminders](docs/teacher-daily-reminders.md).

## Database bootstrap limitation

> **A fresh database cannot be reconstructed from `supabase/migrations/` alone.**

The canonical migration chain is additive and assumes foundational objects created by earlier historical/manual setup. In particular, definitions for `cases`, `participants`, `intake_requests`, and `case_game_content` originate outside the current canonical `supabase/migrations/` chain. Files under `research/supabase/` preserve parts of that history, but they are not a supported one-command bootstrap. Before applying canonical migrations to a new environment, inventory and validate those prerequisites rather than assuming the migration directory is complete.

This limitation is documentation only; migration consolidation belongs in a later, dedicated change.

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
