# Research Admin Onboarding

The private `research-admin/` route supports intake review and operational readiness. Access requires a signed-in Supabase user whose `profiles` row has `role = 'research_admin'` and `active = true`. The browser gate improves usability; the SECURITY DEFINER RPC authorization is the security boundary.

## Schema audit and V1 boundary

The repository migrations reference legacy `public.participants` and `public.cases`, but do not create or document their complete definitions. Known references prove `participants.id`, `participants.case_id`, `participants.auth_user_id`, `participants.active`, `cases.id`, and `cases.active`; they do **not** prove all required insert columns, defaults, or constraints. Consequently, this change does not guess inserts and does not provide a Provision Case RPC. Review, approval/decline, exact-email account readiness, proposed-target editing, and explicit blocked readiness are available.

The canonical migration must be applied manually through the normal Supabase migration process before using the route:

```text
supabase/migrations/20260814020000_research_admin_onboarding.sql
```

The migration assumes the deployed public-intake table has the application-established `request_id`, `status`, `created_at`, and `submitted_at` columns and the four documented statuses (`submitted`, `approved`, `converted`, `declined`). Confirm the deployed schema before applying it because the repository does not contain the original `intake_requests` DDL.

## Safeguards

- Approval changes only intake status and writes a minimal audit event.
- No case, participant, reminder setting, email, study phase, protected content, or game session is created.
- Account lookup returns only an exact normalized-email profile match and validates the expected teacher/coach role in the client; it never lists Auth users.
- Proposed target keys are regenerated deterministically from final domain and order. Crisis targets are omitted when the intake says no crisis plan applies.
- The interface states that the BIP/BSP is authoritative and labels intake material as practitioner-submitted context.
- Game access and reminders are shown as intentionally off. Activation is outside V1.
