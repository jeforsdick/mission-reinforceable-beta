-- Exact daily-mission completion and retry-only reminder recovery.
-- America/Denver remains authoritative for study dates; scheduling is configured in Vercel.

-- Completion means the exact Daily mission that the participant runtime selects:
-- YYYYMMDD modulo the current published Daily mission count.
drop function public.has_completed_mission_on_study_date(uuid, date, text);
create function public.has_completed_mission_on_study_date(
  target_participant_id uuid,
  target_case_id uuid,
  target_study_date date,
  study_timezone text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
select exists (
  select 1
  from public.game_sessions gs
  join public.case_game_content content on content.case_id = target_case_id
  where gs.participant_id = target_participant_id
  and gs.case_id = target_case_id
  and gs.status = 'completed'
  and gs.qa_mode = false
  and gs.mode = 'daily'
  and gs.game_content_version = content.version
  and gs.mission_id = content.daily_missions ->
      (((replace(target_study_date::text, '-', ''))::bigint % jsonb_array_length(content.daily_missions))::integer) ->> 'id'
  and (gs.ended_at at time zone study_timezone)::date = target_study_date
);
$$;

-- Normal runs may only create a new logical send. Retry runs may only reclaim
-- an existing failed or stale-pending send; they can never originate a send.
drop function public.claim_teacher_reminder_event(uuid, uuid, text, date);
create function public.claim_teacher_reminder_event(
  target_participant_id uuid,
  target_case_id uuid,
  target_reminder_type text,
  target_study_date date,
  retry_reclamation boolean default false
)
returns table (event_id uuid, claimed boolean)
language sql
volatile
security definer
set search_path = ''
as $$
with new_event as (
  insert into public.teacher_reminder_events
    (participant_id, case_id, reminder_type, study_date, status)
  select target_participant_id, target_case_id, target_reminder_type, target_study_date, 'pending'
  where not retry_reclamation
  on conflict (participant_id, study_date, reminder_type) do nothing
  returning id
), reclaimed_event as (
  update public.teacher_reminder_events existing
  set status = 'pending', case_id = target_case_id, provider_message_id = null,
      attempt_count = existing.attempt_count + 1, last_attempt_at = now(), updated_at = now()
  where retry_reclamation
  and existing.participant_id = target_participant_id
  and existing.study_date = target_study_date
  and existing.reminder_type = target_reminder_type
  and (existing.status = 'failed'
       or (existing.status = 'pending' and existing.last_attempt_at <= now() - interval '30 minutes'))
  returning id
), claimed_event as (
  select id from new_event union all select id from reclaimed_event
)
select claimed_event.id, true from claimed_event
union all
select existing.id, false
from public.teacher_reminder_events existing
where existing.participant_id = target_participant_id
and existing.study_date = target_study_date
and existing.reminder_type = target_reminder_type
and not exists (select 1 from claimed_event);
$$;

revoke all on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) from public;
revoke all on function public.claim_teacher_reminder_event(uuid,uuid,text,date,boolean) from public;
revoke execute on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) from anon, authenticated;
revoke execute on function public.claim_teacher_reminder_event(uuid,uuid,text,date,boolean) from anon, authenticated;
grant execute on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) to service_role;
grant execute on function public.claim_teacher_reminder_event(uuid,uuid,text,date,boolean) to service_role;
