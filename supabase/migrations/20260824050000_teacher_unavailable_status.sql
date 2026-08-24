-- Preserve append-only legacy context while making teacher_unavailable the current status.
-- This remains descriptive only: teacher_unavailable does not automatically alter
-- adherence, expected missions, phase, fidelity, observation, gameplay, or streak calculations.
alter table public.participant_study_day_status_tokens
  drop constraint participant_study_day_status_tokens_reason_check,
  add constraint participant_study_day_status_tokens_reason_check
    check (reason in ('teacher_unavailable', 'teacher_absent', 'student_absent', 'schedule_disruption'));

alter table public.participant_study_day_status_events
  drop constraint participant_study_day_status_events_reason_check,
  add constraint participant_study_day_status_events_reason_check
    check (reason in ('teacher_unavailable', 'teacher_absent', 'student_absent', 'schedule_disruption'));

create or replace function public.research_admin_correct_study_day_status(target_event_id uuid, target_reason text, target_actor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare prior public.participant_study_day_status_events%rowtype; declare new_id uuid;
begin
  if not public.is_research_admin() or auth.uid() is distinct from target_actor_id then raise exception 'active research admin required'; end if;
  -- Legacy values remain readable but are not available for new corrections.
  if target_reason is not null and target_reason <> 'teacher_unavailable' then raise exception 'invalid reason'; end if;
  select * into prior from public.participant_study_day_status_events where id=target_event_id;
  if not found then raise exception 'status event not found'; end if;
  insert into public.participant_study_day_status_events(participant_id,case_id,study_date,reason,source,supersedes_event_id,recorded_by_type,recorded_by_user_id)
  values(prior.participant_id,prior.case_id,prior.study_date,target_reason,'research_admin',prior.id,'research_admin',target_actor_id)
  returning id into new_id; return new_id;
end $$;

comment on constraint participant_study_day_status_tokens_reason_check on public.participant_study_day_status_tokens is
  'teacher_unavailable is current; teacher_absent, student_absent, and schedule_disruption are legacy audit values.';
comment on constraint participant_study_day_status_events_reason_check on public.participant_study_day_status_events is
  'teacher_unavailable is current; teacher_absent, student_absent, and schedule_disruption are legacy audit values.';
