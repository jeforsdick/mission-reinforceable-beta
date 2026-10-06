-- Teacher onboarding audit: allow audited pre-launch password setup without
-- granting Mission: Reinforceable access or starting Intervention.

alter table public.research_intervention_launch_events
  drop constraint if exists research_intervention_launch_events_action_check,
  drop constraint if exists game_login_email_audit_shape;

alter table public.research_intervention_launch_events
  add constraint research_intervention_launch_events_action_check check (
    action = any(array[
      'game_access_enabled','game_access_disabled',
      'reminders_enabled','reminders_disabled',
      'game_login_email_attempted','game_login_email_sent','game_login_email_failed',
      'account_setup_email_attempted','account_setup_email_sent','account_setup_email_failed'
    ])
  ),
  add constraint intervention_email_audit_shape check (
    (
      action !~~ 'game_login_email_%'
      and action !~~ 'account_setup_email_%'
      and attempt_id is null
      and provider_message_id is null
      and failure_classification is null
    )
    or (
      (action ~~ 'game_login_email_%' or action ~~ 'account_setup_email_%')
      and attempt_id is not null
      and (
        action in ('game_login_email_sent','account_setup_email_sent')
      ) = (provider_message_id is not null)
      and (
        action in ('game_login_email_failed','account_setup_email_failed')
      ) = (failure_classification is not null)
    )
  );

comment on table public.research_intervention_launch_events is
  'Append-only audit of intervention access/reminders plus deliberate pre-launch account-setup and intervention login email attempts.';
