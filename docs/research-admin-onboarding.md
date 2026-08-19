# Research Admin Onboarding

The private `research-admin/` route supports intake review and operational readiness. Access requires a signed-in Supabase user whose `profiles` row has `role = 'research_admin'` and `active = true`. The browser gate improves usability; the SECURITY DEFINER RPC authorization is the security boundary.

## Authoritative schema and provisioning

The deployed definitions for `public.cases` and `public.participants` have been verified. An approved intake can be prepared through `public.provision_intake_case(uuid, text, text, text, jsonb)`. The function locks and rechecks the intake, resolves exactly one active teacher and coach by submitted email, validates identifiers and reviewed targets, and performs every write in one PostgreSQL transaction.

The canonical migration must be applied manually through the normal Supabase migration process before using the route:

```text
supabase/migrations/20260814020000_research_admin_onboarding.sql
```

The migration begins with defensive assertions for every `intake_requests` column used by onboarding, including `request_id`, `status`, `converted_case_id`, `converted_at`, and `submitted_at`. It also verifies the required legacy `cases` and `participants` columns, unique identifiers, Auth/case foreign keys, and `case_intake.status`. It fails clearly before creating the admin objects if the deployed contract is incomplete and does not require `intake_requests.created_at`.

## Safeguards

- Approval changes only intake status and writes a minimal audit event. Provisioning is a separate confirmed action.
- Provisioning creates an explicitly inactive case and explicitly inactive, Auth-linked participant, a finalized `case_intake` snapshot with `status = 'submitted'`, reviewed fidelity targets, and primary coach assignment; then it converts the source intake and records a minimal audit event.
- No reminder setting, email, study phase, protected content, game session, or game response is created.
- Account lookup returns only an exact normalized-email profile match and validates the expected teacher/coach role in the client; it never lists Auth users.
- Proposed target keys are regenerated deterministically from final domain and order. Crisis targets are omitted when the intake says no crisis plan applies.
- The interface states that the BIP/BSP is authoritative and labels intake material as practitioner-submitted context.
- Converted readiness is loaded from the real case tables. Protected content returns presence/version/update metadata only.
- Game access and reminders are shown as intentionally off. Activation is outside V1.

## Dissertation command center — operations foundation

The home route now separates a deidentified **Study Overview** from the existing **Intake Queue**. Converted cases open a command-center view for protocol setup and checklist history, explicit phase history, measure administration status, operational tasks, coaching-as-usual context, study events, readiness summaries, and an aggregated timeline. Existing protected-content, Resource Map, QA Preview, and MR Procedural Fidelity panels remain authoritative and are not duplicated.

Apply `supabase/migrations/20260818060000_research_operations_foundation.sql` through the normal Supabase migration workflow after the June 29 Weekly Teacher Report migration. This additive migration is not applied automatically by the web deployment. No data backfill is required: a case without a phase event is displayed as `prebaseline`, and the researcher deliberately assigns its protocol plan and records all statuses.

All new tables have RLS enabled, deny anonymous/direct authenticated writes, permit reads only through the research-admin policy, and expose writes through research-admin-authorized `SECURITY DEFINER` RPCs with an empty search path. Phase RPCs never update case/participant activity or reminders. Baseline is rejected with a list of missing checklist, assent, stagger-plan, and TSES Pre prerequisites; satisfying them never starts baseline automatically.
