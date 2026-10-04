
-- Live observer collection V2.
-- Additive workflow: assigned observers collect raw item/interval data here,
-- then finalized sessions write the canonical dissertation summary into the
-- existing research_classroom_observations + summary revision tables.

create table if not exists public.research_observation_records_v2 (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.research_observation_schedule_slots(id) on delete restrict,
  case_id uuid not null,
  observer_id uuid not null references public.research_observers(id) on delete restrict,
  observer_role text not null check (observer_role in ('primary','secondary')),
  status text not null default 'draft' check (status in ('draft','submitted')),
  observation_date date not null,
  phase text not null check (phase in ('baseline','intervention','maintenance')),
  target_routine_snapshot text not null,
  target_behavior_definition_snapshot text not null,
  fidelity_target_snapshot jsonb not null check (jsonb_typeof(fidelity_target_snapshot) = 'array'),
  fidelity_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(fidelity_scores) = 'object'),
  interval_seconds smallint not null default 15 check (interval_seconds = 15),
  interval_count smallint not null default 120 check (interval_count = 120),
  interval_scores jsonb not null default '[]'::jsonb check (jsonb_typeof(interval_scores) = 'array'),
  teacher_fidelity_percent numeric(5,2) check (teacher_fidelity_percent between 0 and 100),
  student_target_behavior_percent numeric(5,2) check (student_target_behavior_percent between 0 and 100),
  started_at timestamptz not null default now(),
  collection_ended_at timestamptz,
  submitted_at timestamptz,
  observation_note text check (length(observation_note) <= 1000),
  auth_user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, observer_id)
);

create table if not exists public.research_observation_comparisons_v2 (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null unique references public.research_observation_schedule_slots(id) on delete restrict,
  primary_record_id uuid not null references public.research_observation_records_v2(id) on delete restrict,
  secondary_record_id uuid not null references public.research_observation_records_v2(id) on delete restrict,
  secondary_role text not null check (secondary_role in ('formal_ioa','supported_calibration','calibration_and_ioa')),
  counts_toward_ioa boolean not null,
  teacher_fidelity_ioa_percent numeric(5,2) not null check (teacher_fidelity_ioa_percent between 0 and 100),
  student_behavior_ioa_percent numeric(5,2) not null check (student_behavior_ioa_percent between 0 and 100),
  teacher_agreements smallint not null check (teacher_agreements >= 0),
  teacher_disagreements smallint not null check (teacher_disagreements >= 0),
  student_agreements smallint not null check (student_agreements >= 0),
  student_disagreements smallint not null check (student_disagreements >= 0),
  excluded_intervals smallint not null check (excluded_intervals >= 0),
  calculated_at timestamptz not null default now()
);

create index if not exists research_observation_records_v2_slot_idx
  on public.research_observation_records_v2(slot_id);
create index if not exists research_observation_records_v2_observer_idx
  on public.research_observation_records_v2(observer_id, observation_date desc);
create index if not exists research_observation_records_v2_status_idx
  on public.research_observation_records_v2(status, observation_date);

alter table public.research_observation_records_v2 enable row level security;
alter table public.research_observation_comparisons_v2 enable row level security;

revoke all on public.research_observation_records_v2 from anon, authenticated;
revoke all on public.research_observation_comparisons_v2 from anon, authenticated;
grant select on public.research_observation_records_v2 to authenticated;
grant select on public.research_observation_comparisons_v2 to authenticated;

drop policy if exists "Observers read own live observation records" on public.research_observation_records_v2;
create policy "Observers read own live observation records"
on public.research_observation_records_v2
for select
to authenticated
using (
  observer_id = (
    select a.observer_id
    from public.research_observer_accounts a
    where a.auth_user_id = (select auth.uid())
      and a.active = true
    limit 1
  )
  or (select public.is_research_admin())
);

drop policy if exists "Research admins read live observation comparisons" on public.research_observation_comparisons_v2;
create policy "Research admins read live observation comparisons"
on public.research_observation_comparisons_v2
for select
to authenticated
using ((select public.is_research_admin()));

