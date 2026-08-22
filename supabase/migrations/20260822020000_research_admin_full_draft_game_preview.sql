-- Read-only assignment resolver for Research Admin QA of the complete saved draft.
create function public.research_admin_full_draft_game_preview(target_case_code text)
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
  select c.id into matched_case_id from public.cases c join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code) and c.active = false and p.active = false;

  if not exists (select 1 from public.case_game_mission_draft_revisions d where d.case_id = matched_case_id) then
    raise exception 'saved authoring drafts not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.case_game_setup_draft_revisions d where d.case_id = matched_case_id)
    and not exists (select 1 from public.case_game_resource_draft_revisions d where d.case_id = matched_case_id) then
    raise exception 'protected authoring drafts not found' using errcode = 'P0002';
  end if;

  return query
  select c.id, c.case_code::text, c.student_alias::text, p.id, p.participant_code::text
  from public.cases c join public.participants p on p.case_id = c.id
  where c.id = matched_case_id and c.active = false and p.active = false;
end;
$$;

revoke all on function public.research_admin_full_draft_game_preview(text) from public;
revoke execute on function public.research_admin_full_draft_game_preview(text) from anon;
grant execute on function public.research_admin_full_draft_game_preview(text) to authenticated;

comment on function public.research_admin_full_draft_game_preview(text) is
'Returns only one inactive assignment for Research Admin full saved-draft QA. It performs no writes and does not require published game content.';
