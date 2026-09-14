-- Weekly recap configuration and researcher-only summary/test foundation.
-- This migration deliberately creates no scheduler or production recipient query.

alter table public.participants
  add column weekly_qualtrics_url text;

alter table public.participants
  add constraint participants_weekly_qualtrics_url_check check (
    weekly_qualtrics_url is null or (
      weekly_qualtrics_url ~ '^https://educationutah\.co1\.qualtrics\.com/'
      and weekly_qualtrics_url !~ '[[:space:]]'
    )
  );

comment on column public.participants.weekly_qualtrics_url is
'Complete researcher-approved individualized weekly Qualtrics URL. Reused unchanged; not exposed in study-wide dashboards.';

create function public.research_admin_set_weekly_qualtrics_url(target_case_id uuid, target_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare clean_url text; result jsonb;
begin
  if not (auth.role()='service_role' or public.is_research_admin()) then raise exception 'research admin required' using errcode='42501'; end if;
  clean_url := nullif(btrim(target_url), '');
  if clean_url is not null and (clean_url !~ '^https://educationutah\.co1\.qualtrics\.com/' or clean_url ~ '[[:space:]]') then
    raise exception 'Weekly Qualtrics link must be an HTTPS educationutah.co1.qualtrics.com URL.' using errcode='22023';
  end if;
  update public.participants set weekly_qualtrics_url=clean_url
  where case_id=target_case_id
  returning jsonb_build_object('participant_id',id,'configured',weekly_qualtrics_url is not null) into result;
  if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
  return result;
end $$;

create function public.research_admin_weekly_game_summary(target_case_id uuid, target_week_start date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not (auth.role()='service_role' or public.is_research_admin()) then raise exception 'research admin required' using errcode='42501'; end if;
  if extract(isodow from target_week_start) <> 1 then raise exception 'week start must be Monday' using errcode='22023'; end if;
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
  if not exists(select 1 from assignment) then raise exception 'current published game content unavailable' using errcode='P0002'; end if;
  return result;
end $$;

revoke all on function public.research_admin_set_weekly_qualtrics_url(uuid,text), public.research_admin_weekly_game_summary(uuid,date) from public;
grant execute on function public.research_admin_set_weekly_qualtrics_url(uuid,text), public.research_admin_weekly_game_summary(uuid,date) to authenticated, service_role;

comment on function public.research_admin_weekly_game_summary(uuid,date) is
'Research-admin-only Monday-Friday America/Denver recap. XP is omitted because game_sessions persists choice score/max_score, not the computed Behavior Plan XP displayed by the client.';
