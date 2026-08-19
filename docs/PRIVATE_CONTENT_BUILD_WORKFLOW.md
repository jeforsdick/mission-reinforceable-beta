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
resource-content and structural validation
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

Research Admin QA Preview can render generated content for review, but preview
activity is QA-only, does not count as study data, and does not activate
participant access. Authenticated `/game/` loads approved protected content from
Supabase; public `/demo/` and `/demo-game/` use fictional sample content.

## External directory contract

Use this private executable authoring contract; it is build input only and is never served by participant runtime:

```text
/srv/approved-private-content/CASE-EXAMPLE-001/
  config.js
  fidelity-targets.expected.json
  content/
    resources.js
    daily-mission-1.js
```

`config.js` sets `window.MR_TEACHER_CONFIG.missionFiles` and `resourcesFile`. Files execute in the existing Node VM sandbox. The generated config removes those executable-file fields and `resultEndpoint`, sets `contentSource` to `supabase-protected`, and does not require a public folder identifier.

For dissertation participant builds, `config.js` must also contain a protected, case-specific `weeklyTeacherReport` object with substantive `targetBehavior`, `replacementBehavior`, and `targetRoutine` strings. Use only approved aliases and minimum-necessary descriptions, never a student full name. These labels remain inside the existing protected `case_game_content.config` payload. Fictional demos and legacy QA content may omit them and receive generic runtime wording.

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
  --content-mode participant \
  --json-output /srv/approved-private-content/CASE-EXAMPLE-001/protected-content.json \
  --review-manifest /srv/approved-private-content/CASE-EXAMPLE-001/review-manifest.json

node scripts/build-protected-seed.js \
  --source-dir /srv/approved-private-content/CASE-EXAMPLE-001 \
  --case-code CASE-EXAMPLE-001 \
  --version 1 \
  --content-mode participant \
  --output /srv/approved-private-content/CASE-EXAMPLE-001/protected-seed.sql
```

The modern flag-based builder requires `--version` with a positive integer content-bank version. Generated SQL stores that version and updates it from `excluded.version` when a case already exists. Before any JSON, SQL, or manifest is written, the builder runs mission structural validation and dedicated Resource Map validation. JSON output retains the exact keys consumed by `MR.loadProtectedGameContent()`: `config`, `resources`, `daily_missions`, `wildcard_missions`, and `crisis_missions`; resources remain in the existing `payload.resources` / `case_game_content.resources` field.

Modern builds default to `--content-mode participant`. In participant mode, both source and generated output paths inside the public repository are hard failures. Only wholly fictional public fixtures may use `--content-mode demo`; this mode warns when its source is in the repository. Never relabel participant material as demo. The optional review manifest contains case code, protected content version, Resource Map schema version, a SHA-256 resource digest, validator version/counts, and build time—never behavioral resource text.

## Resource Map schema version 1

`window.MR_RESOURCES` is data only: `{ schemaVersion: 1, studentAlias: "Alias", sections: { ... } }`. `studentAlias` must exactly equal the configured alias when the builder supplies one. All nine keys and titles are mandatory:

| Key | Exact title |
| --- | --- |
| `bip` | BIP at a Glance |
| `functionForest` | Function Forest |
| `prevention` | Prevention Palace |
| `replacement` | Replacement Reservoir |
| `reinforcement` | Reinforcement Ridge |
| `errorCorrection` | Error Correction Canyon |
| `library` | BSP Library |
| `coaching` | Coaching Cottage |
| `fidelity` | Fidelity Fortress |

Every section has its exact `title` and a non-empty `blocks` array. The only blocks are:

- `{ "type": "paragraph", "text": "..." }`
- `{ "type": "list", "items": ["..."] }`
- `{ "type": "definitionList", "items": [{ "term": "...", "definition": "..." }] }`
- `{ "type": "callout", "label": "...", "text": "..." }`

Raw HTML, scripts, event handlers, arbitrary executable fields, URLs-as-fields, and file/path fields are forbidden. The validator also identifies high-confidence email, phone, URL, and obvious full-date patterns. Those privacy findings aid review; **automated scanning does not certify privacy**. The researcher must complete final behavioral accuracy, minimum-necessary-content, and privacy review before applying an artifact.

## Structural validator behavior

For every mission, the validator checks unique mission IDs, a resolvable start, resolvable `next` references, loop-free play-throughs, exactly `expectedSteps` decisions on every route, exactly three choices per decision, and the score set `10`, `5`, and `0`. It also validates the fidelity target key format and restricts narrative ending keys to `STRONG`, `MIXED`, or `FRAGILE`, on terminal choices, with a corresponding entry in `mission.endings`.

Structural validation cannot decide whether a particular decision is behaviorally linked to the correct fidelity target. Exact target linkage remains mandatory human researcher review. Fidelity coverage warnings likewise support review rather than replacing it.
