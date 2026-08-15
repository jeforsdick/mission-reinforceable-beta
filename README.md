# Mission: Reinforceable

Mission: Reinforceable is organized as a static public website with the current beta game mounted at `game/`.

The repository is intentionally not a Next.js app yet. The public site pages are plain HTML, the public-site styling lives separately from the game styling, and the beta game keeps its existing static app structure.

## Repository map

| Path | Purpose |
| --- | --- |
| `/` | Public website and shared public-site entry point. |
| `/game/` | Authenticated teacher game. |
| `/demo/` | Public demo explanation and landing page. |
| `/demo-game/` | Playable fictional demo. |
| `/beta/` | Legacy compatibility redirect to the public demo. |
| `/intake/` | Public individualized-game intake. |
| `/coach-dashboard/` | Authenticated coach dashboard. |
| `/supabase/migrations/` | Canonical location for current database migrations. |
| `/research/supabase/` | Older/manual protected-content SQL and the generated fictional Demo-2 fixture. |
| `/scripts/` | Protected-content generation and fidelity development tooling. |
| `/google-apps-script/` | Legacy/current research spreadsheet logging integration. |
| `/docs/` | Architecture, schema, design, and mockup documentation. |
| `/assets/` | Shared public-site and game images, audio, previews, and styling. |

Authoring documentation:

- [Mission Authoring Standard](docs/MISSION_AUTHORING_STANDARD.md)
- [Fictional Case Authoring Example](docs/examples/FICTIONAL_CASE_AUTHORING_EXAMPLE.md)

Demo-2 is fictional test/reference content. Real teacher, student, or BIP-derived content must never be committed to public GitHub. Generated real-participant content belongs only in approved private or restricted storage.

Supabase publishable browser keys are client configuration and may be used by the browser applications. Supabase service-role keys and all other secrets or credentials must never be committed.

## Public website routes

Use relative links so the site works both locally and on GitHub Pages project URLs.

```text
./
research/
intake/
game/
```

Nested public pages link back with paths such as `../`, `../game/`, `../research/`, and `../intake/`.

## How to test locally

Start a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
http://localhost:8000/research/
http://localhost:8000/intake/
http://localhost:8000/game/
http://localhost:8000/game/?teacher=olson
http://localhost:8000/game/teachers/olson/
```

## How to test on GitHub Pages

For a GitHub Pages project site, the repository is usually served under a path like:

```text
https://<username>.github.io/<repository-name>/
```

Because the public pages use relative links, these routes should work under that project path:

```text
https://<username>.github.io/<repository-name>/
https://<username>.github.io/<repository-name>/research/
https://<username>.github.io/<repository-name>/intake/
https://<username>.github.io/<repository-name>/game/
```

Avoid changing public navigation to root-relative paths like `/game/` unless the deployment target has been configured for domain-root hosting.

## Game behavior

The existing beta game behavior is intended to remain unchanged. The game still uses:

- browser `localStorage` for local progress
- teacher IDs from `?teacher=...` or `/game/teachers/<teacher-id>/`
- teacher config files under `game/teachers/<teacher-id>/config.js`
- mission files listed in each teacher config
- the optional `resultEndpoint` value for result logging

The current beta classroom can be opened at:

```text
game/?teacher=olson
```

The teacher redirect route also opens the same game:

```text
game/teachers/olson/
```

## Adding a teacher game

1. Duplicate `game/teachers/_template`.
2. Rename the copied folder with a simple lowercase ID, such as `teacher-a`.
3. Edit the copied folder's `config.js`.
4. Replace or edit the mission files in that teacher's `content` folder.
5. Open the game with `game/?teacher=teacher-a`.

## Privacy note

For dissertation/privacy use, keep the repo free of real student names, real teacher names if not appropriate, and identifiable classroom details.
