# Teacher daily reminders (production schedule)

## Future study-day status links

The reusable teacher action is **“Excuse me from today.”** It issues only a
`teacher_unavailable` link and does not ask for a reason or note. This helper is
ready for a future daily email template; this feature does not itself send email
or enable production reminders.

Study-day status links are **GET/prefetch safe**: a GET request only serves the
confirmation page and never mutates study-day status. Recording requires the
browser-side POST that the page normally makes after JavaScript runs. This is
not a claim that every automated browser or scanner is prevented from executing
that POST. If the automatic POST fails while JavaScript is available, the page
shows a manual retry button. Without JavaScript, it shows an explanatory message
only.

The dissertation intervention schedules one logical `daily_prompt` on each
eligible intervention study day. `followup_reminder` is not part of the current
dissertation intervention package and is not scheduled. Its
HTTP route is not deployed. Legacy schema support remains dormant for
compatibility, and `followup_enabled` remains disabled by default. The
dissertation uses only `daily_prompt`.

## Production schedule and security

`vercel.json` invokes two thin authenticated routes on weekdays:

- `GET /api/teacher-daily-prompt` at `0 14 * * 1-5` (14:00 UTC).
- `GET /api/teacher-daily-prompt-retry` at `0 15 * * 1-5` (15:00 UTC).

Both thin routes require `Authorization: Bearer $CRON_SECRET` and call the same
daily handler with `reminder_type = daily_prompt`. The retry route is
reliability/retry infrastructure, not a second intervention prompt. Both routes
therefore use the same database identity
`(participant_id, study_date, reminder_type)` and matching Resend idempotency
key, permitting at most one provider delivery for that logical prompt.
These UTC invocations occur in the early weekday morning in America/Denver;
exact Vercel invocation time is operational infrastructure, not a participant
outcome.

Shared reminder and Granite calendar helper modules live under `server/`, not
`api/`. Only intentional HTTP handlers therefore consume Vercel Serverless
Function slots.

The route derives the America/Denver study date and, before candidate lookup or
event claim, applies the Granite base calendar: dates must be weekdays from
2026-08-12 through 2027-05-26 inclusive and must not be one of the holidays or
recess dates mirrored from `game/js/study-calendar.js`. An ineligible invocation
returns HTTP 200 with `eligible_study_day: false` and zero sent, skipped, and
failed counts, without database work.

## Required server environment

- `TEACHER_REMINDER_SYSTEM_ENABLED`: operational kill switch for scheduled
  reminders. Only the exact value `true` enables normal daily processing. When
  missing or set to any other value, an authorized daily or retry invocation
  returns HTTP 200 with zero counts before configuration validation, Supabase
  queries, event creation, or Resend calls. This flag does not gate the smoke
  test endpoint.
- `CRON_SECRET`: shared authorization secret.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase access.
- `RESEND_API_KEY`: server-only Resend credential.
- `TEACHER_REMINDER_FROM_EMAIL`: verified sender address.
- `TEACHER_GAME_URL`: HTTPS authenticated `/game/` URL, with no query string,
  participant, case, alias, teacher email, or QA value.
- `TEACHER_REMINDER_TIMEZONE`: exactly `America/Denver`; there is no fallback.
- `TEACHER_REMINDER_TEST_EMAIL`: server-only smoke-test recipient.

Candidate recipient identity is always database-derived. Cron input cannot
supply a recipient, participant/case identity, or message copy. Service-role and
Resend credentials never enter browser code.

## Eligibility, delivery, and recovery

The candidate RPC requires a deliberately enabled, currently activated reminder
setting. The participant, assigned case, and teacher profile must all be active;
the profile must have role `teacher` and a nonblank email. Intake approval, case
preparation, protected-content loading, phase changes, baseline, and QA Preview
do not create or enable reminder settings. Consequently prepared inactive QA
cases, including CASE-999, are excluded.

The daily copy and subject (`Mission: Reinforceable — Today’s Mission Is Ready`)
are server-defined. Events contain only participant/case relational identifiers,
type/date, provider message ID, operational status, and attempt metadata—not the
recipient address, subject/body, student information, BIP content, game
responses, or scores.

A claim creates one pending event. Sent events are never reclaimed; failed
events may be reclaimed; recent pending events remain exclusive; pending events
older than 30 minutes may be reclaimed. Reclamation keeps the same row and
logical identity, increments `attempt_count`, updates `last_attempt_at`, and
reuses `teacher-reminder/{participant_id}/{YYYY-MM-DD}/daily_prompt` as Resend's
`Idempotency-Key`. This covers a crash before or after Resend receives a send.
If Resend succeeds but the sent-status PATCH fails, the job reports failure,
logs the recovery need, and leaves the pending event available for stale retry.

A Resend failure changes only the operational reminder event to `failed`.
Delivery never marks a mission incomplete, writes a `game_session`, counts a
gameplay dose, or changes participant/case activity, phase, or gameplay.
Mission completion remains independently determined from `game_sessions`.

## Production smoke test

`GET /api/teacher-reminder-smoke-test` requires the cron bearer secret and sends
the exact production daily subject, HTML/text template, sender, and game URL
only to `TEACHER_REMINDER_TEST_EMAIL`. Its fixed smoke-test Resend idempotency key
prevents refresh spam. It does not query participants or Supabase and does not
create reminder events, settings, gameplay data, or activation changes. It
returns only send success/failure and, on success, the provider message ID.
The smoke test remains available while `TEACHER_REMINDER_SYSTEM_ENABLED` is
missing or `false`, so infrastructure can be verified without enabling
automated participant email.

## Launch order

1. Set `TEACHER_REMINDER_SYSTEM_ENABLED=false`.
2. Configure the final custom domain and authenticated teacher game URL.
3. Configure and verify the Resend domain and sender.
4. Configure the remaining production environment variables.
5. Run the smoke-test email endpoint.
6. Verify the received email and its authenticated game link.
7. Set `TEACHER_REMINDER_SYSTEM_ENABLED=true`.
8. Deliberately enable reminder settings only for intervention participants.

## Explicit research-admin activation

Research Admin retains separate Game On/Off and Reminders On/Off concepts. No
automatic workflow enables reminders. A researcher deliberately activates an
individual intervention reminder setting and can disable it again. Existing RLS
allows research admins to manage settings; teachers and coaches cannot. The
repository currently has no dedicated Research Admin UI action that safely
toggles this setting, so this PR does not invent a larger UI workflow.

For controlled SQL operations, enable with `followup_enabled = false` and a
non-null `activated_at`, or disable with `enabled = false` and
`deactivated_at = now()`. Never place the service-role key in browser code.

## Remaining boundaries

This base-calendar gate does not implement participant-specific teacher absence,
approved contextual exclusion, or other not-available overrides; those remain a
separate task. Weekly email/report automation is also a separate task and is not
scheduled here.
