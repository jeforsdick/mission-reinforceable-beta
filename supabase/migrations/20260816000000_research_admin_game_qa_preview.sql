-- De-identified pre-intervention QA telemetry and a narrow inactive-case resolver.
alter table public.game_sessions
add column qa_mode boolean not null default false;

alter table public.game_responses
add column qa_mode boolean not null default false;

create index game_sessions_study_reporting_idx
on public.game_sessions (case_id, started_at) where not qa_mode;

create index game_responses_study_reporting_idx
on public.game_responses (case_id, session_id) where not qa_mode;

create function public.research_admin_game_preview(target_case_code text)
returns table (
  case_id uuid,
  case_code text,
  student_alias text,
  game_folder text,
  participant_id uuid,
  participant_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_count integer;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;
  if target_case_code is null or btrim(target_case_code) !~ '^CASE-[0-9]{3}$' then
    raise exception 'valid case code required' using errcode = '22023';
  end if;

  select count(*) into match_count
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code)
    and c.active = false
    and p.active = false
    and exists (select 1 from public.case_game_content gc where gc.case_id = c.id);

  if match_count = 0 then
    raise exception 'prepared case assignment not found' using errcode = 'P0002';
  elsif match_count <> 1 then
    raise exception 'prepared case assignment is ambiguous' using errcode = '21000';
  end if;

  return query
  select c.id, c.case_code::text, c.student_alias::text, c.game_folder::text,
    p.id, p.participant_code::text
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code)
    and c.active = false
    and p.active = false
    and exists (select 1 from public.case_game_content gc where gc.case_id = c.id);
end;
$$;

-- A QA completion must not suppress the participant's intervention follow-up.
create or replace function public.has_completed_mission_on_study_date(
target_participant_id uuid,
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
select 1 from public.game_sessions gs
where gs.participant_id = target_participant_id
and gs.status = 'completed'
and gs.qa_mode = false
and (coalesce(gs.ended_at, gs.started_at) at time zone study_timezone)::date = target_study_date
);
$$;

revoke all on function public.research_admin_game_preview(text) from public;
revoke execute on function public.research_admin_game_preview(text) from anon;
grant execute on function public.research_admin_game_preview(text) to authenticated;

comment on column public.game_sessions.qa_mode is
'True only for research-admin pre-intervention QA; excluded from study reporting.';
comment on column public.game_responses.qa_mode is
'True only for research-admin pre-intervention QA; excluded from study reporting.';
comment on function public.research_admin_game_preview(text) is
'Returns only the de-identified prepared assignment required for research-admin game QA; never updates activation or intake state.';
