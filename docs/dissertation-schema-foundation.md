# Dissertation schema foundation

This change adds the database foundation for intake, fidelity, coaching, and
future relational game telemetry. It does not connect any UI or gameplay code.

## Existing schema assumptions

Repository inspection found the existing protected-content setup in
`research/supabase/001_protected_game_content.sql` and its seed in
`research/supabase/003_seed_demo2_full_protected.sql`. The application currently
loads an active `participants` row by `auth_user_id`, its active `cases` row by
`participants.case_id`, and then `case_game_content` by case ID. The migration
therefore assumes:

- `public.participants.id` and `public.participants.case_id` are UUIDs;
- `public.participants.auth_user_id` is comparable to `auth.uid()`;
- `public.participants.active` is boolean;
- `public.cases.id` is UUID and `public.cases.active` is boolean; and
- `public.case_game_content.case_id` references `public.cases.id`.

The repository does not contain the original definitions or migrations for
`participants` and `cases`. Their production structure was not recreated or
altered. The existing `case_game_content` table and participant SELECT policy
are also preserved. Two additive SELECT policies are added to existing tables:
assigned coaches and research admins may read `cases`, and research admins may
read `case_game_content`.

Because no standard Supabase migration directory existed, the additive migration
is under `supabase/migrations/`. The older SQL setup and seed files remain in
`research/supabase/` unchanged.

## New tables and relationships

- `profiles`: one application identity record whose ID references
  `auth.users.id`. Roles are `teacher`, `coach`, or `research_admin`.
- `case_coaches`: admin-managed many-to-many links from coach profiles to cases.
  A coach/case pair is unique, and at most one active assignment per case may be
  marked primary.
- `case_intake`: one V1 intake per case. It contains the explicitly permitted
  teacher, coach, and student-initial fields but no student full name, student
  ID, diagnosis, disability, parent, medication, or school fields. A nonblank
  crisis plan is required only when `has_crisis_plan` is true.
- `fidelity_targets`: multiple atomic targets per case in the five supported
  domains.
- `game_sessions`: one future mission attempt linked to both participant and
  case. `participant_id` is the relational source of truth; `participant_code`
  is intentionally not duplicated here and can be joined from `participants`
  for authorized research exports or displays.
- `game_responses`: one future decision linked to session, participant, case,
  and optionally a fidelity target. Composite foreign keys ensure all supplied
  relational IDs belong to the same participant/case context. When a
  `fidelity_target_id` is supplied, the referenced target must match both the
  response's case and `fidelity_domain`.

`updated_at` triggers maintain timestamps for the three mutable tables that have
that column. No gameplay logging is connected to the new telemetry tables yet.

## Access model

RLS is enabled on every new table, anonymous privileges are revoked, and helper
functions use `SECURITY DEFINER` with an empty `search_path` and fully qualified
object names.

- **Teacher/participant:** does not directly read the raw `case_intake` table.
  Teachers may read fidelity targets for their active assigned case and may
  create/read/update sessions and create/read responses only when `auth.uid()`
  owns the active participant/case pair. Response inserts must also match their
  session's participant and case.
- **Coach:** can read only their own active assignment rows and may read intake,
  fidelity targets, sessions, responses, and the case for active assigned cases.
  Coach access is read-only.
- **Research admin:** an active profile with the `research_admin` role can manage
  the six new tables and read existing cases/protected content.
- **Profiles and assignments:** ordinary users may read their own profile but
  cannot insert, update, or delete it. Only a research admin can assign roles or
  case coaches, so users cannot promote themselves or self-assign cases.

The service role continues to bypass RLS for trusted administration. Application
role assignment should be performed only through the Supabase Dashboard, a
trusted server, or another service-role-controlled process.

## Data integrity

`game_responses` uses composite relational constraints to prevent a response
from mixing a session, participant, case, or fidelity target from different
contexts. The fidelity-target relationship additionally includes the target's
domain, so a response cannot reference a teaching target while labeling the
same decision as reinforcement. If `fidelity_target_id` is present,
`fidelity_domain` must also be present.

## Indexes

Indexes cover coach lookups, case fidelity targets, session participant/case/time
queries, and response session/participant/case/target/domain queries. The unique
assignment indexes additionally support case/coach integrity.

## Safe application

The migration has only been added to this repository; it has not been applied to
any Supabase project.

Before applying it, confirm the five assumptions above against the target
project. Then back up the database and apply
`supabase/migrations/20260813000000_dissertation_schema_foundation.sql` to a
staging Supabase project first (with the Supabase CLI migration workflow or SQL
Editor). Test teacher, coach, and research-admin accounts before applying the
same migration to production. Create profiles and case-coach assignments through
the Dashboard/service role; no automatic Auth-to-profile trigger is included.
