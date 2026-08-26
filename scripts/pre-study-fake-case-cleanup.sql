-- ONE-TIME PRE-STUDY FAKE-CASE CLEANUP (manual Supabase SQL Editor use only).
--
-- Read this first:
--   1. Run only the SELECT-only preview below and compare it with Research Admin.
--   2. Jess approved CASE-DEMO / MR-DEMO and CASE-999 / MR-999 after reviewing
--      the live Research Admin / Supabase inventory. Do not add a live case
--      merely because its name looks like a test.
--   3. Run the transaction unchanged once. It ends in ROLLBACK as a rehearsal.
--   4. Inspect every verification result, then replace the FINAL ROLLBACK with
--      COMMIT and rerun the complete transaction. Never run only part of it.
--
-- PERMANENTLY PROTECTED: CASE-998 / MR-998 and CASE-DEMO-2 / MR-DEMO-2.

/* ========================================================================
   SELECT-ONLY FULL INVENTORY (safe to run by itself)
   ======================================================================== */
-- Review every non-protected current assignment in Research Admin. This query
-- is deliberately broader than the destructive allowlist below: appearing here
-- does NOT authorize deletion. Exact additional case/participant pairs must be
-- approved by Jess and then added to both allowlist VALUES blocks with evidence.
select
  c.id as case_id,
  c.case_code,
  p.id as participant_id,
  p.participant_code,
  pr.email as teacher_email,
  coalesce((
    select pe.phase
    from public.research_case_phase_events pe
    where pe.case_id = c.id
    order by pe.effective_date desc, pe.recorded_at desc, pe.id desc
    limit 1
  ), 'not_started') as current_phase,
  c.created_at as case_created_at,
  p.created_at as participant_created_at,
  exists (
    select 1 from public.game_sessions gs
    where gs.case_id = c.id and (p.id is null or gs.participant_id = p.id)
  ) as has_gameplay,
  exists (
    select 1 from public.case_game_content gc where gc.case_id = c.id
  ) as has_protected_content
from public.cases c
left join public.participants p on p.case_id = c.id
left join public.profiles pr on pr.id = p.auth_user_id
where not (c.case_code = 'CASE-998' and p.participant_code = 'MR-998')
  and not (c.case_code = 'CASE-DEMO-2' and p.participant_code = 'MR-DEMO-2')
order by c.created_at, c.case_code, p.participant_code;

/* ========================================================================
   SELECT-ONLY DESTRUCTIVE-ALLOWLIST PREVIEW (safe to run by itself)
   ======================================================================== */
with obsolete_case_allowlist(case_code, participant_code, evidence) as (
  values
    -- Jess-approved obsolete predecessor demo fixture.
    ('CASE-DEMO'::text, 'MR-DEMO'::text,
     'obsolete predecessor demo fixture'::text),
    -- Public fictional authoring fixture with a repository SQL deployment file.
    ('CASE-999'::text, 'MR-999'::text,
     'obsolete fictional authoring/database QA fixture'::text)
)
select
  c.id as case_id,
  c.case_code,
  p.id as participant_id,
  p.participant_code,
  p.auth_user_id as teacher_auth_user_id,
  pr.id as teacher_profile_id,
  pr.email as teacher_profile_email,
  pr.role as teacher_profile_role,
  coalesce((
    select pe.phase
    from public.research_case_phase_events pe
    where pe.case_id = c.id
    order by pe.effective_date desc, pe.recorded_at desc, pe.id desc
    limit 1
  ), 'not_started') as current_phase,
  a.evidence as repository_evidence
from obsolete_case_allowlist a
join public.cases c on c.case_code = a.case_code
left join public.participants p on p.case_id = c.id
left join public.profiles pr on pr.id = p.auth_user_id
where c.case_code not in ('CASE-998', 'CASE-DEMO-2')
  and coalesce(p.participant_code, '') not in ('MR-998', 'MR-DEMO-2')
order by c.case_code, p.participant_code;

-- Also inspect allowlisted codes that are absent or have an unexpected assignment.
with obsolete_case_allowlist(case_code, participant_code) as (
  values
    ('CASE-DEMO'::text, 'MR-DEMO'::text), -- obsolete predecessor demo fixture
    ('CASE-999'::text, 'MR-999'::text) -- obsolete fictional authoring/database QA fixture
)
select a.case_code as expected_case_code,
       a.participant_code as expected_participant_code,
       c.id as found_case_id,
       array_remove(array_agg(p.participant_code), null) as found_participant_codes
from obsolete_case_allowlist a
left join public.cases c on c.case_code = a.case_code
left join public.participants p on p.case_id = c.id
group by a.case_code, a.participant_code, c.id;

/* ========================================================================
   DESTRUCTIVE TRANSACTION -- REHEARSE WITH THE FINAL ROLLBACK
   ======================================================================== */
begin;

create temp table cleanup_case_allowlist (
  case_code text primary key,
  participant_code text not null unique,
  reason text not null
) on commit drop;

