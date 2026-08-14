-- Backward-compatible intake workflow additions. Existing rows remain untouched.
alter table public.intake_requests
  add column if not exists student_strengths text,
  add column if not exists preferred_items_activities text,
  add column if not exists preference_assessment_notes text;
alter table public.case_intake
  add column if not exists student_strengths text,
  add column if not exists preferred_items_activities text,
  add column if not exists preference_assessment_notes text;
alter table public.intake_requests
  alter column prevention_strategies drop not null,
  alter column teaching_strategies drop not null,
  alter column reinforcement_system drop not null,
  alter column response_strategy drop not null;
alter table public.case_intake
  alter column prevention_strategies drop not null,
  alter column teaching_strategies drop not null,
  alter column reinforcement_system drop not null,
  alter column response_strategy drop not null;

-- Preserve the existing audit records while broadening only the allowed action vocabulary.
do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_constraint c
  join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relname = 'research_onboarding_actions'
    and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%action_type%';
  if constraint_name is not null then execute format('alter table public.research_onboarding_actions drop constraint %I', constraint_name); end if;
end $$;
alter table public.research_onboarding_actions add constraint research_onboarding_actions_action_type_check
  check (action_type in ('intake_approved', 'intake_declined', 'case_provisioned',
    'teacher_account_created', 'coach_account_created', 'qa_login_link_generated'));

