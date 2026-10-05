-- Permit the primary researcher to serve as a backup primary classroom observer.
-- This is an exception/coverage role, not a replacement for the trained-observer workflow.
-- Supported calibration remains trainee-primary + primary-researcher-secondary.

create or replace function public.research_observer_status(
  target_observer_id uuid,
  as_of_date date default ((now() at time zone 'America/Denver'))::date
)
returns text
language sql
stable
security definer
set search_path=''
as $function$
  select case
    when not o.active then 'inactive'
    when coalesce(c.clearance_status,'pending')='revoked' then 'recalibration_required'
    when o.observer_type='primary_researcher' then 'qualified'
    when coalesce(c.clearance_status,'pending')='cleared' then 'qualified'
    else 'training_needed'
  end
  from public.research_observers o
  left join public.research_observer_clearance c on c.observer_id=o.id
  where o.id=target_observer_id
$function$;

create or replace function public.research_observer_observation_packet(target_slot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  observer public.research_observers%rowtype;
  support_observer public.research_observers%rowtype;
  setup public.research_observation_setup%rowtype;
  record public.research_observation_records_v2%rowtype;
  resolved_phase text;
  role_name text;
  clearance text;
  online_ready boolean:=false;
  supported_calibration_valid boolean:=false;
  collection_access boolean:=false;
  target_snapshot jsonb;
  partner_status text;
  partner_observer_id uuid;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id=auth.uid() and a.active=true
  limit 1;
  if current_observer_id is null then raise exception 'active observer account required' using errcode='42501'; end if;

  select * into slot from public.research_observation_schedule_slots where id=target_slot_id;
  if slot.id is null then raise exception 'observation session not found' using errcode='P0002'; end if;

  if current_observer_id=slot.primary_observer_id then
    role_name:='primary'; partner_observer_id:=slot.secondary_observer_id;
  elsif current_observer_id=slot.secondary_observer_id then
    role_name:='secondary'; partner_observer_id:=slot.primary_observer_id;
  else
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  select * into observer from public.research_observers where id=current_observer_id and active=true;
  if observer.id is null then raise exception 'active observer roster record required' using errcode='42501'; end if;

  clearance:=public.research_observer_status(current_observer_id,slot.observation_date);
  online_ready:=public.research_observer_online_training_ready(current_observer_id);

  if slot.secondary_role='supported_calibration' and slot.secondary_observer_id is not null then
    select * into support_observer
    from public.research_observers
    where id=slot.secondary_observer_id and active=true and observer_type='primary_researcher';

    supported_calibration_valid:=support_observer.id is not null;

    if supported_calibration_valid then
      if role_name='primary' then
        collection_access:=(
          observer.observer_type='trained_observer'
          and (clearance='qualified' or (clearance='training_needed' and online_ready))
        );
      else
        collection_access:=(
          observer.observer_type='primary_researcher'
          and clearance<>'recalibration_required'
        );
      end if;
    end if;
  else
    collection_access:=(
      clearance='qualified'
      and (
        role_name='secondary'
        or observer.observer_type in ('trained_observer','primary_researcher')
      )
    );
  end if;

  select * into setup from public.research_observation_setup where case_id=slot.case_id;

  select e.phase into resolved_phase
  from public.research_case_phase_events e
  where e.case_id=slot.case_id and e.effective_date<=slot.observation_date
  order by e.effective_date desc,e.recorded_at desc,e.id desc limit 1;
  resolved_phase:=coalesce(resolved_phase,'prebaseline');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'target_key',f.target_key,'domain',f.domain,
    'description',f.description,'sort_order',f.sort_order
  ) order by f.sort_order,f.target_key,f.id),'[]'::jsonb)
  into target_snapshot
  from public.fidelity_targets f
  where f.case_id=slot.case_id and f.active=true;

  select * into record
  from public.research_observation_records_v2 r
  where r.slot_id=slot.id and r.observer_id=current_observer_id;

  select r.status into partner_status
  from public.research_observation_records_v2 r
  where r.slot_id=slot.id and r.observer_id=partner_observer_id;

  return jsonb_build_object(
    'observer',jsonb_build_object(
      'id',observer.id,'display_name',observer.display_name,'observer_code',observer.observer_code,
      'observer_type',observer.observer_type,'role',role_name,'clearance',clearance,
      'online_training_ready',online_ready,
      'collection_access',case
        when slot.secondary_role='supported_calibration' and collection_access then 'supported_calibration'
        when collection_access then case when observer.observer_type='primary_researcher' then 'researcher' else 'cleared' end
        else 'locked'
      end
    ),
    'slot',jsonb_build_object(
      'id',slot.id,'case_id',slot.case_id,'case_code',slot.case_code_snapshot,
      'observation_date',slot.observation_date,'planned_start_time',slot.planned_start_time,
      'planned_end_time',slot.planned_end_time,'status',slot.status,
      'attendance_status',slot.attendance_status,'secondary_role',slot.secondary_role,
      'routine_label',coalesce(slot.routine_label_snapshot,setup.target_routine),
      'observation_id',slot.observation_id
    ),
    'phase',resolved_phase,
    'setup',case when setup.case_id is null then null else jsonb_build_object(
      'target_routine',setup.target_routine,'target_behavior_definition',setup.target_behavior_definition
    ) end,
    'fidelity_targets',case when record.id is not null then record.fidelity_target_snapshot else target_snapshot end,
    'record',case when record.id is null then null else jsonb_build_object(
      'id',record.id,'status',record.status,'started_at',record.started_at,
      'elapsed_seconds',record.elapsed_seconds,'collection_ended_at',record.collection_ended_at,
      'submitted_at',record.submitted_at,'fidelity_scores',record.fidelity_scores,
      'interval_scores',record.interval_scores,'teacher_fidelity_percent',record.teacher_fidelity_percent,
      'student_target_behavior_percent',record.student_target_behavior_percent,'observation_note',record.observation_note
    ) end,
    'partner_submission_status',partner_status,
    'supported_calibration_valid',supported_calibration_valid,
    'ready_to_start',(
      setup.case_id is not null
      and jsonb_array_length(target_snapshot)>0
      and resolved_phase in ('baseline','intervention','maintenance')
      and collection_access
      and slot.observation_date=(now() at time zone 'America/Denver')::date
      and slot.status in ('scheduled','confirmed')
    )
  );
