# Private Content Build Workflow

The public GitHub repository contains the engine and generic tools. **Real participant individualized content never belongs in Git history.** Author and retain that material in access-controlled storage outside the repository. The optional `.private-cases/` and `private-cases/` local workspace names are gitignored as a defense in depth, not as a substitute for approved storage and handling practices.

## Dissertation workflow

```text
BIP/intake
  ↓
researcher-approved authoring draft
  ↓
private external executable content directory
  ↓
structural validation
  ↓
fidelity coverage validation
  ↓
protected JSON / SQL
  ↓
researcher review
  ↓
Supabase case_game_content
```

The tools in this repository stop at local file generation. They do not connect to Supabase, write `case_game_content`, activate cases, create participant records, send email, or enable reminders. Applying a reviewed SQL artifact is a separate, authorized researcher operation.

## External directory contract

Use the same executable contract as a public fictional teacher folder:

```text
/srv/approved-private-content/CASE-EXAMPLE-001/
  config.js
  fidelity-targets.expected.json
  content/
    resources.js
    daily-mission-1.js
```

`config.js` sets `window.MR_TEACHER_CONFIG.missionFiles` and `resourcesFile`. Files execute in the existing Node VM sandbox. The generated config removes those executable-file fields, sets `contentSource` to `supabase-protected`, and does not require `game_folder`.

**Participant-facing choices are shuffled at display time. Authoring order must never be relied upon.** The protected-content build pipeline always normalizes `shuffleChoices` to `true`, even when a private source config omits it or sets it to `false`. This is a participant-safety invariant, not an authoring preference. Any exceptional fixed-order inspection must be confined to a clearly documented, non-participant QA tool; participant payloads and participant runtime do not provide an opt-out.

## Validate and build

The following commands use fake paths and IDs only:

```bash
node scripts/structural-content-validator.js /srv/approved-private-content/CASE-EXAMPLE-001

node scripts/fidelity-coverage-validator.js \
  /srv/approved-private-content/CASE-EXAMPLE-001 \
  /srv/approved-private-content/CASE-EXAMPLE-001/fidelity-targets.expected.json

node scripts/build-protected-seed.js \
  --source-dir /srv/approved-private-content/CASE-EXAMPLE-001 \
  --case-code CASE-EXAMPLE-001 \
  --version 1 \
  --json-output /srv/approved-private-content/CASE-EXAMPLE-001/protected-content.json

node scripts/build-protected-seed.js \
  --source-dir /srv/approved-private-content/CASE-EXAMPLE-001 \
  --case-code CASE-EXAMPLE-001 \
  --version 1 \
  --output /srv/approved-private-content/CASE-EXAMPLE-001/protected-seed.sql
```

The modern flag-based builder requires `--version` with a positive integer content-bank version. Generated SQL stores that version and updates it from `excluded.version` when a case already exists. The builder always runs structural validation before writing. It warns—but does not block—when the source is inside the Git working tree, so fictional/demo content remains usable. JSON output has the exact keys consumed by `MR.loadProtectedGameContent()`: `config`, `resources`, `daily_missions`, `wildcard_missions`, and `crisis_missions`.

## Structural validator behavior

For every mission, the validator checks unique mission IDs, a resolvable start, resolvable `next` references, loop-free play-throughs, exactly `expectedSteps` decisions on every route, exactly three choices per decision, and the score set `10`, `5`, and `0`. It also validates the fidelity target key format and restricts narrative ending keys to `STRONG`, `MIXED`, or `FRAGILE`, on terminal choices, with a corresponding entry in `mission.endings`.

Structural validation cannot decide whether a particular decision is behaviorally linked to the correct fidelity target. Exact target linkage remains mandatory human researcher review. Fidelity coverage warnings likewise support review rather than replacing it.
