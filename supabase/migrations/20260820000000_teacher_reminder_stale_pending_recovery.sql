-- Recover interrupted reminder delivery without changing its logical identity.
-- A pending claim remains exclusive for 30 minutes; sent claims are permanent.

create or replace function public.claim_teacher_reminder_event(
target_participant_id uuid,
target_case_id uuid,
target_reminder_type text,
target_study_date date
)
returns table (event_id uuid, claimed boolean)
language sql
volatile
security definer
set search_path = ''
as $$
with claimed_event as (
insert into public.teacher_reminder_events as existing
(participant_id, case_id, reminder_type, study_date, status)
values
(target_participant_id, target_case_id, target_reminder_type, target_study_date, 'pending')
on conflict (participant_id, study_date, reminder_type) do update
set status = 'pending',
case_id = excluded.case_id,
provider_message_id = null,
attempt_count = existing.attempt_count + 1,
last_attempt_at = now(),
updated_at = now()
where existing.status = 'failed'
or (existing.status = 'pending' and existing.last_attempt_at <= now() - interval '30 minutes')
returning id
)
select ce.id, true from claimed_event ce
union all
select existing.id, false
from public.teacher_reminder_events existing
where existing.participant_id = target_participant_id
and existing.study_date = target_study_date
and existing.reminder_type = target_reminder_type
and not exists (select 1 from claimed_event);
$$;

revoke all on function public.claim_teacher_reminder_event(uuid, uuid, text, date) from public;
revoke execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date) from anon, authenticated;
grant execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date) to service_role;