end
$function$;

create or replace function public.research_observer_start_observation(target_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  observer public.research_observers%rowtype;
  support_observer public.research_observers%rowtype;
  setup public.research_observation_setup%rowtype;
  existing public.research_observation_records_v2%rowtype;
  result public.research_observation_records_v2%rowtype;
  observer_role_name text;
  clearance text;
  online_ready boolean:=false;
  resolved_phase text;
  target_snapshot jsonb;
  denver_today date:=(now() at time zone 'America/Denver')::date;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id=auth.uid() and a.active=true limit 1;
  if current_observer_id is null then raise exception 'active observer account required' using errcode='42501'; end if;

  select * into slot from public.research_observation_schedule_slots where id=target_slot_id for update;
  if slot.id is null then raise exception 'observation session not found' using errcode='P0002'; end if;

  if current_observer_id=slot.primary_observer_id then observer_role_name:='primary';
  elsif current_observer_id=slot.secondary_observer_id then observer_role_name:='secondary';
  else raise exception 'this observation session is not assigned to you' using errcode='42501'; end if;

  if slot.status not in ('scheduled','confirmed') then
    raise exception 'this session is not available to start or resume' using errcode='55000';
  end if;
  if slot.observation_date<>denver_today then
    raise exception 'live observation can only be collected on its scheduled date' using errcode='55000';
  end if;

  select * into observer from public.research_observers where id=current_observer_id and active=true;
  if observer.id is null then raise exception 'active observer roster record required' using errcode='42501'; end if;

  clearance:=public.research_observer_status(current_observer_id,slot.observation_date);
  online_ready:=public.research_observer_online_training_ready(current_observer_id);

  if slot.secondary_role='supported_calibration' then
    if slot.secondary_observer_id is null then
      raise exception 'supported calibration requires a paired primary researcher' using errcode='55000';
    end if;

    select * into support_observer
    from public.research_observers
    where id=slot.secondary_observer_id and active=true and observer_type='primary_researcher';

    if support_observer.id is null then
      raise exception 'supported calibration requires the active primary researcher as the paired observer' using errcode='55000';
    end if;

    if observer_role_name='primary' then
      if observer.observer_type<>'trained_observer' then
        raise exception 'supported-calibration primary must be a trained observer' using errcode='55000';
      end if;
      if clearance='recalibration_required'
         or not (clearance='qualified' or (clearance='training_needed' and online_ready)) then
        raise exception 'complete online observer training before supported field calibration' using errcode='55000';
      end if;
    else
      if observer.observer_type<>'primary_researcher' then
        raise exception 'supported-calibration secondary must be the primary researcher' using errcode='55000';
      end if;
      if clearance='recalibration_required' then
        raise exception 'primary researcher is not available for calibration support' using errcode='55000';
      end if;
    end if;
  else
    if clearance<>'qualified' then
      raise exception 'observer is not cleared for live observation on this date' using errcode='55000';
    end if;
    if observer_role_name='primary'
       and observer.observer_type not in ('trained_observer','primary_researcher') then
      raise exception 'primary live collection must be completed by a qualified observer or the primary researcher' using errcode='55000';
    end if;
  end if;

  select * into existing
  from public.research_observation_records_v2
  where slot_id=slot.id and observer_id=current_observer_id;
  if existing.id is not null then return to_jsonb(existing); end if;

  select * into setup from public.research_observation_setup where case_id=slot.case_id;
  if setup.case_id is null then raise exception 'observation setup is required before collection begins' using errcode='55000'; end if;

  select e.phase into resolved_phase
  from public.research_case_phase_events e
  where e.case_id=slot.case_id and e.effective_date<=slot.observation_date
  order by e.effective_date desc,e.recorded_at desc,e.id desc limit 1;
  resolved_phase:=coalesce(resolved_phase,'prebaseline');

  if resolved_phase not in ('baseline','intervention','maintenance') then
    raise exception 'observations are not allowed during phase %',resolved_phase using errcode='55000';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'target_key',f.target_key,'domain',f.domain,
    'description',f.description,'sort_order',f.sort_order
  ) order by f.sort_order,f.target_key,f.id),'[]'::jsonb)
  into target_snapshot
  from public.fidelity_targets f
  where f.case_id=slot.case_id and f.active=true;

  if jsonb_array_length(target_snapshot)=0 then
    raise exception 'active fidelity checklist is required before collection begins' using errcode='55000';
  end if;

  insert into public.research_observation_records_v2(
    slot_id,case_id,observer_id,observer_role,observation_date,phase,
    target_routine_snapshot,target_behavior_definition_snapshot,
    fidelity_target_snapshot,auth_user_id,elapsed_seconds
  ) values(
    slot.id,slot.case_id,current_observer_id,observer_role_name,slot.observation_date,resolved_phase,
    setup.target_routine,setup.target_behavior_definition,target_snapshot,auth.uid(),0
  ) returning * into result;

  return to_jsonb(result);
