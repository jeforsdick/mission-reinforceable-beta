-- Protected corrections to submitted intakes before study case setup.
do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_constraint c
  join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relname = 'research_onboarding_actions'
    and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%action_type%';
  if constraint_name is not null then execute format('alter table public.research_onboarding_actions drop constraint %I', constraint_name); end if;
end $$;
alter table public.research_onboarding_actions add constraint research_onboarding_actions_action_type_check
  check (action_type in ('intake_approved', 'intake_declined', 'case_provisioned',
    'teacher_account_created', 'coach_account_created', 'qa_login_link_generated', 'intake_edited'));

create function public.research_admin_update_intake(target_request_id uuid, intake_changes jsonb)
returns public.intake_requests
language plpgsql security definer set search_path = ''
as $$
declare
  intake public.intake_requests%rowtype;
  updated_intake public.intake_requests%rowtype;
  allowed_keys constant text[] := array[
    'teacher_name','teacher_email','coach_name','coach_email','grade_level','student_initials',
    'student_strengths','preferred_items_activities','target_behavior','behavior_topography',
    'primary_function','replacement_behavior','desired_behavior','prevention_strategies',
    'teaching_strategies','reinforcement_system','response_strategy','has_crisis_plan','crisis_plan',
    'typical_settings','common_triggers','typical_antecedents','typical_consequences',
    'current_staff_responses','requested_scenarios','additional_context'
  ];
  required_keys constant text[] := array[
    'teacher_name','teacher_email','coach_name','coach_email','grade_level','student_initials',
    'target_behavior','behavior_topography','primary_function','replacement_behavior','desired_behavior',
    'typical_settings','common_triggers','typical_antecedents','typical_consequences','current_staff_responses'
  ];
  key text;
  teacher_email_value text;
  coach_email_value text;
  crisis_value boolean;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if intake_changes is null or jsonb_typeof(intake_changes) <> 'object' then raise exception 'intake changes are required' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_object_keys(intake_changes) as keys(key) where not (key = any(allowed_keys))) then
    raise exception 'unsupported intake field' using errcode = '22023';
  end if;

  select i.* into intake from public.intake_requests i where i.request_id = target_request_id for update;
  if not found then raise exception 'intake request not found' using errcode = 'P0002'; end if;
  if intake.converted_case_id is not null then raise exception 'Intake is locked after study case setup.' using errcode = '55000'; end if;
  if intake.status not in ('submitted', 'approved') then raise exception 'only submitted or approved intakes may be edited' using errcode = '55000'; end if;

  foreach key in array required_keys loop
    if not (intake_changes ? key) or nullif(btrim(intake_changes->>key), '') is null then
      raise exception '% is required', key using errcode = '22023';
    end if;
  end loop;
  teacher_email_value := lower(btrim(intake_changes->>'teacher_email'));
  coach_email_value := lower(btrim(intake_changes->>'coach_email'));
  if teacher_email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coach_email_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid teacher and coach emails are required' using errcode = '22023';
  end if;
  -- An existing compatible account stays attached to its current email; this RPC never writes Auth or profiles.
  if teacher_email_value <> lower(btrim(intake.teacher_email)) and exists (
    select 1 from public.profiles p where lower(btrim(p.email)) = lower(btrim(intake.teacher_email)) and p.role = 'teacher' and p.active
  ) then raise exception 'An account already exists for this email.' using errcode = '55000'; end if;
  if coach_email_value <> lower(btrim(intake.coach_email)) and exists (
    select 1 from public.profiles p where lower(btrim(p.email)) = lower(btrim(intake.coach_email)) and p.role in ('coach','research_admin') and p.active
  ) then raise exception 'An account already exists for this email.' using errcode = '55000'; end if;
  crisis_value := coalesce((intake_changes->>'has_crisis_plan')::boolean, false);
  if crisis_value and nullif(btrim(intake_changes->>'crisis_plan'), '') is null then
    raise exception 'crisis_plan is required when a crisis plan is selected' using errcode = '22023';
  end if;

  update public.intake_requests set
    teacher_name=btrim(intake_changes->>'teacher_name'), teacher_email=teacher_email_value,
    coach_name=btrim(intake_changes->>'coach_name'), coach_email=coach_email_value,
    grade_level=btrim(intake_changes->>'grade_level'), student_initials=btrim(intake_changes->>'student_initials'),
    student_strengths=nullif(btrim(intake_changes->>'student_strengths'),''), preferred_items_activities=nullif(btrim(intake_changes->>'preferred_items_activities'),''),
    target_behavior=btrim(intake_changes->>'target_behavior'), behavior_topography=btrim(intake_changes->>'behavior_topography'),
    primary_function=btrim(intake_changes->>'primary_function'), replacement_behavior=btrim(intake_changes->>'replacement_behavior'), desired_behavior=btrim(intake_changes->>'desired_behavior'),
    prevention_strategies=nullif(btrim(intake_changes->>'prevention_strategies'),''), teaching_strategies=nullif(btrim(intake_changes->>'teaching_strategies'),''),
    reinforcement_system=nullif(btrim(intake_changes->>'reinforcement_system'),''), response_strategy=nullif(btrim(intake_changes->>'response_strategy'),''),
    has_crisis_plan=crisis_value, crisis_plan=case when crisis_value then btrim(intake_changes->>'crisis_plan') else null end,
    typical_settings=btrim(intake_changes->>'typical_settings'), common_triggers=btrim(intake_changes->>'common_triggers'), typical_antecedents=btrim(intake_changes->>'typical_antecedents'),
    typical_consequences=btrim(intake_changes->>'typical_consequences'), current_staff_responses=btrim(intake_changes->>'current_staff_responses'),
    requested_scenarios=nullif(btrim(intake_changes->>'requested_scenarios'),''), additional_context=nullif(btrim(intake_changes->>'additional_context'),''),
    status='submitted'
  where request_id=target_request_id returning * into updated_intake;

  insert into public.research_onboarding_actions(actor_user_id, action_type, request_id)
  values (auth.uid(), 'intake_edited', target_request_id);
  return updated_intake;
end;
$$;

revoke all on function public.research_admin_update_intake(uuid, jsonb) from public;
grant execute on function public.research_admin_update_intake(uuid, jsonb) to authenticated;
comment on function public.research_admin_update_intake(uuid, jsonb) is
  'Research-admin-only intake corrections before conversion. Resets approval and records metadata-only audit history.';
