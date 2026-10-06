-- Harden Setup -> Baseline so the database enforces the same launch requirements
-- shown in Research Admin. The primary researcher remains an allowed backup observer
-- after launch but does not satisfy trained-observer readiness.

create or replace function public.research_admin_record_phase(
  target_case_id uuid,
  target_phase text,
  target_effective_date date,
  target_decision_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  missing text[]:=array[]::text[];
  result public.research_case_phase_events%rowtype;
  denver_today date:=(now() at time zone 'America/Denver')::date;
  key text;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;
  if target_effective_date>denver_today then
    raise exception 'phase effective date cannot be in the future (America/Denver)' using errcode='22023';
  end if;

  if target_phase='baseline' then
    perform pg_advisory_xact_lock(hashtext('research_case_protocol_swap'));

    foreach key in array array[
      'teacher_consent','parent_permission','bsp_technical_review','safety_screen',
      'target_routine_finalized','target_behavior_definition',
      'fidelity_checklist_finalized','fidelity_checklist_second_review','baseline_orientation'
    ] loop
      if coalesce((
        select e.status
        from public.research_protocol_checklist_events e
        where e.case_id=target_case_id and e.item_key=key
        order by e.recorded_at desc,e.id desc limit 1
      ),'pending')<>'complete' then
        missing:=array_append(missing,key);
      end if;
    end loop;

    if coalesce((
      select e.status
      from public.research_protocol_checklist_events e
      where e.case_id=target_case_id and e.item_key='student_assent'
      order by e.recorded_at desc,e.id desc limit 1
    ),'pending') not in ('complete','not_applicable') then
      missing:=array_append(missing,'student_assent');
    end if;

    if not exists(select 1 from public.research_case_protocol where case_id=target_case_id) then
      missing:=array_append(missing,'stagger_position');
    end if;

    if coalesce((
      select e.status
      from public.research_measure_events e
      where e.case_id=target_case_id and e.measure_key='tses_pre'
      order by e.recorded_at desc,e.id desc limit 1
    ),'pending')<>'complete' then
      missing:=array_append(missing,'tses_pre');
    end if;

    if not exists(
      select 1
      from public.research_observation_setup s
      where s.case_id=target_case_id
        and nullif(btrim(s.target_routine),'') is not null
        and nullif(btrim(s.target_behavior_definition),'') is not null
    ) then
      missing:=array_append(missing,'observation_setup');
    end if;

    if not exists(
      select 1
      from public.fidelity_targets f
      where f.case_id=target_case_id and f.active=true
    ) then
      missing:=array_append(missing,'active_fidelity_checklist');
    end if;

    if not exists(
      select 1
      from public.research_observers o
      join public.research_observer_clearance c on c.observer_id=o.id
      where o.active=true
        and o.observer_type='trained_observer'
        and c.clearance_status='cleared'
        and c.cleared_at is not null
    ) then
      missing:=array_append(missing,'cleared_trained_observer');
    end if;

    if cardinality(missing)>0 then
      raise exception 'baseline prerequisites missing: %',array_to_string(missing,', ')
        using errcode='55000',
        detail='Complete every listed prerequisite, then explicitly record baseline again.';
    end if;
  end if;

  insert into public.research_case_phase_events(case_id,phase,effective_date,decision_note,recorded_by)
  values(target_case_id,target_phase,target_effective_date,nullif(btrim(target_decision_note),''),auth.uid())
  returning * into result;
  return to_jsonb(result);
end
$function$;

revoke all on function public.research_admin_record_phase(uuid,text,date,text) from public, anon;
grant execute on function public.research_admin_record_phase(uuid,text,date,text) to authenticated;

create or replace function public.research_admin_operations_dashboard(target_case_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare result jsonb;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  with case_rows as (
    select
      c.id,c.case_code,c.student_alias,p.participant_code study_id,p.is_test,
      c.active case_active,p.active participant_active,c.archived_at,c.archive_reason,
      coalesce((
        select pe.phase
        from public.research_case_phase_events pe
        where pe.case_id=c.id
        order by pe.effective_date desc,pe.recorded_at desc,pe.id desc
        limit 1
      ),'prebaseline') current_phase,
      (select to_jsonb(cp) from public.research_case_protocol cp where cp.case_id=c.id) protocol,
      jsonb_build_object(
        'protected_content_present',gc.case_id is not null,
        'resource_map_ready',
          gc.case_id is not null
          and coalesce(gc.resources->'schemaVersion'='1'::jsonb,false)
          and coalesce(gc.resources->'sections'?&array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'],false)
          and (
            select count(distinct s.review_type)=3
            from public.case_protected_content_signoffs s
            where s.case_id=c.id
              and s.protected_content_version=gc.version
              and s.review_type in('resource_behavior_review','resource_privacy_review','resource_qa_preview')
          ),
        'reminders_enabled',coalesce((
          select rs.enabled
          from public.teacher_reminder_settings rs
          where rs.participant_id=p.id
        ),false)
      ) prepared_content
    from public.cases c
    join public.participants p on p.case_id=c.id
    left join public.case_game_content gc on gc.case_id=c.id
    where (target_case_id is null and not p.is_test)
       or (target_case_id is not null and c.id=target_case_id)
  )
  select jsonb_build_object(
    'authoritative_timezone','America/Denver',
    'cases',coalesce(jsonb_agg(
      to_jsonb(cr)||jsonb_build_object(
        'active_fidelity_target_count',(
          select count(*)
          from public.fidelity_targets f
          where f.case_id=cr.id and f.active=true
        ),
        'checklist',coalesce((
          select jsonb_agg(to_jsonb(x) order by x.item_key)
          from (
            select distinct on(e.item_key) e.*
            from public.research_protocol_checklist_events e
            where e.case_id=cr.id
            order by e.item_key,e.recorded_at desc,e.id desc
          ) x
        ),'[]'::jsonb),
        'checklist_history',coalesce((
          select jsonb_agg(to_jsonb(e) order by e.recorded_at desc)
          from public.research_protocol_checklist_events e
          where e.case_id=cr.id
        ),'[]'::jsonb),
        'phase_history',coalesce((
          select jsonb_agg(to_jsonb(e) order by e.effective_date desc,e.recorded_at desc)
          from public.research_case_phase_events e
          where e.case_id=cr.id
        ),'[]'::jsonb),
        'measures',coalesce((
          select jsonb_agg(to_jsonb(x) order by x.measure_key)
          from (
            select distinct on(e.measure_key)e.*
            from public.research_measure_events e
            where e.case_id=cr.id
            order by e.measure_key,e.recorded_at desc,e.id desc
          ) x
        ),'[]'::jsonb),
        'measure_history',coalesce((
          select jsonb_agg(to_jsonb(e) order by e.recorded_at desc)
          from public.research_measure_events e
          where e.case_id=cr.id
        ),'[]'::jsonb),
        'tasks',coalesce((
          select jsonb_agg(
            to_jsonb(t)||jsonb_build_object(
              'overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date
            )
            order by (t.status='pending') desc,t.due_date nulls last
          )
          from public.research_tasks t
          where t.case_id=cr.id
        ),'[]'::jsonb),
        'coaching_contacts',coalesce((
          select jsonb_agg(to_jsonb(c) order by c.contact_date desc,c.recorded_at desc)
          from public.research_coaching_contacts c
          where c.case_id=cr.id
        ),'[]'::jsonb),
        'study_events',coalesce((
          select jsonb_agg(to_jsonb(e) order by (e.resolved_at is null) desc,e.event_date desc)
          from public.research_study_events e
          where e.case_id=cr.id
        ),'[]'::jsonb)
      )
      order by cr.study_id
    ) filter(where cr.id is not null),'[]'::jsonb),
    'study_wide_tasks',coalesce((
      select jsonb_agg(
        to_jsonb(t)||jsonb_build_object(
          'overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date
        )
        order by (t.status='pending') desc,t.due_date nulls last
      )
      from public.research_tasks t
      where t.case_id is null
    ),'[]'::jsonb)
  )
  into result
  from case_rows cr;

  return result;
end
$function$;

revoke all on function public.research_admin_operations_dashboard(uuid) from public, anon;
grant execute on function public.research_admin_operations_dashboard(uuid) to authenticated;

comment on function public.research_admin_record_phase(uuid,text,date,text) is
  'Records deliberate research phase changes. Baseline requires complete prebaseline protocol items, observation setup, an active fidelity checklist, and at least one formally cleared trained observer.';