end
$function$;

create or replace function public.research_validate_live_schedule_assignment()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  primary_type text;
  primary_status text;
  primary_online_ready boolean:=false;
  secondary_type text;
  secondary_status text;
begin
  if new.primary_observer_id is null then
    if new.secondary_observer_id is not null or new.secondary_role is not null then
      raise exception 'paired observer fields require a primary observer' using errcode='22023';
    end if;
    return new;
  end if;

  select o.observer_type into primary_type
  from public.research_observers o
  where o.id=new.primary_observer_id and o.active=true;

  if primary_type is null then raise exception 'primary observer must be active' using errcode='55000'; end if;

  primary_status:=public.research_observer_status(new.primary_observer_id,new.observation_date);
  primary_online_ready:=public.research_observer_online_training_ready(new.primary_observer_id);

  if (new.secondary_observer_id is null) <> (new.secondary_role is null) then
    raise exception 'paired observer and paired role must be configured together' using errcode='22023';
  end if;

  if new.secondary_observer_id is not null then
    if new.secondary_observer_id=new.primary_observer_id then
      raise exception 'primary and paired observers must be different people' using errcode='22023';
    end if;

    select o.observer_type into secondary_type
    from public.research_observers o
    where o.id=new.secondary_observer_id and o.active=true;

    if secondary_type is null then raise exception 'paired observer must be active' using errcode='55000'; end if;
    secondary_status:=public.research_observer_status(new.secondary_observer_id,new.observation_date);
  end if;

  if new.secondary_role='supported_calibration' then
    if primary_type<>'trained_observer' then
      raise exception 'supported-calibration primary must be a trained observer' using errcode='55000';
    end if;
    if primary_status='recalibration_required'
       or not (primary_status='qualified' or (primary_status='training_needed' and primary_online_ready)) then
      raise exception 'supported-calibration primary must complete online observer training first' using errcode='55000';
    end if;
    if secondary_type<>'primary_researcher' then
      raise exception 'supported calibration must be paired with the primary researcher' using errcode='55000';
    end if;
    if secondary_status='recalibration_required' then
      raise exception 'primary researcher is not available for calibration support' using errcode='55000';
    end if;
  else
    if not (
      (primary_type='primary_researcher' and primary_status='qualified')
      or (primary_type='trained_observer' and primary_status='qualified')
    ) then
      raise exception 'primary observer must be a qualified trained observer or the primary researcher' using errcode='55000';
    end if;

    if new.secondary_observer_id is not null then
      if new.secondary_role not in ('formal_ioa','calibration_and_ioa') then
        raise exception 'invalid paired-observer role' using errcode='22023';
      end if;
      if secondary_status<>'qualified' then
        raise exception 'paired observer must be qualified for this observation role' using errcode='55000';
      end if;
    end if;
  end if;

  return new;
