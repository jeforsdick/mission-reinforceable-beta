-- Private, transactional research-admin intake review and case preparation.
-- Applying this migration does not provision anything or activate intervention.

do $$
declare missing_columns text;
begin
  select string_agg(required.column_name, ', ' order by required.column_name)
  into missing_columns
  from (values
    ('request_id'), ('status'), ('converted_case_id'), ('converted_at'), ('submitted_at'),
    ('teacher_name'), ('teacher_email'), ('coach_name'), ('coach_email'),
    ('grade_level'), ('student_initials'), ('target_behavior'), ('behavior_topography'),
    ('primary_function'), ('replacement_behavior'), ('desired_behavior'),
    ('prevention_strategies'), ('teaching_strategies'), ('reinforcement_system'),
    ('response_strategy'), ('has_crisis_plan'), ('crisis_plan'), ('typical_settings'),
    ('common_triggers'), ('typical_antecedents'), ('typical_consequences'),
    ('current_staff_responses'), ('requested_scenarios'), ('additional_context')
  ) required(column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'intake_requests'
      and c.column_name = required.column_name
  );
  if missing_columns is not null then
    raise exception 'intake_requests is missing required onboarding columns: %', missing_columns;
  end if;
end;
$$;

-- Provisioning depends on these verified legacy columns and relationships. Fail
-- before creating any onboarding objects rather than guessing or altering them.
do $$
declare missing_columns text;
begin
  select string_agg(required.table_name || '.' || required.column_name, ', ' order by required.table_name, required.column_name)
  into missing_columns
  from (values
    ('cases', 'case_code'), ('cases', 'student_alias'), ('cases', 'active'),
    ('participants', 'auth_user_id'), ('participants', 'participant_code'),
    ('participants', 'case_id'), ('participants', 'active'),
    ('case_intake', 'status')
  ) required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = required.table_name
      and c.column_name = required.column_name
  );
  if missing_columns is not null then
    raise exception 'onboarding legacy schema is missing required columns: %', missing_columns;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class t on t.oid = i.indrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = t.oid and a.attnum = any(i.indkey)
    where n.nspname = 'public' and t.relname = 'cases' and a.attname = 'case_code'
      and i.indisunique and i.indpred is null and i.indexprs is null and i.indnkeyatts = 1
  ) then raise exception 'onboarding requires a unique cases.case_code constraint'; end if;

  if not exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class t on t.oid = i.indrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = t.oid and a.attnum = any(i.indkey)
    where n.nspname = 'public' and t.relname = 'participants' and a.attname = 'auth_user_id'
      and i.indisunique and i.indpred is null and i.indexprs is null and i.indnkeyatts = 1
  ) then raise exception 'onboarding requires a unique participants.auth_user_id constraint'; end if;

  if not exists (
    select 1 from pg_catalog.pg_index i
    join pg_catalog.pg_class t on t.oid = i.indrelid
    join pg_catalog.pg_namespace n on n.oid = t.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid = t.oid and a.attnum = any(i.indkey)
    where n.nspname = 'public' and t.relname = 'participants' and a.attname = 'participant_code'
      and i.indisunique and i.indpred is null and i.indexprs is null and i.indnkeyatts = 1
  ) then raise exception 'onboarding requires a unique participants.participant_code constraint'; end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint fk
    join pg_catalog.pg_class source_table on source_table.oid = fk.conrelid
    join pg_catalog.pg_namespace source_schema on source_schema.oid = source_table.relnamespace
    join pg_catalog.pg_class target_table on target_table.oid = fk.confrelid
    join pg_catalog.pg_namespace target_schema on target_schema.oid = target_table.relnamespace
    join pg_catalog.pg_attribute source_column on source_column.attrelid = source_table.oid
      and source_column.attnum = fk.conkey[1]
    join pg_catalog.pg_attribute target_column on target_column.attrelid = target_table.oid
      and target_column.attnum = fk.confkey[1]
    where fk.contype = 'f' and cardinality(fk.conkey) = 1
      and source_schema.nspname = 'public' and source_table.relname = 'participants'
      and source_column.attname = 'auth_user_id'
      and target_schema.nspname = 'auth' and target_table.relname = 'users'
      and target_column.attname = 'id'
  ) then raise exception 'onboarding requires participants.auth_user_id to reference auth.users(id)'; end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint fk
    join pg_catalog.pg_class source_table on source_table.oid = fk.conrelid
    join pg_catalog.pg_namespace source_schema on source_schema.oid = source_table.relnamespace
    join pg_catalog.pg_class target_table on target_table.oid = fk.confrelid
    join pg_catalog.pg_namespace target_schema on target_schema.oid = target_table.relnamespace
    join pg_catalog.pg_attribute source_column on source_column.attrelid = source_table.oid
      and source_column.attnum = fk.conkey[1]
    join pg_catalog.pg_attribute target_column on target_column.attrelid = target_table.oid
      and target_column.attnum = fk.confkey[1]
    where fk.contype = 'f' and cardinality(fk.conkey) = 1
      and source_schema.nspname = 'public' and source_table.relname = 'participants'
      and source_column.attname = 'case_id'
      and target_schema.nspname = 'public' and target_table.relname = 'cases'
      and target_column.attname = 'id'
  ) then raise exception 'onboarding requires participants.case_id to reference public.cases(id)'; end if;