insert into cleanup_case_allowlist values
  -- CASE-DEMO / MR-DEMO: Jess-approved obsolete predecessor demo fixture.
  ('CASE-DEMO', 'MR-DEMO', 'obsolete predecessor demo fixture'),
  -- CASE-999 / MR-999: public fictional authoring fixture; deployed by the
  -- guarded one-off research/supabase/004_update_case_999_resources_v5.sql.
  ('CASE-999', 'MR-999', 'obsolete fictional authoring/database QA fixture');

-- Capture IDs once, after guards, so every DELETE remains positively allowlisted.
create temp table cleanup_targets on commit drop as
select c.id as case_id, p.id as participant_id, p.auth_user_id,
       c.case_code, p.participant_code
from cleanup_case_allowlist a
join public.cases c on c.case_code = a.case_code
join public.participants p
  on p.case_id = c.id and p.participant_code = a.participant_code;

-- Hard guards: abort before any DELETE if protected fixtures or the expected
-- allowlisted architecture are missing, mismatched, duplicated, or suspicious.
do $cleanup_guards$
begin
  if (select count(*) from public.cases where case_code = 'CASE-998') <> 1 then
    raise exception 'cleanup aborted: protected CASE-998 must exist exactly once';
  end if;
  if not exists (
    select 1 from public.cases c join public.participants p on p.case_id = c.id
    where c.case_code = 'CASE-998' and p.participant_code = 'MR-998'
  ) then raise exception 'cleanup aborted: protected CASE-998 / MR-998 relationship not found'; end if;
  if (select count(*) from public.participants where participant_code = 'MR-998') <> 1 then
    raise exception 'cleanup aborted: protected MR-998 must exist exactly once';
  end if;

  if (select count(*) from public.cases where case_code = 'CASE-DEMO-2') <> 1
     or (select count(*) from public.participants where participant_code = 'MR-DEMO-2') <> 1
     or not exists (
       select 1 from public.cases c join public.participants p on p.case_id = c.id
       where c.case_code = 'CASE-DEMO-2' and p.participant_code = 'MR-DEMO-2'
     ) then
    raise exception 'cleanup aborted: protected CASE-DEMO-2 / MR-DEMO-2 relationship is unexpected';
  end if;

  if (select count(*) from cleanup_targets) <> (select count(*) from cleanup_case_allowlist)
     or exists (
       select 1 from cleanup_case_allowlist a
       join public.cases c on c.case_code = a.case_code
       left join public.participants p on p.case_id = c.id
       group by a.case_code having count(p.id) <> 1
     ) then
    raise exception 'cleanup aborted: an allowlisted case/participant relationship is not recognized';
  end if;

  if exists (
    select 1 from cleanup_targets t
    join public.profiles pr on pr.id = t.auth_user_id
    where not coalesce((
      (pr.role = 'teacher'
       and pr.email is not null
       and pr.email ~* '@testemail[.]com$')
      or (
        -- Exact legacy exception: preserve Jess's active Research Admin account.
        t.case_code = 'CASE-DEMO'
        and t.participant_code = 'MR-DEMO'
        and pr.role = 'research_admin'
        and pr.active = true
      )
    ), false)
  ) or exists (
    select 1 from cleanup_targets t
    left join public.profiles pr on pr.id = t.auth_user_id
    where pr.id is null
      and not (
        t.case_code = 'CASE-999'
        and t.participant_code = 'MR-999'
        and t.auth_user_id is null
      )
  ) then
    raise exception 'cleanup aborted: allowlisted participant has a missing or non-test teacher profile';
  end if;

  if exists (
    select 1 from cleanup_targets
    where case_code in ('CASE-998', 'CASE-DEMO-2')
       or participant_code in ('MR-998', 'MR-DEMO-2')
  ) then raise exception 'cleanup aborted: a protected fixture entered the target set'; end if;
end
$cleanup_guards$;

-- Report only; profiles and auth.users are deliberately never deleted.
create temp table cleanup_fake_teacher_accounts on commit drop as
select distinct pr.id as profile_id, pr.email, pr.role, t.auth_user_id
from cleanup_targets t join public.profiles pr on pr.id = t.auth_user_id
where pr.role is distinct from 'research_admin';

-- Immutable/append-only history triggers protect normal application behavior.
-- Disable only the named DELETE blockers in this transaction, then restore them.
alter table public.research_classroom_observation_summary_revisions disable trigger research_classroom_observation_summary_revisions_no_delete;
alter table public.research_classroom_observations disable trigger research_classroom_observations_no_delete;
alter table public.research_observation_setup_events disable trigger research_observation_setup_events_no_delete;
alter table public.research_case_protocol disable trigger research_case_protocol_no_delete;
alter table public.research_case_protocol_events disable trigger research_case_protocol_events_no_delete;
alter table public.research_protocol_checklist_events disable trigger research_protocol_checklist_events_no_delete;
alter table public.research_case_phase_events disable trigger research_case_phase_events_no_delete;
alter table public.research_tasks disable trigger research_tasks_no_delete;
alter table public.research_measure_events disable trigger research_measure_events_no_delete;
alter table public.research_coaching_contacts disable trigger research_coaching_contacts_no_delete;
alter table public.research_study_events disable trigger research_study_events_no_delete;
alter table public.mr_procedural_fidelity_reviews disable trigger mr_procedural_fidelity_append_only;
alter table public.case_game_content_versions disable trigger case_game_content_versions_immutable;
alter table public.research_intervention_launch_events disable trigger research_intervention_launch_events_immutable;
alter table public.participant_study_day_status_events disable trigger participant_study_day_status_events_immutable;