create or replace function public.research_observer_observation_packet(target_slot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  observer public.research_observers%rowtype;
  setup public.research_observation_setup%rowtype;
  record public.research_observation_records_v2%rowtype;
  resolved_phase text;
  role_name text;
  clearance text;
  target_snapshot jsonb;
  partner_status text;
  partner_observer_id uuid;
begin
  select a.observer_id
    into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id = auth.uid()
    and a.active = true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  select * into slot
  from public.research_observation_schedule_slots
  where id = target_slot_id;

  if slot.id is null then
    raise exception 'observation session not found' using errcode='P0002';
  end if;

  if current_observer_id = slot.primary_observer_id then
    role_name := 'primary';
    partner_observer_id := slot.secondary_observer_id;
  elsif current_observer_id = slot.secondary_observer_id then
    role_name := 'secondary';
    partner_observer_id := slot.primary_observer_id;
  else
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  select * into observer
  from public.research_observers
  where id = current_observer_id and active = true;

  if observer.id is null then
    raise exception 'active observer roster record required' using errcode='42501';
  end if;

  clearance := public.research_observer_status(current_observer_id, slot.observation_date);

  select * into setup
  from public.research_observation_setup
  where case_id = slot.case_id;

  select e.phase into resolved_phase
  from public.research_case_phase_events e
  where e.case_id = slot.case_id
    and e.effective_date <= slot.observation_date
  order by e.effective_date desc, e.recorded_at desc, e.id desc
  limit 1;
  resolved_phase := coalesce(resolved_phase, 'prebaseline');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'target_key', f.target_key,
        'domain', f.domain,
        'description', f.description,
        'sort_order', f.sort_order
      )
      order by f.sort_order, f.target_key, f.id
    ),
    '[]'::jsonb
  )
  into target_snapshot
  from public.fidelity_targets f
  where f.case_id = slot.case_id
    and f.active = true;

  select * into record
  from public.research_observation_records_v2 r
  where r.slot_id = slot.id
    and r.observer_id = current_observer_id;

  select r.status into partner_status
  from public.research_observation_records_v2 r
  where r.slot_id = slot.id
    and r.observer_id = partner_observer_id;

  return jsonb_build_object(
    'observer', jsonb_build_object(
      'id', observer.id,
      'display_name', observer.display_name,
      'observer_code', observer.observer_code,
      'observer_type', observer.observer_type,
      'role', role_name,
      'clearance', clearance
    ),
    'slot', jsonb_build_object(
      'id', slot.id,
      'case_id', slot.case_id,
      'case_code', slot.case_code_snapshot,
      'observation_date', slot.observation_date,
      'planned_start_time', slot.planned_start_time,
      'planned_end_time', slot.planned_end_time,
      'status', slot.status,
      'attendance_status', slot.attendance_status,
      'secondary_role', slot.secondary_role,
      'routine_label', coalesce(slot.routine_label_snapshot, setup.target_routine),
      'observation_id', slot.observation_id
    ),
    'phase', resolved_phase,
    'setup', case when setup.case_id is null then null else jsonb_build_object(
      'target_routine', setup.target_routine,
      'target_behavior_definition', setup.target_behavior_definition
    ) end,
    'fidelity_targets', case
      when record.id is not null then record.fidelity_target_snapshot
      else target_snapshot
    end,
    'record', case when record.id is null then null else jsonb_build_object(
      'id', record.id,
      'status', record.status,
      'started_at', record.started_at,
      'collection_ended_at', record.collection_ended_at,
      'submitted_at', record.submitted_at,
      'fidelity_scores', record.fidelity_scores,
      'interval_scores', record.interval_scores,
      'teacher_fidelity_percent', record.teacher_fidelity_percent,
      'student_target_behavior_percent', record.student_target_behavior_percent,
      'observation_note', record.observation_note
    ) end,
    'partner_submission_status', partner_status,
    'ready_to_start', (
      setup.case_id is not null
      and jsonb_array_length(target_snapshot) > 0
      and resolved_phase in ('baseline','intervention','maintenance')
      and clearance = 'qualified'
      and slot.status in ('scheduled','confirmed')
    )
  );
end
$function$;