end;
$$;

create table public.research_onboarding_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id),
  action_type text not null check (action_type in ('intake_approved', 'intake_declined', 'case_provisioned')),
  request_id uuid not null,
  case_id uuid references public.cases(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.research_onboarding_actions enable row level security;
revoke all on table public.research_onboarding_actions from anon, authenticated;
grant select on table public.research_onboarding_actions to authenticated;
create policy "Research admins read onboarding actions"
on public.research_onboarding_actions for select to authenticated
using ((select public.is_research_admin()));

create function public.research_admin_intakes()
returns setof public.intake_requests
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  return query select i.* from public.intake_requests i order by i.submitted_at desc;
end;
$$;

-- Exact normalized-email profile match only; this never exposes an Auth user list.
create function public.research_admin_account_readiness(target_email text)
returns table (profile_id uuid, role text, active boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_email is null or target_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid email required' using errcode = '22023';
  end if;
  return query select p.id, p.role, p.active from public.profiles p
  where lower(btrim(p.email)) = lower(btrim(target_email));
end;
$$;

create function public.research_admin_set_intake_status(target_request_id uuid, target_status text)
returns text language plpgsql security definer set search_path = ''
as $$
declare current_status text;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_request_id is null or target_status not in ('approved', 'declined') then
    raise exception 'invalid intake status request' using errcode = '22023';
  end if;
  select i.status into current_status from public.intake_requests i
  where i.request_id = target_request_id for update;
  if not found then raise exception 'intake not found' using errcode = 'P0002'; end if;
  if current_status <> 'submitted' then raise exception 'only submitted intakes may be reviewed' using errcode = '22023'; end if;
  update public.intake_requests set status = target_status where request_id = target_request_id;
  insert into public.research_onboarding_actions(actor_user_id, action_type, request_id)
  values (auth.uid(), 'intake_' || target_status, target_request_id);
  return target_status;
end;
$$;

create function public.provision_intake_case(
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
  if coach.role <> 'coach' or not coach.active then
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
    has_crisis_plan, crisis_plan, typical_settings, common_triggers, typical_antecedents,
    typical_consequences, current_staff_responses, requested_scenarios, additional_context,
    status, submitted_by, submitted_at
  ) values (
    created_case_id, intake.teacher_name, intake.teacher_email, intake.coach_name, intake.coach_email,
    intake.grade_level, intake.student_initials, intake.target_behavior, intake.behavior_topography,
    intake.primary_function, intake.replacement_behavior, intake.desired_behavior,
    intake.prevention_strategies, intake.teaching_strategies, intake.reinforcement_system,
    intake.response_strategy, intake.has_crisis_plan, intake.crisis_plan, intake.typical_settings,
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

create function public.research_admin_case_readiness(target_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'case', jsonb_build_object('id', c.id, 'case_code', c.case_code, 'student_alias', c.student_alias, 'active', c.active),
    'participant', case when p.id is null then null else jsonb_build_object('id', p.id, 'auth_user_id', p.auth_user_id, 'participant_code', p.participant_code, 'active', p.active) end,
    'intake_snapshot', exists(select 1 from public.case_intake ci where ci.case_id = c.id),
    'fidelity_target_count', (select count(*) from public.fidelity_targets ft where ft.case_id = c.id and ft.active),
    'coach', (select jsonb_build_object('coach_user_id', cc.coach_user_id, 'active', cc.active, 'primary_coach', cc.primary_coach) from public.case_coaches cc where cc.case_id = c.id and cc.active and cc.primary_coach limit 1),
    'protected_content', (select jsonb_build_object('present', true, 'version', gc.version, 'updated_at', gc.updated_at) from public.case_game_content gc where gc.case_id = c.id),
    'reminders', (select jsonb_build_object('enabled', rs.enabled) from public.teacher_reminder_settings rs where rs.participant_id = p.id)
  ) into result
  from public.intake_requests i join public.cases c on c.id = i.converted_case_id
  left join public.participants p on p.case_id = c.id
  where i.request_id = target_request_id and i.status = 'converted';
  if result is null then raise exception 'converted intake readiness not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.research_admin_intakes() from public;
revoke all on function public.research_admin_account_readiness(text) from public;
revoke all on function public.research_admin_set_intake_status(uuid, text) from public;
revoke all on function public.provision_intake_case(uuid, text, text, text, jsonb) from public;
revoke all on function public.research_admin_case_readiness(uuid) from public;
grant execute on function public.research_admin_intakes() to authenticated;
grant execute on function public.research_admin_account_readiness(text) to authenticated;
grant execute on function public.research_admin_set_intake_status(uuid, text) to authenticated;
grant execute on function public.provision_intake_case(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.research_admin_case_readiness(uuid) to authenticated;

comment on table public.research_onboarding_actions is 'Minimal onboarding audit trail; contains no behavior-plan text.';
comment on function public.provision_intake_case(uuid, text, text, text, jsonb) is
'Atomically prepares an inactive case and linked inactive participant; never activates intervention or reminders.';
