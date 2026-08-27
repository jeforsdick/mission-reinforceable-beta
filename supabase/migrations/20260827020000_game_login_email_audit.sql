-- Append-only, token-free audit for the independently initiated game-login email.
alter table public.research_intervention_launch_events
  drop constraint research_intervention_launch_events_action_check,
  add constraint research_intervention_launch_events_action_check check (action in (
    'game_access_enabled','game_access_disabled','reminders_enabled','reminders_disabled',
    'game_login_email_attempted','game_login_email_sent','game_login_email_failed'
  )),
  add column attempt_id uuid,
  add column provider_message_id text,
  add column failure_classification text;

alter table public.research_intervention_launch_events add constraint game_login_email_audit_shape check (
  (action not like 'game_login_email_%' and attempt_id is null and provider_message_id is null and failure_classification is null)
  or
  (action like 'game_login_email_%' and attempt_id is not null
    and (action='game_login_email_sent')=(provider_message_id is not null)
    and (action='game_login_email_failed')=(failure_classification is not null))
);

create unique index research_launch_email_attempt_action_idx
on public.research_intervention_launch_events(attempt_id, action)
where attempt_id is not null;

comment on column public.research_intervention_launch_events.attempt_id is 'Opaque UUID associating the append-only rows for one deliberate email attempt; never an Auth token.';
comment on column public.research_intervention_launch_events.provider_message_id is 'Resend message identifier, populated only for a successful delivery request.';
comment on column public.research_intervention_launch_events.failure_classification is 'Safe operational failure category; excludes provider response bodies and message content.';
