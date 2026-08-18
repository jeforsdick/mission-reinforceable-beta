-- Canonical participant gameplay dosage check. Study days are always Denver dates.
create or replace function public.has_completed_mission_today()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
select exists (
  select 1
  from public.game_sessions gs
  join public.participants p on p.id = gs.participant_id
  where p.auth_user_id = (select auth.uid())
    and p.active = true
    and gs.case_id = p.case_id
    and gs.status = 'completed'
    and gs.qa_mode = false
    and (coalesce(gs.ended_at, gs.started_at) at time zone 'America/Denver')::date
      = (now() at time zone 'America/Denver')::date
);
$$;

revoke all on function public.has_completed_mission_today() from public;
revoke execute on function public.has_completed_mission_today() from anon;
grant execute on function public.has_completed_mission_today() to authenticated;

comment on function public.has_completed_mission_today() is
'Authenticated, own-active-participant check for one completed non-QA mission on the current America/Denver study date.';

drop policy "Participants can create their own game sessions" on public.game_sessions;
create policy "Participants can create their own game sessions"
on public.game_sessions for insert to authenticated
with check (
  public.owns_active_participant_case(participant_id, case_id)
  and qa_mode = false
  and not public.has_completed_mission_today()
);

-- Participant table updates may abandon a run, but completion is exclusively the
-- serialized security-definer operation below. Research-admin QA uses its own RLS
-- policy and is unaffected.
drop policy "Participants can update their own game sessions" on public.game_sessions;
create policy "Participants can update their own game sessions"
on public.game_sessions for update to authenticated
using (public.owns_active_participant_case(participant_id, case_id) and qa_mode = false)
with check (
  public.owns_active_participant_case(participant_id, case_id)
  and qa_mode = false
  and status <> 'completed'
);

-- Serialize participant completion by participant and Denver study date. Multiple
-- tabs may have started rows, but only the transaction holding this lock can make
-- one of them completed; its same-day peers are immediately abandoned.
create or replace function public.complete_participant_mission(
  target_session_id uuid,
  completion jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.game_sessions%rowtype;
  study_date date;
begin
  select gs.* into target
  from public.game_sessions gs
  join public.participants p on p.id = gs.participant_id
  where gs.id = target_session_id
    and p.auth_user_id = (select auth.uid())
    and p.active = true
    and p.case_id = gs.case_id
    and gs.qa_mode = false;

  if not found then
    raise exception 'eligible participant session not found' using errcode = '42501';
  end if;

  study_date := (target.started_at at time zone 'America/Denver')::date;
  if study_date <> (now() at time zone 'America/Denver')::date then
    raise exception 'session is not from the current study date' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target.participant_id::text || ':' || study_date::text, 0));
  select * into target from public.game_sessions where id = target_session_id for update;

  if exists (
    select 1 from public.game_sessions gs
    where gs.participant_id = target.participant_id
      and gs.id <> target_session_id
      and gs.qa_mode = false
      and gs.status = 'completed'
      and (coalesce(gs.ended_at, gs.started_at) at time zone 'America/Denver')::date = study_date
  ) then
    if target.status = 'started' then
      update public.game_sessions set status = 'abandoned', ended_at = clock_timestamp()
      where id = target_session_id;
    end if;
    return 'already_completed';
  end if;

  if target.status <> 'started' then
    raise exception 'session is not eligible for completion' using errcode = '55000';
  end if;

  update public.game_sessions set
    ended_at = clock_timestamp(), status = 'completed',
    duration_seconds = nullif(completion->>'duration_seconds', '')::integer,
    active_duration_seconds = nullif(completion->>'active_duration_seconds', '')::integer,
    score = nullif(completion->>'score', '')::numeric,
    max_score = nullif(completion->>'max_score', '')::numeric,
    accuracy = nullif(completion->>'accuracy', '')::numeric,
    total_questions = nullif(completion->>'total_questions', '')::integer,
    plan_aligned_count = nullif(completion->>'plan_aligned_count', '')::integer,
    refine_count = nullif(completion->>'refine_count', '')::integer,
    missed_count = nullif(completion->>'missed_count', '')::integer,
    hints_used = nullif(completion->>'hints_used', '')::boolean,
    total_hints_opened = nullif(completion->>'total_hints_opened', '')::integer,
    questions_with_hints = nullif(completion->>'questions_with_hints', '')::integer,
    hint_use_rate = nullif(completion->>'hint_use_rate', '')::numeric
  where id = target_session_id;

  update public.game_sessions set status = 'abandoned', ended_at = clock_timestamp()
  where participant_id = target.participant_id
    and id <> target_session_id and qa_mode = false and status = 'started'
    and (started_at at time zone 'America/Denver')::date = study_date;

  return 'completed';
end;
$$;

revoke all on function public.complete_participant_mission(uuid, jsonb) from public;
revoke execute on function public.complete_participant_mission(uuid, jsonb) from anon;
grant execute on function public.complete_participant_mission(uuid, jsonb) to authenticated;