create or replace function public.provision_intake_case(
  target_request_id uuid,
  study_id text,
  new_case_code text,
  student_game_alias text,
  reviewed_targets jsonb
)
returns table (case_id uuid, participant_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  intake public.intake_requests%rowtype;
  teacher public.profiles%rowtype;
  coach public.profiles%rowtype;
  teacher_matches integer;
  coach_matches integer;
  created_case_id uuid;
  created_participant_id uuid;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_request_id is null then raise exception 'request ID is required' using errcode = '22023'; end if;
  if study_id is null or study_id !~ '^MR-[0-9]{3}$' then raise exception 'Study ID must match MR-###' using errcode = '22023'; end if;
  if new_case_code is null or new_case_code !~ '^CASE-[0-9]{3}$' then raise exception 'Case code must match CASE-###' using errcode = '22023'; end if;
  if nullif(btrim(student_game_alias), '') is null then raise exception 'student game alias is required' using errcode = '22023'; end if;
  if jsonb_typeof(reviewed_targets) <> 'array' or jsonb_array_length(reviewed_targets) = 0 then
    raise exception 'reviewed fidelity targets are required' using errcode = '22023';
  end if;

  select i.* into intake from public.intake_requests i
  where i.request_id = target_request_id for update;
  if not found then raise exception 'intake not found' using errcode = 'P0002'; end if;
  if intake.status <> 'approved' or intake.converted_case_id is not null then
    raise exception 'intake must be approved and unconverted' using errcode = '22023';
  end if;

  select count(*) into teacher_matches from public.profiles p
  where lower(btrim(p.email)) = lower(btrim(intake.teacher_email));
  if teacher_matches <> 1 then raise exception 'teacher account not ready' using errcode = '22023'; end if;
  select p.* into teacher from public.profiles p where lower(btrim(p.email)) = lower(btrim(intake.teacher_email));
  if teacher.role <> 'teacher' or not teacher.active then
    raise exception 'teacher account not ready' using errcode = '22023';
  end if;
  if exists (select 1 from public.participants p where p.auth_user_id = teacher.id) then
    raise exception 'teacher account is already linked to a participant' using errcode = '23505';
  end if;

  select count(*) into coach_matches from public.profiles p
  where lower(btrim(p.email)) = lower(btrim(intake.coach_email));
  if coach_matches <> 1 then raise exception 'coach account not ready' using errcode = '22023'; end if;
  select p.* into coach from public.profiles p where lower(btrim(p.email)) = lower(btrim(intake.coach_email));
  if coach.role not in ('coach', 'research_admin') or not coach.active then
    raise exception 'coach account not ready' using errcode = '22023';
  end if;
  if exists (select 1 from public.participants p where p.participant_code = study_id) then raise exception 'Study ID is already used' using errcode = '23505'; end if;
  if exists (select 1 from public.cases c where c.case_code = new_case_code) then raise exception 'case code is already used' using errcode = '23505'; end if;

  if exists (
    select 1 from jsonb_array_elements(reviewed_targets) t
    where jsonb_typeof(t) <> 'object'
      or t->>'domain' not in ('proactive','teaching','reinforcement','response','crisis')
      or nullif(btrim(t->>'description'), '') is null
      or ((t->>'domain') = 'crisis' and not intake.has_crisis_plan)
  ) then raise exception 'invalid reviewed fidelity target' using errcode = '22023'; end if;
  if exists (
    select 1 from unnest(array['proactive','teaching','reinforcement','response']) d
    where not exists (select 1 from jsonb_array_elements(reviewed_targets) t where t->>'domain' = d)
  ) then raise exception 'each required fidelity domain needs a target' using errcode = '22023'; end if;

  insert into public.cases(case_code, student_alias, active)
  values (new_case_code, btrim(student_game_alias), false) returning id into created_case_id;
  insert into public.participants(auth_user_id, participant_code, case_id, active)
  values (teacher.id, study_id, created_case_id, false) returning id into created_participant_id;
  insert into public.case_intake(
    case_id, teacher_name, teacher_email, coach_name, coach_email, grade_level, student_initials,
    target_behavior, behavior_topography, primary_function, replacement_behavior, desired_behavior,
    prevention_strategies, teaching_strategies, reinforcement_system, response_strategy,
    student_strengths, preferred_items_activities, preference_assessment_notes, has_crisis_plan, crisis_plan, typical_settings, common_triggers, typical_antecedents,
    typical_consequences, current_staff_responses, requested_scenarios, additional_context,
    status, submitted_by, submitted_at
  ) values (
    created_case_id, intake.teacher_name, intake.teacher_email, intake.coach_name, intake.coach_email,
    intake.grade_level, intake.student_initials, intake.target_behavior, intake.behavior_topography,
    intake.primary_function, intake.replacement_behavior, intake.desired_behavior,
    intake.prevention_strategies, intake.teaching_strategies, intake.reinforcement_system,
    intake.response_strategy, intake.student_strengths, intake.preferred_items_activities,
    intake.preference_assessment_notes, intake.has_crisis_plan, intake.crisis_plan, intake.typical_settings,
    intake.common_triggers, intake.typical_antecedents, intake.typical_consequences,
    intake.current_staff_responses, intake.requested_scenarios, intake.additional_context,
    'submitted', auth.uid(), now()
  );
  insert into public.fidelity_targets(case_id, domain, description, sort_order, target_key, active)
  select created_case_id, t.domain, t.description, t.domain_order,
    t.domain || '_' || lpad(t.domain_order::text, 2, '0'), true
  from (
    select item->>'domain' domain, btrim(item->>'description') description,
      row_number() over (partition by item->>'domain' order by ordinal)::integer domain_order
    from jsonb_array_elements(reviewed_targets) with ordinality source(item, ordinal)
  ) t;
  insert into public.case_coaches(case_id, coach_user_id, primary_coach, active)
  values (created_case_id, coach.id, true, true);
  update public.intake_requests set status = 'converted', converted_case_id = created_case_id, converted_at = now()
  where request_id = target_request_id;
  insert into public.research_onboarding_actions(actor_user_id, action_type, request_id, case_id)
  values (auth.uid(), 'case_provisioned', target_request_id, created_case_id);
  return query select created_case_id, created_participant_id;
end;
$$;


comment on function public.provision_intake_case(uuid, text, text, text, jsonb) is
'Atomically prepares an inactive case, accepts an active coach or named research admin, and never activates intervention or reminders.';
