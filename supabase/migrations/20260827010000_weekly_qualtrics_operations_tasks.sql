-- Required operational work for the single Qualtrics survey and each prepared study case.
-- These tasks are informational/manual: they do not change phases, access, or reminders.
create unique index if not exists research_tasks_weekly_qualtrics_study_unique
  on public.research_tasks (title) where case_id is null and title = 'Finalize Weekly Teacher Report in Qualtrics';
create unique index if not exists research_tasks_weekly_qualtrics_case_unique
  on public.research_tasks (case_id, title) where case_id is not null and title = 'Configure Weekly Teacher Report personalization in Qualtrics';

do $$
declare seed_admin uuid;
begin
  select id into seed_admin from public.profiles where role = 'research_admin' and active order by created_at, id limit 1;
  if seed_admin is null then
    raise exception 'An active Research Admin is required to seed Weekly Qualtrics tasks';
  end if;

  insert into public.research_tasks(case_id,title,category,required,status,note,created_by)
  values (null,'Finalize Weekly Teacher Report in Qualtrics','measure_follow_up',true,'pending',
    'Finalize the single Weekly Teacher Report survey in Qualtrics. Confirm Embedded Data fields mr_weekly_token, participant_code, week_number, target_behavior, replacement_behavior, and target_routine; confirm participant-code Survey Flow branching; configure the MR completion redirect; enter the production Qualtrics survey URL in Vercel; and complete an MR-998 QA check before study launch.',seed_admin)
  on conflict do nothing;

  insert into public.research_tasks(case_id,title,category,required,status,note,created_by)
  select c.id,'Configure Weekly Teacher Report personalization in Qualtrics','measure_follow_up',true,'pending',
    'Before Intervention, add or update this participant''s Qualtrics Survey Flow branch using the finalized target behavior definition, replacement/desired behavior, and target routine. Preview the survey using the participant''s coded Study ID and confirm the correct text appears. Do not enter teacher names, student names, diagnoses, or other unnecessary identifiers in Qualtrics.',seed_admin
  from public.cases c join public.participants p on p.case_id=c.id
  where c.archived_at is null and p.participant_code not like 'MR-DEMO-%'
  on conflict do nothing;
end $$;

create or replace function public.research_admin_ensure_weekly_qualtrics_case_task(target_case_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.research_tasks%rowtype;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.cases c join public.participants p on p.case_id=c.id where c.id=target_case_id and c.archived_at is null and p.participant_code not like 'MR-DEMO-%') then
    raise exception 'current prepared study case not found' using errcode='P0002';
  end if;
  insert into public.research_tasks(case_id,title,category,required,status,note,created_by)
  values(target_case_id,'Configure Weekly Teacher Report personalization in Qualtrics','measure_follow_up',true,'pending',
    'Before Intervention, add or update this participant''s Qualtrics Survey Flow branch using the finalized target behavior definition, replacement/desired behavior, and target routine. Preview the survey using the participant''s coded Study ID and confirm the correct text appears. Do not enter teacher names, student names, diagnoses, or other unnecessary identifiers in Qualtrics.',auth.uid())
  on conflict do nothing;
  select * into result from public.research_tasks where case_id=target_case_id and title='Configure Weekly Teacher Report personalization in Qualtrics';
  return to_jsonb(result);
end $$;
revoke all on function public.research_admin_ensure_weekly_qualtrics_case_task(uuid) from public,anon;
grant execute on function public.research_admin_ensure_weekly_qualtrics_case_task(uuid) to authenticated;
comment on function public.research_admin_ensure_weekly_qualtrics_case_task(uuid) is
'Idempotently adds the manual Weekly Qualtrics personalization task after the existing prepared-case conversion; never changes lifecycle, access, or reminders.';