create or replace function public.research_observer_start_observation(target_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  setup public.research_observation_setup%rowtype;
  existing public.research_observation_records_v2%rowtype;
  result public.research_observation_records_v2%rowtype;
  observer_role_name text;
  resolved_phase text;
  target_snapshot jsonb;
  denver_today date := (now() at time zone 'America/Denver')::date;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id = auth.uid() and a.active = true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  select * into slot
  from public.research_observation_schedule_slots
  where id = target_slot_id
  for update;

  if slot.id is null then
    raise exception 'observation session not found' using errcode='P0002';
  end if;

  if current_observer_id = slot.primary_observer_id then
    observer_role_name := 'primary';
  elsif current_observer_id = slot.secondary_observer_id then
    observer_role_name := 'secondary';
  else
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  select * into existing
  from public.research_observation_records_v2
  where slot_id = slot.id and observer_id = current_observer_id;

  if existing.id is not null then
    return to_jsonb(existing);
  end if;

  if slot.status not in ('scheduled','confirmed') then
    raise exception 'this session is not available to start' using errcode='55000';
  end if;

  if slot.observation_date <> denver_today then
    raise exception 'live observation can only be started on its scheduled date' using errcode='55000';
  end if;

  if public.research_observer_status(current_observer_id, slot.observation_date) <> 'qualified' then
    raise exception 'observer is not cleared for live observation on this date' using errcode='55000';
  end if;

  if observer_role_name = 'primary' and not exists (
    select 1 from public.research_observers o
    where o.id = current_observer_id
      and o.active = true
      and o.observer_type = 'trained_observer'
  ) then
    raise exception 'primary live collection must be completed by a cleared trained observer' using errcode='55000';
  end if;

  select * into setup
  from public.research_observation_setup
  where case_id = slot.case_id;

  if setup.case_id is null then
    raise exception 'observation setup is required before collection begins' using errcode='55000';
  end if;

  select e.phase into resolved_phase
  from public.research_case_phase_events e
  where e.case_id = slot.case_id
    and e.effective_date <= slot.observation_date
  order by e.effective_date desc, e.recorded_at desc, e.id desc
  limit 1;
  resolved_phase := coalesce(resolved_phase, 'prebaseline');

  if resolved_phase not in ('baseline','intervention','maintenance') then
    raise exception 'observations are not allowed during phase %', resolved_phase using errcode='55000';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'target_key', f.target_key,
        'domain', f.domain,
        'description', f.description,
        'sort_order', f.sort_order
      )
      order by f.sort_order, f.target_key, f.id
    ),
    '[]'::jsonb
  )
  into target_snapshot
  from public.fidelity_targets f
  where f.case_id = slot.case_id
    and f.active = true;

  if jsonb_array_length(target_snapshot) = 0 then
    raise exception 'active fidelity checklist is required before collection begins' using errcode='55000';
  end if;

  insert into public.research_observation_records_v2(
    slot_id, case_id, observer_id, observer_role, observation_date, phase,
    target_routine_snapshot, target_behavior_definition_snapshot,
    fidelity_target_snapshot, auth_user_id
  )
  values(
    slot.id, slot.case_id, current_observer_id, observer_role_name, slot.observation_date, resolved_phase,
    setup.target_routine, setup.target_behavior_definition,
    target_snapshot, auth.uid()
  )
  returning * into result;

  return to_jsonb(result);
end
$function$;

create or replace function public.research_observer_save_observation_draft(
  target_slot_id uuid,
  target_fidelity_scores jsonb,
  target_interval_scores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_observer_id uuid;
  result public.research_observation_records_v2%rowtype;
  score_value text;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id = auth.uid() and a.active = true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  if jsonb_typeof(target_fidelity_scores) <> 'object' then
    raise exception 'fidelity scores must be an object' using errcode='22023';
  end if;
  if jsonb_typeof(target_interval_scores) <> 'array' then
    raise exception 'interval scores must be an array' using errcode='22023';
  end if;
  if jsonb_array_length(target_interval_scores) > 120 then
    raise exception 'interval scores cannot exceed 120 intervals' using errcode='22023';
  end if;

  for score_value in select value #>> '{}' from jsonb_array_elements(target_interval_scores)
  loop
    if score_value not in ('occurred','did_not_occur','not_observed') then
      raise exception 'invalid interval score' using errcode='22023';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_each_text(target_fidelity_scores) s
    where s.value not in ('implemented','not_implemented','no_opportunity')
  ) then
    raise exception 'invalid fidelity score' using errcode='22023';
  end if;

  update public.research_observation_records_v2 r
  set fidelity_scores = target_fidelity_scores,
      interval_scores = target_interval_scores,
      updated_at = now()
  where r.slot_id = target_slot_id
    and r.observer_id = current_observer_id
    and r.status = 'draft'
  returning * into result;

  if result.id is null then
    raise exception 'active observation draft not found' using errcode='P0002';
  end if;

  return jsonb_build_object(
    'id', result.id,
    'status', result.status,
    'updated_at', result.updated_at
  );
