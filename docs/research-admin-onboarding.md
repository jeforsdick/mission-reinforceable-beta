# Research Admin Onboarding

The private `research-admin/` route supports intake review and operational readiness. Access requires a signed-in Supabase user whose `profiles` row has `role = 'research_admin'` and `active = true`. The browser gate improves usability; the SECURITY DEFINER RPC authorization is the security boundary.

## Authoritative schema and provisioning

The deployed definitions for `public.cases` and `public.participants` have been verified. An approved intake can be prepared through `public.provision_intake_case(uuid, text, text, text, jsonb)`. The function locks and rechecks the intake, resolves exactly one active teacher and coach by submitted email, validates identifiers and reviewed targets, and performs every write in one PostgreSQL transaction.

The canonical migration must be applied manually through the normal Supabase migration process before using the route:

```text
supabase/migrations/20260814020000_research_admin_onboarding.sql
```

The migration begins with defensive assertions for every `intake_requests` column used by onboarding, including `request_id`, `status`, `converted_case_id`, `converted_at`, and `submitted_at`. It fails with a list of missing columns before creating the admin objects. It does not require `intake_requests.created_at`.

## Safeguards

- Approval changes only intake status and writes a minimal audit event. Provisioning is a separate confirmed action.
- Provisioning creates an explicitly inactive case and explicitly inactive, Auth-linked participant, the intake snapshot, reviewed fidelity targets, and primary coach assignment; then it converts the source intake and records a minimal audit event.
- No reminder setting, email, study phase, protected content, game session, or game response is created.
- Account lookup returns only an exact normalized-email profile match and validates the expected teacher/coach role in the client; it never lists Auth users.
- Proposed target keys are regenerated deterministically from final domain and order. Crisis targets are omitted when the intake says no crisis plan applies.
- The interface states that the BIP/BSP is authoritative and labels intake material as practitioner-submitted context.
- Converted readiness is loaded from the real case tables. Protected content returns presence/version/update metadata only.
- Game access and reminders are shown as intentionally off. Activation is outside V1.
