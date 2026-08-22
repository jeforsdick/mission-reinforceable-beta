# Supabase migration reproducibility audit

Audit date: 2026-08-22. Scope: every SQL file in `supabase/migrations`, sorted by filename. This is a repository audit, not an assertion about the live Supabase project.

## A. Foundational objects

| Object | Type | First migration that assumes it | Created by repository before audit? | Current status |
|---|---|---|---|---|
| `auth.users` / `auth.uid()` | Supabase platform table/function | `20260812000000_legacy_schema_bootstrap.sql` | Supabase-managed, not application-created | COMPLETE (platform contract) |
| `public.cases` | table | `20260813000000_dissertation_schema_foundation.sql` | No | COMPLETE via bootstrap |
| `public.participants` | table | `20260813000000_dissertation_schema_foundation.sql` | No | COMPLETE via bootstrap |
| `public.case_game_content` | table and participant policy | `20260813000000_dissertation_schema_foundation.sql` | Only historical `research/supabase/001_protected_game_content.sql`, outside the chain | COMPLETE via bootstrap; MANUAL HISTORY remains |
| `public.intake_requests` | table | `20260814015000_intake_request_ids.sql` | No | COMPLETE via bootstrap |
| `public.profiles` | table | `20260813000000_dissertation_schema_foundation.sql` | Yes, in that migration before references | COMPLETE |
| `public.case_intake.status` | column and value contract | `20260814020000_research_admin_onboarding.sql` | No: the foundation created `case_intake` without it | COMPLETE via pre-onboarding additive migration |
| `public.is_research_admin()` | security helper | `20260813000000_dissertation_schema_foundation.sql` | Yes, before policies and later RPC callers | COMPLETE |
| `public.set_updated_at()` | trigger function | `20260813000000_dissertation_schema_foundation.sql` | Yes, immediately before triggers | COMPLETE |

The missing legacy shapes were recovered conservatively from application queries, onboarding assertions and inserts, later foreign keys, intake payload construction, historical workflow documentation/tests, and `research/supabase/001_protected_game_content.sql`. The recovered legacy `cases.active` and `participants.active` columns default to `true`; dissertation provisioning continues to write `false` explicitly for both, so this restoration activates nothing. The recovered `case_intake.status` contract is `text not null default 'draft'` with allowed values `draft` and `submitted`; onboarding explicitly finalizes its snapshot as `submitted`.

The bootstrap creates schema and access controls only; it creates no cases, users, participants, content, or study data. It is **fresh-database-only as a migration operation**. Although table creation has `IF NOT EXISTS` guards, policy creation is intentionally not broadly guarded and the migration does not validate an existing table's complete shape. It must not be executed blindly against the existing dissertation database.

## B. Manual fixes and drift

| Item | Evidence / classification | Canonical result |
|---|---|---|
| Legacy foundations lived outside migrations | Repository-proven: the former first migration references four absent tables; protected content had only historical SQL. | `20260812000000_legacy_schema_bootstrap.sql` now creates all four. |
| `case_intake.status` was referenced before canonical creation | Repository-proven: onboarding asserts the column and inserts `submitted`, while the foundation omitted it. Historical draft/submitted workflow evidence establishes its contract. | `20260813010000_case_intake_legacy_contract.sql` adds the column and check before onboarding. |
| `research_admin_update_intake` iterator name `key` | Repository-proven ambiguity risk: the historical function declares `key text` and also aliases `jsonb_object_keys` as `keys(key)`. Known as a manual production repair, but live state requires verification. | Additive `CREATE OR REPLACE FUNCTION` uses `field_key` and qualified `supplied.field_name`; authorization and update behavior are unchanged. |
| `case_intake_submission_complete` | Known historical/manual issue; the constraint is not created by the repository, so its presence live cannot be proven here. It conflicts with later nullable optional strategy fields if present. | Additive repair drops that specifically named obsolete constraint if present. No replacement is added. |
| Other live policies, grants, triggers, functions, or constraints | Cannot be inferred from repository history. | Requires live catalog comparison. |

Before production deployment, query `pg_class`, `pg_attribute`, `pg_constraint`, `pg_policy`, `pg_proc`, and `information_schema.role_table_grants`; compare results with a clean replay. In particular verify all four legacy table shapes, the obsolete constraint's presence/absence, the RPC definition, and whether manually named policies duplicate canonical policies.

## C. Fresh database order

1. **Foundational schema:** fresh-only legacy bootstrap (`cases`, `participants`, public intake, protected content and minimum RLS).
2. **Dissertation schema:** profiles, coaching/intake snapshots, fidelity targets, relational gameplay telemetry, security helpers, then the legacy `case_intake.status` contract.
3. **Reminders and onboarding:** target keys, reminder tables/RPCs, intake IDs, onboarding, and intake cleanup.
4. **QA and signoffs:** published preview, daily mission lock, protected-content signoffs.
5. **Research operations:** weekly check-ins, comparability, procedural fidelity, operations, observations, and IOA summaries/cleanup.
6. **Telemetry:** resource-usage events and stale-reminder recovery.
7. **Game authoring:** intake editing, draft revisions, and draft/full-draft QA preview.
8. **Drift repair:** append-only canonical intake RPC and obsolete-constraint repair.

## Security findings

RLS is enabled for all bootstrap tables. Browser roles receive only public intake insert and authenticated assignment/content reads. Public intake has no browser read, update, or delete grant. Participant reads require `auth.uid()`, an active participant, and (for cases) an active case. Protected content retains the historical active-assignment rule. The repaired RPC remains `SECURITY DEFINER`, uses an empty search path and qualified objects, checks `is_research_admin()` first, revokes PUBLIC execution, and grants execution only to authenticated users. No coach, participant, publishing, telemetry, scoring, phase, observation, or study logic is changed.

## Fresh versus existing databases

For a **fresh database**, begin with `20260812000000_legacy_schema_bootstrap.sql` and apply every migration in filename order.

For the **existing dissertation database**, do not blindly run the newly recorded historical bootstrap. First complete a clean isolated replay, compare the live catalog with that canonical result, deliberately reconcile migration history so already-represented foundations are recognized, and only then apply genuinely new additive repairs that the catalog comparison shows are appropriate. This PR does not connect to or apply SQL to live Supabase.

## Replay verification

**STATIC REPLAY AUDIT: passed.** The order/security test verifies foundational tables, every column named by onboarding's defensive assertions, required uniqueness and foreign-key contracts, legacy active defaults, explicit inactive dissertation provisioning, the intake lifecycle contract, and repair-function audit vocabulary.

**TRUE DATABASE REPLAY: pending.** This environment did not have the Supabase CLI, PostgreSQL client, or Docker, so a true clean database replay was **not** executed.

Run the definitive local proof in an environment with Docker and the Supabase CLI:

```sh
supabase start
supabase db reset
node --test scripts/supabase-migration-order.test.mjs
```

`supabase db reset` must complete from an empty local database with every migration applied in filename order. The commands above are the repository's existing local strategy, not instructions for reconciling production migration history.
