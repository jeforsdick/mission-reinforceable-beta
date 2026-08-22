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
| `public.is_research_admin()` | security helper | `20260813000000_dissertation_schema_foundation.sql` | Yes, before policies and later RPC callers | COMPLETE |
| `public.set_updated_at()` | trigger function | `20260813000000_dissertation_schema_foundation.sql` | Yes, immediately before triggers | COMPLETE |

The missing legacy shapes were recovered conservatively from application queries, onboarding assertions and inserts, later foreign keys, intake payload construction, and `research/supabase/001_protected_game_content.sql`. The bootstrap creates schema and access controls only; it creates no cases, users, participants, content, or study data. Its `IF NOT EXISTS` guards support the expected all-objects-present legacy deployment, while the onboarding migration retains detailed contract assertions. Existing environments must still be compared to this canonical shape rather than treating a no-op guard as validation.

## B. Manual fixes and drift

| Item | Evidence / classification | Canonical result |
|---|---|---|
| Legacy foundations lived outside migrations | Repository-proven: the former first migration references four absent tables; protected content had only historical SQL. | `20260812000000_legacy_schema_bootstrap.sql` now creates all four. |
| `research_admin_update_intake` iterator name `key` | Repository-proven ambiguity risk: the historical function declares `key text` and also aliases `jsonb_object_keys` as `keys(key)`. Known as a manual production repair, but live state requires verification. | Additive `CREATE OR REPLACE FUNCTION` uses `field_key` and qualified `supplied.field_name`; authorization and update behavior are unchanged. |
| `case_intake_submission_complete` | Known historical/manual issue; the constraint is not created by the repository, so its presence live cannot be proven here. It conflicts with later nullable optional strategy fields if present. | Additive repair drops that specifically named obsolete constraint if present. No replacement is added. |
| Other live policies, grants, triggers, functions, or constraints | Cannot be inferred from repository history. | Requires live catalog comparison. |

Before production deployment, query `pg_class`, `pg_attribute`, `pg_constraint`, `pg_policy`, `pg_proc`, and `information_schema.role_table_grants`; compare results with a clean replay. In particular verify all four legacy table shapes, the obsolete constraint's presence/absence, the RPC definition, and whether manually named policies duplicate canonical policies.

## C. Fresh database order

1. **Foundational schema:** legacy bootstrap (`cases`, `participants`, public intake, protected content and minimum RLS).
2. **Dissertation schema:** profiles, coaching/intake snapshots, fidelity targets, relational gameplay telemetry, and security helpers.
3. **Reminders and onboarding:** target keys, reminder tables/RPCs, intake IDs, onboarding, and intake cleanup.
4. **QA and signoffs:** published preview, daily mission lock, protected-content signoffs.
5. **Research operations:** weekly check-ins, comparability, procedural fidelity, operations, observations, and IOA summaries/cleanup.
6. **Telemetry:** resource-usage events and stale-reminder recovery.
7. **Game authoring:** intake editing, draft revisions, and draft/full-draft QA preview.
8. **Drift repair:** append-only canonical intake RPC and obsolete-constraint repair.

## Security findings

RLS is enabled for all bootstrap tables. Browser roles receive only public intake insert and authenticated assignment/content reads. Public intake has no browser read, update, or delete grant. Participant reads require `auth.uid()`, an active participant, and (for cases) an active case. Protected content retains the historical active-assignment rule. The repaired RPC remains `SECURITY DEFINER`, uses an empty search path and qualified objects, checks `is_research_admin()` first, revokes PUBLIC execution, and grants execution only to authenticated users. No coach, participant, publishing, telemetry, scoring, phase, observation, or study logic is changed.

## Replay verification

This environment did not have the Supabase CLI, PostgreSQL client, or Docker, so a true clean database replay was **not** executed. Static order/security tests are in `scripts/supabase-migration-order.test.mjs`.

Run the definitive local proof in an environment with Docker and the Supabase CLI:

```sh
supabase start
supabase db reset
node --test scripts/supabase-migration-order.test.mjs
```

`supabase db reset` must complete from an empty local database with every migration applied in filename order. Do not apply the bootstrap directly to production as part of this audit; first compare the live catalog and test the complete chain in an isolated project.
