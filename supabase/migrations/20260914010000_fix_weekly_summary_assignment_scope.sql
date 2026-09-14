-- Keep the current-content guard in the PL/pgSQL statement where it is used.
-- CTEs belong to one SQL statement and cannot be referenced by a later IF.

create or replace function public.research_admin_weekly_game_summary(target_case_id uuid, target_week_start date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not (auth.role()='service_role' or public.is_research_admin()) then raise exception 'research admin required' using errcode='42501'; end if;
  if extract(isodow from target_week_start) <> 1 then raise exception 'week start must be Monday' using errcode='22023'; end if;
  if not exists(
    select 1
    from public.participants p
    join public.case_game_content gc on gc.case_id=p.case_id
    where p.case_id=target_case_id
  ) then raise exception 'current published game content unavailable' using errcode='P0002'; end if;
  with assignment as (
    select p.id participant_id,p.case_id,gc.version,gc.daily_missions,gc.wildcard_missions,gc.crisis_missions
    from public.participants p join public.case_game_content gc on gc.case_id=p.case_id
    where p.case_id=target_case_id
  ), valid as (
    select gs.mode,(gs.ended_at at time zone 'America/Denver')::date study_date
    from assignment a join public.game_sessions gs on gs.participant_id=a.participant_id and gs.case_id=a.case_id
    where gs.status='completed' and gs.qa_mode=false
      and gs.mode in ('daily','mystery','crisis') and gs.game_content_version=a.version
      and (gs.ended_at at time zone 'America/Denver')::date between target_week_start and target_week_start+4
      and public.is_mr_dissertation_study_day((gs.ended_at at time zone 'America/Denver')::date)
      and exists (
        select 1 from jsonb_array_elements(case gs.mode when 'daily' then a.daily_missions when 'mystery' then a.wildcard_missions when 'crisis' then a.crisis_missions end) mission
        where mission->>'id'=gs.mission_id
      )
  )
  select jsonb_build_object(
    'week_start',target_week_start,'week_end',target_week_start+4,'timezone','America/Denver',
    'missions_completed',count(*),'days_practiced',count(distinct study_date),
    'mission_mix',jsonb_build_object('daily',count(*) filter(where mode='daily'),'mystery',count(*) filter(where mode='mystery'),'crisis',count(*) filter(where mode='crisis')),
    'behavior_plan_xp',null,'xp_available',false
  ) into result from valid;
  return result;
end $$;

revoke all on function public.research_admin_weekly_game_summary(uuid,date) from public;
grant execute on function public.research_admin_weekly_game_summary(uuid,date) to authenticated, service_role;

comment on function public.research_admin_weekly_game_summary(uuid,date) is
'Research-admin-only Monday-Friday America/Denver recap. XP is omitted because game_sessions persists choice score/max_score, not the computed Behavior Plan XP displayed by the client.';
