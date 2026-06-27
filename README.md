# Mission: Reinforceable

Mission: Reinforceable is organized as a static public website with the current beta game mounted at `game/`.

The repository is intentionally not a Next.js app yet. The public site pages are plain HTML, the public-site styling lives separately from the game styling, and the beta game keeps its existing static app structure.

## Folder structure

```text
mission-reinforceable/
├── index.html                 # Public homepage
├── research/
│   └── index.html             # Research overview page
├── intake/
│   └── index.html             # New game intake placeholder page
├── beta/
│   └── index.html             # Beta testing information page
├── game/
│   ├── index.html             # Existing beta game shell
│   ├── css/styles.css         # Existing game styling only
│   ├── js/                    # Existing game systems
│   └── teachers/
│       ├── _template/         # Teacher game template
│       └── olson/             # Beta classroom content
├── assets/
│   ├── game/skin-v2/          # Existing game image assets
│   └── site/site.css          # Public website styling
├── docs/mockups/              # Mockup and reference images
├── favicon.png
└── README.md
```

## Public website routes

Use relative links so the site works both locally and on GitHub Pages project URLs.

```text
./
research/
intake/
beta/
game/
```

Nested public pages link back with paths such as `../`, `../game/`, `../research/`, `../intake/`, and `../beta/`.

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
http://localhost:8000/beta/
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
https://<username>.github.io/<repository-name>/beta/
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