-- Child-first manual order. No ON DELETE behavior is assumed.
delete from public.research_classroom_observation_summary_revisions where observation_id in
  (select o.id from public.research_classroom_observations o join cleanup_targets t on t.case_id=o.case_id);
delete from public.research_classroom_observations o using cleanup_targets t where o.case_id=t.case_id;
delete from public.research_observation_setup_events o using cleanup_targets t where o.case_id=t.case_id;
delete from public.research_observation_setup o using cleanup_targets t where o.case_id=t.case_id;

delete from public.participant_study_day_status_events e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.participant_study_day_status_tokens e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.participant_weekly_checkin_tokens e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.participant_weekly_checkins e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.research_intervention_launch_events e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.mr_procedural_fidelity_reviews e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.research_admin_test_account_actions e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.teacher_reminder_events e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.teacher_reminder_settings e using cleanup_targets t where e.participant_id=t.participant_id;
delete from public.game_resource_events e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.game_responses e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;
delete from public.game_sessions e using cleanup_targets t where e.participant_id=t.participant_id and e.case_id=t.case_id;

delete from public.case_protected_content_signoffs e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_game_content_versions e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_game_mission_draft_revisions e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_game_resource_draft_revisions e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_game_setup_draft_revisions e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_protocol_checklist_events e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_case_phase_events e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_case_protocol_events e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_tasks e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_measure_events e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_coaching_contacts e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_study_events e using cleanup_targets t where e.case_id=t.case_id;
delete from public.research_case_protocol e using cleanup_targets t where e.case_id=t.case_id;
delete from public.fidelity_targets e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_coaches e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_intake e using cleanup_targets t where e.case_id=t.case_id;
delete from public.case_game_content e using cleanup_targets t where e.case_id=t.case_id;
-- Preserve intake history but detach its ON DELETE SET NULL converted-case link explicitly.
update public.intake_requests i set converted_case_id=null from cleanup_targets t where i.converted_case_id=t.case_id;

delete from public.participants p using cleanup_targets t where p.id=t.participant_id;
delete from public.cases c using cleanup_targets t where c.id=t.case_id;

-- Restore normal immutable-history behavior before verification/COMMIT.
alter table public.research_classroom_observation_summary_revisions enable trigger research_classroom_observation_summary_revisions_no_delete;
alter table public.research_classroom_observations enable trigger research_classroom_observations_no_delete;
alter table public.research_observation_setup_events enable trigger research_observation_setup_events_no_delete;
alter table public.research_case_protocol enable trigger research_case_protocol_no_delete;
alter table public.research_case_protocol_events enable trigger research_case_protocol_events_no_delete;
alter table public.research_protocol_checklist_events enable trigger research_protocol_checklist_events_no_delete;
alter table public.research_case_phase_events enable trigger research_case_phase_events_no_delete;
alter table public.research_tasks enable trigger research_tasks_no_delete;
alter table public.research_measure_events enable trigger research_measure_events_no_delete;
alter table public.research_coaching_contacts enable trigger research_coaching_contacts_no_delete;
alter table public.research_study_events enable trigger research_study_events_no_delete;
alter table public.mr_procedural_fidelity_reviews enable trigger mr_procedural_fidelity_append_only;
alter table public.case_game_content_versions enable trigger case_game_content_versions_immutable;
alter table public.research_intervention_launch_events enable trigger research_intervention_launch_events_immutable;
alter table public.participant_study_day_status_events enable trigger participant_study_day_status_events_immutable;

-- PRE-COMMIT VERIFICATION. Every boolean must be true and orphan counts must be 0.
select exists(select 1 from public.cases c join public.participants p on p.case_id=c.id where c.case_code='CASE-998' and p.participant_code='MR-998') as protected_mr_998_exists;
select exists(select 1 from public.cases c join public.participants p on p.case_id=c.id where c.case_code='CASE-DEMO-2' and p.participant_code='MR-DEMO-2') as protected_mr_demo_2_exists;
select not exists(select 1 from public.cases c join cleanup_case_allowlist a on a.case_code=c.case_code) as targeted_obsolete_cases_gone;
select not exists(select 1 from public.participants p join cleanup_case_allowlist a on a.participant_code=p.participant_code) as targeted_obsolete_participants_gone;
select count(*) as orphan_participant_case_references
from public.participants p left join public.cases c on c.id=p.case_id where c.id is null;

-- These fake teacher/auth accounts may be manually removed after case cleanup.
-- Research Admin profiles are excluded and must remain untouched.
-- This report is informational: this script never deletes profiles or auth.users.
select profile_id, email, role, auth_user_id
from cleanup_fake_teacher_accounts order by email;

-- REHEARSAL DEFAULT. Change only this final statement to COMMIT after review.
rollback;
