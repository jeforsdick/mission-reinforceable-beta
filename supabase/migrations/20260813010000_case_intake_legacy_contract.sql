-- Restore the legacy draft/submitted lifecycle required by onboarding.
-- Existing dissertation provisioning explicitly writes 'submitted'.

alter table public.case_intake
  add column if not exists status text not null default 'draft';

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'case_intake'
      and c.conname = 'case_intake_status_check'
  ) then
    alter table public.case_intake
      add constraint case_intake_status_check
      check (status in ('draft', 'submitted'));
  end if;
end
$$;

comment on column public.case_intake.status is
  'Legacy intake snapshot lifecycle: draft while prepared, submitted when finalized.';
