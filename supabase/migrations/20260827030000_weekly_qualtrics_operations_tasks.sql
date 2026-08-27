-- Idempotent operational task definitions for the external Weekly Qualtrics survey.
-- This migration is data-independent: authenticated Research Admins ensure tasks at runtime.
create unique index if not exists research_tasks_weekly_qualtrics_study_unique
  on public.research_tasks (title) where case_id is null and title = 'Finalize Weekly Teacher Report in Qualtrics';
create unique index if not exists research_tasks_weekly_qualtrics_case_unique
  on public.research_tasks (case_id, title) where case_id is not null and title = 'Configure Weekly Teacher Report personalization in Qualtrics';

create or replace function public.research_admin_ensure_weekly_qualtrics_study_task()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.research_tasks%rowtype;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  insert into public.research_tasks(case_id,title,category,required,status,note,created_by)
  values(null,'Finalize Weekly Teacher Report in Qualtrics','measure_follow_up',true,'pending',
    'Finalize the single Weekly Teacher Report survey in Qualtrics. Confirm Embedded Data fields mr_weekly_token, participant_code, week_number, target_behavior, replacement_behavior, and target_routine; confirm participant-code Survey Flow branching; configure the MR completion redirect; enter the production Qualtrics survey URL in Vercel; and complete an MR-998 QA check before study launch.',auth.uid())
  on conflict do nothing;
  select * into result from public.research_tasks where case_id is null and title='Finalize Weekly Teacher Report in Qualtrics';
  return to_jsonb(result);
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

revoke all on function public.research_admin_ensure_weekly_qualtrics_study_task(),public.research_admin_ensure_weekly_qualtrics_case_task(uuid) from public,anon;
grant execute on function public.research_admin_ensure_weekly_qualtrics_study_task(),public.research_admin_ensure_weekly_qualtrics_case_task(uuid) to authenticated;
comment on function public.research_admin_ensure_weekly_qualtrics_study_task() is
'Idempotently creates the required manual study-wide Weekly Qualtrics task for the active Research Admin; has no lifecycle side effects.';
comment on function public.research_admin_ensure_weekly_qualtrics_case_task(uuid) is
'Idempotently creates the required manual Weekly Qualtrics task for a current prepared case; has no lifecycle side effects.';
