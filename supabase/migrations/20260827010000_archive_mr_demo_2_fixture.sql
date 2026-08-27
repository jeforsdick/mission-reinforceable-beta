-- Archive the remaining reviewed demo fixture for Research Admin dashboard
-- organization only. Access, activation, lifecycle, and fixture data are unchanged.
update public.cases c
set archived_at = coalesce(c.archived_at, timestamptz '2026-08-27 01:00:00+00'),
    archive_reason = 'Reserved fictional demo fixture hidden from default Research Admin dashboard before dissertation launch.'
where c.case_code = 'CASE-DEMO-2'
  and exists (
    select 1
    from public.participants p
    where p.case_id = c.id
      and p.participant_code = 'MR-DEMO-2'
  );
