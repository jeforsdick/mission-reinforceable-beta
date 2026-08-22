-- Narrow assignment resolver for Research Admin preview of one saved mission draft.
-- Draft content remains protected behind research_admin_game_authoring_workspace.
create function public.research_admin_draft_game_preview(
  target_case_code text,
  target_mission_type text,
  target_slot_number integer
)
returns table (
  case_id uuid,
  case_code text,
  student_alias text,
  participant_id uuid,
  participant_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_count integer;
  matched_case_id uuid;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;
  if target_case_code is null or btrim(target_case_code) !~ '^CASE-[0-9]{3}$' then
    raise exception 'valid case code required' using errcode = '22023';
  end if;
  if target_mission_type is null or target_mission_type not in ('daily', 'wild', 'crisis') then
    raise exception 'invalid mission type' using errcode = '22023';
  end if;
  if target_slot_number is null
    or (target_mission_type = 'daily' and target_slot_number not between 1 and 10)
    or (target_mission_type in ('wild', 'crisis') and target_slot_number not between 1 and 5) then
    raise exception 'invalid mission slot' using errcode = '22023';
  end if;

  select count(*) into match_count
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code)
    and c.active = false
    and p.active = false;

  if match_count = 0 then
    raise exception 'prepared case assignment not found' using errcode = 'P0002';
  elsif match_count <> 1 then
    raise exception 'prepared case assignment is ambiguous' using errcode = '21000';
  end if;

  select c.id into matched_case_id
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code)
    and c.active = false
    and p.active = false;

  if not exists (
    select 1 from public.case_game_mission_draft_revisions d
    where d.case_id = matched_case_id
      and d.mission_type = target_mission_type
      and d.slot_number = target_slot_number
  ) then
    raise exception 'saved mission draft not found' using errcode = 'P0002';
  end if;

  return query
  select c.id, c.case_code::text, c.student_alias::text,
    p.id, p.participant_code::text
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.id = matched_case_id
    and c.active = false
    and p.active = false;
end;
$$;

revoke all on function public.research_admin_draft_game_preview(text, text, integer) from public;
revoke execute on function public.research_admin_draft_game_preview(text, text, integer) from anon;
grant execute on function public.research_admin_draft_game_preview(text, text, integer) to authenticated;

comment on function public.research_admin_draft_game_preview(text, text, integer) is
'Returns only an inactive, de-identified assignment for Research Admin saved-draft QA; it neither returns draft content nor requires published game content.';
