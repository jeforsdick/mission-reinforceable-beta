-- Retire the Mission: Reinforceable-hosted Weekly Teacher Report.
-- Qualtrics is authoritative for the measure; MR retains no response storage.

create or replace function public.research_admin_procedural_fidelity_evidence(
  target_participant_id uuid, target_case_id uuid, target_scope text,
  target_study_date date default null, target_week_start date default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; target_week_end date;
  denver_today date := (now() at time zone 'America/Denver')::date;
  current_week_monday date;
begin
  current_week_monday := denver_today-(extract(isodow from denver_today)::integer-1);
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.participants p where p.id=target_participant_id and p.case_id=target_case_id)
    then raise exception 'participant/case assignment not found' using errcode='P0002'; end if;
  if target_scope='daily' then
    if target_study_date>denver_today then raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023'; end if;
    if not public.is_mr_dissertation_study_day(target_study_date) then raise exception 'daily target must be a scheduled Granite study day' using errcode='22023'; end if;
    select jsonb_build_object(
      'authoritative_timezone','America/Denver',
      'daily_prompt', coalesce((select jsonb_build_object('event_id',e.id,'status',e.status,'attempt_count',e.attempt_count,'last_attempt_at',e.last_attempt_at)
        from public.teacher_reminder_events e where e.participant_id=target_participant_id and e.study_date=target_study_date and e.reminder_type='daily_prompt'),
        jsonb_build_object('recorded',false,'message','No reminder event recorded. This does not automatically mean No.')),
      'mission_availability', (select jsonb_build_object('case_active',c.active,'participant_active',p.active,
        'protected_content_present',gc.case_id is not null,'protected_content_version',gc.version,
        'outage_log','No reliable outage log is available; researcher confirmation required.')
        from public.participants p join public.cases c on c.id=p.case_id left join public.case_game_content gc on gc.case_id=c.id where p.id=target_participant_id),
      'functional_access', (select jsonb_build_object('auth_user_linked',p.auth_user_id is not null,
        'active_teacher_profile',coalesce(pr.active and pr.role='teacher',false),
        'non_qa_session_count',count(gs.id),
        'interpretation',case when count(gs.id)>0 then 'A non-QA gameplay session is positive access evidence.' else 'No gameplay session recorded. This does not by itself indicate an access failure.' end)
        from public.participants p left join public.profiles pr on pr.id=p.auth_user_id
        left join public.game_sessions gs on gs.participant_id=p.id and not gs.qa_mode
          and (gs.started_at at time zone 'America/Denver')::date=target_study_date where p.id=target_participant_id group by p.auth_user_id,pr.active,pr.role)
    ) into result;
  elsif target_scope='weekly' then
    target_week_end := target_week_start+4;
    if target_week_start>current_week_monday then raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023'; end if;
    if extract(isodow from target_week_start)<>1 or not exists(select 1 from generate_series(target_week_start,target_week_end,interval '1 day') d where public.is_mr_dissertation_study_day(d::date))
      then raise exception 'weekly target must be a Monday-Friday week containing a Granite study day' using errcode='22023'; end if;
    select jsonb_build_object('authoritative_timezone','America/Denver',
      'weekly_usage_summary',jsonb_build_object('message','No automated delivery log is available yet; researcher confirmation required.'),
      'qualtrics_weekly_report',jsonb_build_object('system','Qualtrics','message','Qualtrics owns the Weekly Teacher Report. Confirm distribution outside Mission: Reinforceable; no response data is stored here.')
    ) into result;
  else raise exception 'review scope must be daily or weekly' using errcode='22023'; end if;
  return result;
end $$;


drop function if exists public.submit_weekly_teacher_report(smallint,smallint,smallint,smallint,smallint,smallint,smallint,text,text);
drop function if exists public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text);
drop table if exists public.weekly_teacher_checkins;
