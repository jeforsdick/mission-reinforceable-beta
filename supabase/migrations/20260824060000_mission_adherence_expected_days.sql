-- Mission adherence denominator only. This does not participate in phase,
-- observation, fidelity, IOA, reminder, lock, or gameplay persistence logic.
create function public.mission_adherence_summary(target_case_id uuid, period_start date, period_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if period_start is null or period_end is null or period_end < period_start then
    raise exception 'valid adherence period required' using errcode = '22023';
  end if;
  if not (auth.role()='service_role' or public.is_research_admin() or exists (
    select 1 from public.case_coaches cc
    where cc.case_id=target_case_id and cc.coach_user_id=auth.uid() and cc.active
  )) then raise exception 'case access required' using errcode='42501'; end if;

  with scheduled as (
    select day::date study_date
    from generate_series(period_start,period_end,interval '1 day') day
    where public.is_mr_dissertation_study_day(day::date)
  ), current_status as (
    select status.study_date,status.reason
    from public.participants p
    cross join lateral public.current_participant_study_day_status(p.id,target_case_id) status
    where p.case_id=target_case_id
  ), days as (
    select s.study_date,(cs.reason='teacher_unavailable') excused,
      exists(select 1 from public.game_sessions gs where gs.case_id=target_case_id
        and gs.status='completed' and not gs.qa_mode
        and (coalesce(gs.ended_at,gs.started_at) at time zone 'America/Denver')::date=s.study_date) completed
    from scheduled s left join current_status cs using(study_date)
  )
  select jsonb_build_object(
    'scheduledStudyDays',count(*),
    'excusedStudyDays',count(*) filter(where excused),
    'expectedMissionDays',count(*) filter(where not excused),
    'completedExpectedMissionDays',count(*) filter(where not excused and completed),
    'periodStart',period_start,'periodEnd',period_end,'authoritativeTimezone','America/Denver'
  ) into result from days;
  return result;
end $$;

revoke all on function public.mission_adherence_summary(uuid,date,date) from public;
grant execute on function public.mission_adherence_summary(uuid,date,date) to authenticated, service_role;
comment on function public.mission_adherence_summary(uuid,date,date) is
  'Expected MR mission adherence: scheduled Granite days minus only CURRENT teacher_unavailable scheduled days.';
