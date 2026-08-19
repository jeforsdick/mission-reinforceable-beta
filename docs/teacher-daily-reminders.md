# Teacher daily reminders (schedule not active)

The two server-only routes fit the intended Vercel/custom-domain deployment and
are ready for a future Vercel Cron configuration:

- `GET /api/teacher-daily-prompt`
- `GET /api/teacher-followup-reminder`

Both require `Authorization: Bearer $CRON_SECRET`. They ignore browser-supplied
recipient or message data: candidate teacher name/email comes from the active
Supabase participant-to-Auth-profile relationship, and all message fields are
defined server-side.

## Required server environment

- `CRON_SECRET`: shared secret used by Vercel Cron authorization.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase access.
- `RESEND_API_KEY`: server-only Resend credential.
- `TEACHER_REMINDER_FROM_EMAIL`: verified sender address.
- `TEACHER_GAME_URL`: authenticated game URL with no participant, case, alias,
  or email query data.
- `TEACHER_REMINDER_TIMEZONE`: required IANA timezone (for example,
  `America/Denver`). There is intentionally no UTC fallback.

## Eligibility and processing

The candidate RPC requires an enabled setting whose activation time has passed
and whose deactivation time has not passed. The participant, assigned case, and
teacher profile must all be active; the profile must have role `teacher` and a
nonblank email. Follow-ups additionally require `followup_enabled`.

For each study-local date, the daily route claims a unique operational event and
sends the approved daily prompt. The follow-up route first asks the relational
`game_sessions` table whether that participant has a `completed` session whose
completion timestamp falls on the same study-local date. It sends only when no
such completion exists. Google Sheets is not consulted.

The event uniqueness key is `(participant_id, study_date, reminder_type)`. An
atomic database claim skips existing `sent` and `pending` events, while a
`failed` event can be reclaimed with an incremented attempt count. The matching
Resend idempotency key is
`teacher-reminder/{participant_id}/{YYYY-MM-DD}/{reminder_type}`. A provider
failure changes only that event from `pending` to `failed`; a retry reuses the
same provider idempotency key and does not alter participants, cases, content,
or game sessions.

## Explicit intervention activation

No participant, intake, case, protected content, or Auth-account workflow
creates an enabled setting. A research admin deliberately activates one teacher
at intervention onset (replace the UUID):

```sql
insert into public.teacher_reminder_settings
  (participant_id, enabled, followup_enabled, activated_at, deactivated_at)
values
  ('00000000-0000-0000-0000-000000000000', true, false, now(), null)
on conflict (participant_id) do update set
  enabled = true,
  followup_enabled = excluded.followup_enabled,
  activated_at = now(),
  deactivated_at = null;
```

To deactivate that teacher immediately:

```sql
update public.teacher_reminder_settings
set enabled = false, deactivated_at = now()
where participant_id = '00000000-0000-0000-0000-000000000000';
```

Ordinary teachers and coaches have no table privileges or RLS policy that can
perform activation. Use a research-admin session or a controlled service-role
administrative process; never put the service-role key in a browser.

## Future schedule example — **NOT ACTIVE**

No repository cron schedule is configured, so endpoint presence does not make
reminders run automatically. No `vercel.json` cron configuration is committed.
After sender verification and
research-team approval of both hours, the following shape can be added, with
the chosen UTC hours replacing the examples:

```json
{
  "crons": [
    { "path": "/api/teacher-daily-prompt", "schedule": "0 14 * * *" },
    { "path": "/api/teacher-followup-reminder", "schedule": "0 21 * * *" }
  ]
}
```

Those hours are illustrations only, not study decisions. The current project is
on Vercel Hobby, so the eventual design must retain at most one invocation per
day per cron job and Hobby's hourly timing precision. Daylight-saving changes
must be considered when converting the selected study-local hours to Vercel's
UTC cron expressions.
