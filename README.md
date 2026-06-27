# Mission: Reinforceable

Mission: Reinforceable is currently organized as a static website with the beta game mounted at `/game/`.

## Folder structure

```text
mission-reinforceable/
├── index.html                 # Temporary site landing page
├── research/
│   └── index.html             # Placeholder research route
├── intake/
│   └── index.html             # Placeholder intake route
├── beta/
│   └── index.html             # Placeholder beta route
├── game/
│   ├── index.html             # Existing beta game shell
│   ├── css/styles.css         # Existing game styling
│   ├── js/                    # Existing game systems
│   └── teachers/
│       ├── _template/         # Teacher game template
│       └── olson/             # Beta classroom content
├── assets/
│   ├── game/skin-v2/          # Existing game image assets
│   └── site/                  # Reserved for future website assets
├── docs/mockups/              # Mockup and reference images
├── favicon.png
└── README.md
```

## How to test locally

Because the site uses root-relative links such as `/game/`, test it with a local static server from the repository root.

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
http://localhost:8000/game/
http://localhost:8000/game/?teacher=olson
http://localhost:8000/game/teachers/olson/
http://localhost:8000/research/
http://localhost:8000/intake/
http://localhost:8000/beta/
```

## Game behavior

The existing beta game behavior is intended to remain unchanged. The game still uses:

- browser `localStorage` for local progress
- teacher IDs from `?teacher=...` or `/game/teachers/<teacher-id>/`
- teacher config files under `game/teachers/<teacher-id>/config.js`
- mission files listed in each teacher config
- the optional `resultEndpoint` value for result logging

The current beta classroom can be opened at:

```text
/game/?teacher=olson
```

The teacher redirect route also opens the same game:

```text
/game/teachers/olson/
```

## Adding a teacher game

1. Duplicate `game/teachers/_template`.
2. Rename the copied folder with a simple lowercase ID, such as `teacher-a`.
3. Edit the copied folder's `config.js`.
4. Replace or edit the mission files in that teacher's `content` folder.
5. Open the game with `/game/?teacher=teacher-a`.

## Privacy note

For dissertation/privacy use, keep the repo free of real student names, real teacher names if not appropriate, and identifiable classroom details.
