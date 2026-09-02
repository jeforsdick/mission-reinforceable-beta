-- Test cases stay out of every study-wide dashboard query. This deliberately
-- narrow researcher-only index supports opt-in navigation; callers use the
-- existing targeted dashboards to inspect one returned case at a time.
create function public.research_admin_test_case_ids()
returns table(case_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;

  return query
  select p.case_id
  from public.participants p
  where p.is_test
  order by p.participant_code;
end $$;

revoke all on function public.research_admin_test_case_ids() from public, anon;
grant execute on function public.research_admin_test_case_ids() to authenticated;

comment on function public.research_admin_test_case_ids() is
  'Researcher-only navigation index for explicitly marked test cases. It does not feed study-wide aggregates.';
