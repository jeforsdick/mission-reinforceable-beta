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