end
$function$;

create or replace function public.research_observer_submit_observation(
  target_slot_id uuid,
  target_fidelity_scores jsonb,
  target_interval_scores jsonb,
  target_collection_ended_at timestamptz default null,
  target_observation_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  current_record public.research_observation_records_v2%rowtype;
  primary_record public.research_observation_records_v2%rowtype;
  secondary_record public.research_observation_records_v2%rowtype;
  target_item jsonb;
  target_id text;
  score_value text;
  interval_value text;
  implemented_count integer := 0;
  not_implemented_count integer := 0;
  scoreable_count integer := 0;
  occurred_count integer := 0;
  did_not_occur_count integer := 0;
  observed_interval_count integer := 0;
  fidelity_percent numeric;
  behavior_percent numeric;
  teacher_agreements integer := 0;
  teacher_disagreements integer := 0;
  student_agreements integer := 0;
  student_disagreements integer := 0;
  excluded_intervals integer := 0;
  teacher_ioa numeric;
  student_ioa numeric;
  counts_toward_ioa boolean := false;
  finalized_observation public.research_classroom_observations%rowtype;
  finalized_summary public.research_classroom_observation_summary_revisions%rowtype;
  next_session integer;
  index_value integer;
  primary_value text;
  secondary_value text;
  canonical_secondary uuid;
  canonical_teacher_ioa numeric;
  canonical_student_ioa numeric;
  canonical_ioa_note text;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id = auth.uid() and a.active = true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  select * into slot
  from public.research_observation_schedule_slots
  where id = target_slot_id
  for update;

  if slot.id is null then
    raise exception 'observation session not found' using errcode='P0002';
  end if;

  if current_observer_id <> slot.primary_observer_id
     and current_observer_id is distinct from slot.secondary_observer_id then
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  select * into current_record
  from public.research_observation_records_v2 r
  where r.slot_id = slot.id
    and r.observer_id = current_observer_id
  for update;

  if current_record.id is null then
    raise exception 'start the observation before submitting' using errcode='55000';
  end if;

  if current_record.status = 'submitted' then
    return jsonb_build_object(
      'record_id', current_record.id,
      'submitted', true,
      'waiting_for_partner', slot.secondary_observer_id is not null and slot.observation_id is null,
      'completed', slot.observation_id is not null,
      'observation_id', slot.observation_id
    );
  end if;

  if jsonb_typeof(target_fidelity_scores) <> 'object'
     or jsonb_typeof(target_interval_scores) <> 'array' then
    raise exception 'invalid observation payload' using errcode='22023';
  end if;

  if jsonb_array_length(target_interval_scores) <> current_record.interval_count then
    raise exception 'all 120 observation intervals must be resolved before submission' using errcode='22023';
  end if;

  for target_item in select value from jsonb_array_elements(current_record.fidelity_target_snapshot)
  loop
    target_id := target_item->>'id';
    score_value := target_fidelity_scores->>target_id;
    if score_value not in ('implemented','not_implemented','no_opportunity') then
      raise exception 'every fidelity checklist item must be resolved before submission' using errcode='22023';
    end if;
    if score_value = 'implemented' then implemented_count := implemented_count + 1; end if;
    if score_value = 'not_implemented' then not_implemented_count := not_implemented_count + 1; end if;
  end loop;

  if (
    select count(*)
    from jsonb_object_keys(target_fidelity_scores) k
  ) <> jsonb_array_length(current_record.fidelity_target_snapshot) then
    raise exception 'fidelity payload does not match the assigned checklist' using errcode='22023';
  end if;

  scoreable_count := implemented_count + not_implemented_count;
  if scoreable_count = 0 then
    raise exception 'at least one fidelity item must have an observable opportunity' using errcode='22023';
  end if;
  fidelity_percent := round(100.0 * implemented_count / scoreable_count, 2);

  for interval_value in select value #>> '{}' from jsonb_array_elements(target_interval_scores)
  loop
    if interval_value = 'occurred' then occurred_count := occurred_count + 1;
    elsif interval_value = 'did_not_occur' then did_not_occur_count := did_not_occur_count + 1;
    elsif interval_value <> 'not_observed' then
      raise exception 'invalid interval score' using errcode='22023';
    end if;
  end loop;

  observed_interval_count := occurred_count + did_not_occur_count;
  if observed_interval_count = 0 then
    raise exception 'at least one student-behavior interval must be observable' using errcode='22023';
  end if;
  behavior_percent := round(100.0 * occurred_count / observed_interval_count, 2);

  if length(target_observation_note) > 1000 then
    raise exception 'observation note exceeds 1000 characters' using errcode='22001';
  end if;

  if target_collection_ended_at is not null
     and target_collection_ended_at < current_record.started_at then
    raise exception 'collection end cannot precede collection start' using errcode='22023';
  end if;

  update public.research_observation_records_v2
  set fidelity_scores = target_fidelity_scores,
      interval_scores = target_interval_scores,
      teacher_fidelity_percent = fidelity_percent,
      student_target_behavior_percent = behavior_percent,
      collection_ended_at = coalesce(target_collection_ended_at, now()),
      observation_note = nullif(btrim(target_observation_note),''),
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  where id = current_record.id
  returning * into current_record;

  select * into primary_record
  from public.research_observation_records_v2 r
  where r.slot_id = slot.id and r.observer_id = slot.primary_observer_id;

  if slot.secondary_observer_id is not null then
    select * into secondary_record
    from public.research_observation_records_v2 r
    where r.slot_id = slot.id and r.observer_id = slot.secondary_observer_id;

    if primary_record.status is distinct from 'submitted'
       or secondary_record.status is distinct from 'submitted' then
      return jsonb_build_object(
        'record_id', current_record.id,
        'submitted', true,
        'waiting_for_partner', true,
        'completed', false
      );
    end if;

    for target_item in select value from jsonb_array_elements(primary_record.fidelity_target_snapshot)
    loop
      target_id := target_item->>'id';
      primary_value := primary_record.fidelity_scores->>target_id;
      secondary_value := secondary_record.fidelity_scores->>target_id;
      if primary_value is null or secondary_value is null then
        raise exception 'paired fidelity records are incomplete' using errcode='55000';
      elsif primary_value = secondary_value then
        teacher_agreements := teacher_agreements + 1;
      else
        teacher_disagreements := teacher_disagreements + 1;
      end if;
    end loop;

    if teacher_agreements + teacher_disagreements = 0 then
      raise exception 'paired fidelity agreement cannot be calculated' using errcode='55000';
    end if;
    teacher_ioa := round(
      100.0 * teacher_agreements / (teacher_agreements + teacher_disagreements),
      2
    );

    for index_value in 0..119 loop
      primary_value := primary_record.interval_scores->>index_value;
      secondary_value := secondary_record.interval_scores->>index_value;
      if primary_value is null or secondary_value is null
         or primary_value = 'not_observed' or secondary_value = 'not_observed' then
        excluded_intervals := excluded_intervals + 1;
      elsif primary_value = secondary_value then
        student_agreements := student_agreements + 1;
      else
        student_disagreements := student_disagreements + 1;
      end if;
    end loop;

    if student_agreements + student_disagreements = 0 then
      raise exception 'paired student-behavior agreement cannot be calculated' using errcode='55000';
    end if;
    student_ioa := round(
      100.0 * student_agreements / (student_agreements + student_disagreements),
      2
    );

    counts_toward_ioa := slot.secondary_role in ('formal_ioa','calibration_and_ioa');

    insert into public.research_observation_comparisons_v2(
      slot_id, primary_record_id, secondary_record_id, secondary_role, counts_toward_ioa,
      teacher_fidelity_ioa_percent, student_behavior_ioa_percent,
      teacher_agreements, teacher_disagreements,
      student_agreements, student_disagreements, excluded_intervals
    )
    values(
      slot.id, primary_record.id, secondary_record.id, slot.secondary_role, counts_toward_ioa,
      teacher_ioa, student_ioa,
      teacher_agreements, teacher_disagreements,
      student_agreements, student_disagreements, excluded_intervals
    )
    on conflict (slot_id) do nothing;
  elsif primary_record.status is distinct from 'submitted' then
    return jsonb_build_object(
      'record_id', current_record.id,
      'submitted', true,
      'waiting_for_partner', false,
      'completed', false
    );
  end if;

  if slot.observation_id is not null then
    return jsonb_build_object(
      'record_id', current_record.id,
      'submitted', true,
      'waiting_for_partner', false,
      'completed', true,
      'observation_id', slot.observation_id
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(slot.case_id::text || primary_record.phase));
  select coalesce(max(session_number),0)+1 into next_session
  from public.research_classroom_observations
  where case_id = slot.case_id
    and phase = primary_record.phase;

  if counts_toward_ioa then
    canonical_secondary := slot.secondary_observer_id;
    canonical_teacher_ioa := teacher_ioa;
    canonical_student_ioa := student_ioa;
    canonical_ioa_note := 'Automatically calculated from independent digital observer submissions.';
  else
    canonical_secondary := null;
    canonical_teacher_ioa := null;
    canonical_student_ioa := null;
    canonical_ioa_note := null;
  end if;

  insert into public.research_classroom_observations(
    case_id, observation_date, phase, session_number,
    target_routine_snapshot, target_behavior_definition_snapshot,
    primary_observer_id, secondary_observer_id,
    start_time, end_time, context_note, created_by
  )
  values(
    slot.case_id, slot.observation_date, primary_record.phase, next_session,
    primary_record.target_routine_snapshot, primary_record.target_behavior_definition_snapshot,
    slot.primary_observer_id, canonical_secondary,
    (primary_record.started_at at time zone 'America/Denver')::time,
    (coalesce(primary_record.collection_ended_at, primary_record.submitted_at) at time zone 'America/Denver')::time,
    primary_record.observation_note,
    primary_record.auth_user_id
  )
  returning * into finalized_observation;

  insert into public.research_classroom_observation_summary_revisions(
    observation_id, revision_number,
    teacher_fidelity_percent, student_target_behavior_percent,
    teacher_fidelity_ioa_percent, student_behavior_ioa_percent,
    observation_note, ioa_note, recorded_by
  )
  values(
    finalized_observation.id, 1,
    primary_record.teacher_fidelity_percent, primary_record.student_target_behavior_percent,
    canonical_teacher_ioa, canonical_student_ioa,
    primary_record.observation_note, canonical_ioa_note,
    primary_record.auth_user_id
  )
  returning * into finalized_summary;

  update public.research_observation_schedule_slots
  set status = 'completed',
      attendance_status = 'student_present',
      observation_id = finalized_observation.id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = slot.id;

  return jsonb_build_object(
    'record_id', current_record.id,
    'submitted', true,
    'waiting_for_partner', false,
    'completed', true,
    'observation_id', finalized_observation.id,
    'teacher_fidelity_percent', primary_record.teacher_fidelity_percent,
    'student_target_behavior_percent', primary_record.student_target_behavior_percent,
    'teacher_fidelity_ioa_percent', canonical_teacher_ioa,
    'student_behavior_ioa_percent', canonical_student_ioa,
    'counts_toward_ioa', counts_toward_ioa
  );
end
$function$;

revoke all on function public.research_observer_observation_packet(uuid) from public, anon, authenticated;
revoke all on function public.research_observer_start_observation(uuid) from public, anon, authenticated;
revoke all on function public.research_observer_save_observation_draft(uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.research_observer_submit_observation(uuid,jsonb,jsonb,timestamptz,text) from public, anon, authenticated;

grant execute on function public.research_observer_observation_packet(uuid) to authenticated;
grant execute on function public.research_observer_start_observation(uuid) to authenticated;
grant execute on function public.research_observer_save_observation_draft(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.research_observer_submit_observation(uuid,jsonb,jsonb,timestamptz,text) to authenticated;
