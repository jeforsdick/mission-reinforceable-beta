-- Participant-ready local reminder timing. The 08:00 default preserves the
-- existing early-morning Denver delivery for already-configured participants.
alter table public.teacher_reminder_settings
add column preferred_reminder_time time not null default time '08:00';

alter table public.teacher_reminder_settings
add constraint teacher_reminder_time_minute_precision
check (date_trunc('minute', preferred_reminder_time) = preferred_reminder_time);

drop function public.eligible_teacher_reminders(boolean);
create function public.eligible_teacher_reminders(require_followup boolean default false)
returns table (participant_id uuid, case_id uuid, teacher_name text, teacher_email text, preferred_reminder_time time)
language sql stable security definer set search_path = '' as $$
select p.id, p.case_id, pr.display_name, pr.email, trs.preferred_reminder_time
from public.teacher_reminder_settings trs
join public.participants p on p.id = trs.participant_id
join public.cases c on c.id = p.case_id
join public.profiles pr on pr.id = p.auth_user_id
where trs.enabled
and trs.activated_at is not null and trs.activated_at <= now()
and (trs.deactivated_at is null or trs.deactivated_at > now())
and (not require_followup or trs.followup_enabled)
and p.active and c.active and pr.active and pr.role = 'teacher'
and nullif(btrim(pr.email), '') is not null;
$$;

revoke all on function public.eligible_teacher_reminders(boolean) from public;
revoke execute on function public.eligible_teacher_reminders(boolean) from anon, authenticated;
grant execute on function public.eligible_teacher_reminders(boolean) to service_role;

create or replace function public.has_completed_mission_on_study_date(
target_participant_id uuid, target_study_date date, study_timezone text
)
returns boolean language sql stable security definer set search_path = '' as $$
select exists (
  select 1 from public.game_sessions gs
  join public.participants p on p.id = gs.participant_id and p.case_id = gs.case_id
  where gs.participant_id = target_participant_id
  and gs.status = 'completed' and gs.qa_mode = false
  and (coalesce(gs.ended_at, gs.started_at) at time zone study_timezone)::date = target_study_date
);
$$;

revoke all on function public.has_completed_mission_on_study_date(uuid, date, text) from public;
revoke execute on function public.has_completed_mission_on_study_date(uuid, date, text) from anon, authenticated;
grant execute on function public.has_completed_mission_on_study_date(uuid, date, text) to service_role;

-- Normal evaluations may only create a new daily claim. Only the dedicated
-- retry invocation may reclaim failed or stale-pending claims.
create or replace function public.claim_teacher_reminder_event(
target_participant_id uuid, target_case_id uuid, target_reminder_type text,
target_study_date date, retry_only boolean default false
)
returns table (event_id uuid, claimed boolean)
language sql volatile security definer set search_path = '' as $$
with claimed_event as (
insert into public.teacher_reminder_events as existing
(participant_id, case_id, reminder_type, study_date, status)
select target_participant_id, target_case_id, target_reminder_type, target_study_date, 'pending'
where not retry_only or exists (
  select 1 from public.teacher_reminder_events e
  where e.participant_id = target_participant_id and e.study_date = target_study_date
  and e.reminder_type = target_reminder_type
  and (e.status = 'failed' or (e.status = 'pending' and e.last_attempt_at <= now() - interval '30 minutes'))
)
on conflict (participant_id, study_date, reminder_type) do update
set status = 'pending', case_id = excluded.case_id, provider_message_id = null,
attempt_count = existing.attempt_count + 1, last_attempt_at = now(), updated_at = now()
where retry_only and (existing.status = 'failed'
  or (existing.status = 'pending' and existing.last_attempt_at <= now() - interval '30 minutes'))
returning id
)
select ce.id, true from claimed_event ce
union all
select existing.id, false from public.teacher_reminder_events existing
where existing.participant_id = target_participant_id
and existing.study_date = target_study_date and existing.reminder_type = target_reminder_type
and not exists (select 1 from claimed_event);
$$;

revoke all on function public.claim_teacher_reminder_event(uuid, uuid, text, date, boolean) from public;
revoke execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date, boolean) from anon, authenticated;
grant execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date, boolean) to service_role;

comment on column public.teacher_reminder_settings.preferred_reminder_time is
'Participant preferred daily reminder wall-clock time, interpreted only in America/Denver.';