end
$function$;

create or replace function public.research_admin_create_classroom_observation(
  target_case_id uuid,
  target_observation_date date,
  target_primary_observer_id uuid,
  target_secondary_observer_id uuid default null,
  target_start_time time default null,
  target_end_time time default null,
  target_context_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  setup public.research_observation_setup%rowtype;
  resolved_phase text;
  next_session integer;
  result public.research_classroom_observations%rowtype;
  primary_type text;
  primary_status text;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;
  if target_observation_date>(now() at time zone 'America/Denver')::date then
    raise exception 'observation date cannot be in the future (America/Denver)' using errcode='22023';
  end if;

  select * into setup
  from public.research_observation_setup
  where case_id=target_case_id;
  if setup.case_id is null then
    raise exception 'observation setup is required' using errcode='55000';
  end if;

  select e.phase into resolved_phase
  from public.research_case_phase_events e
  where e.case_id=target_case_id
    and e.effective_date<=target_observation_date
  order by e.effective_date desc,e.recorded_at desc,e.id desc
  limit 1;
  resolved_phase:=coalesce(resolved_phase,'prebaseline');

  if resolved_phase not in('baseline','intervention','maintenance') then
    raise exception 'observations are not allowed during phase %',resolved_phase using errcode='55000';
  end if;

  if target_secondary_observer_id=target_primary_observer_id then
    raise exception 'primary and secondary observers must differ' using errcode='22023';
  end if;

  select o.observer_type,
         public.research_observer_status(o.id,target_observation_date)
    into primary_type,primary_status
  from public.research_observers o
  where o.id=target_primary_observer_id
    and o.active=true;

  if primary_type is null
     or primary_status<>'qualified'
     or primary_type not in ('trained_observer','primary_researcher') then
    raise exception 'primary observer must be an active qualified trained observer or the primary researcher' using errcode='55000';
  end if;

  if target_secondary_observer_id is not null
     and not exists(
       select 1
       from public.research_observers o
       where o.id=target_secondary_observer_id
         and o.active=true
         and public.research_observer_status(o.id,target_observation_date)='qualified'
     ) then
    raise exception 'secondary observer must be active, qualified, and different from the primary observer' using errcode='55000';
  end if;

  if length(target_context_note)>1000 then
    raise exception 'context note exceeds 1000 characters' using errcode='22001';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_case_id::text||resolved_phase));

  select coalesce(max(session_number),0)+1 into next_session
  from public.research_classroom_observations
  where case_id=target_case_id
    and phase=resolved_phase;

  insert into public.research_classroom_observations(
    case_id,observation_date,phase,session_number,
    target_routine_snapshot,target_behavior_definition_snapshot,
    primary_observer_id,secondary_observer_id,
    start_time,end_time,context_note,created_by
  ) values(
    target_case_id,target_observation_date,resolved_phase,next_session,
    setup.target_routine,setup.target_behavior_definition,
    target_primary_observer_id,target_secondary_observer_id,
    target_start_time,target_end_time,
    nullif(btrim(target_context_note),''),
    auth.uid()
  )
  returning * into result;

  return to_jsonb(result);
end
$function$;
