-- Retire the legacy public teacher-folder identifier from protected gameplay.
drop function if exists public.research_admin_game_preview(text);

create function public.research_admin_game_preview(target_case_code text)
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
  select c.id, c.case_code::text, c.student_alias::text,
    p.id, p.participant_code::text
  from public.cases c
  join public.participants p on p.case_id = c.id
  where c.case_code = btrim(target_case_code)
    and c.active = false
    and p.active = false
    and exists (select 1 from public.case_game_content gc where gc.case_id = c.id);
end;
$$;

revoke all on function public.research_admin_game_preview(text) from public;
revoke execute on function public.research_admin_game_preview(text) from anon;
grant execute on function public.research_admin_game_preview(text) to authenticated;

comment on function public.research_admin_game_preview(text) is
'Returns only the de-identified prepared assignment required for research-admin game QA; never updates activation or intake state.';

-- The protected-content schema confirms config is jsonb. Remove the obsolete
-- remote logger field without changing mission, resource, or fidelity content.
update public.case_game_content
set config = config - 'resultEndpoint'
where config ? 'resultEndpoint';

alter table public.cases drop column if exists game_folder;
