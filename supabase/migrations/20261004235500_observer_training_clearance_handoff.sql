
create or replace function public.research_admin_observer_training_dashboard()
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

  with observer_base as (
    select o.*,
           lower(split_part(btrim(o.display_name),' ',1)) as training_name,
           coalesce(c.clearance_status,'pending') as clearance_status,
           c.cleared_at,
           c.clearance_note
    from public.research_observers o
    left join public.research_observer_clearance c on c.observer_id=o.id
  ),
  nora as (
    select distinct on (lower(observer_name))
      lower(observer_name) training_name,
      id,submitted_at,teacher_fidelity_agreement,student_behavior_agreement,qualified
    from public.observer_training_attempts
    where case_id='nora' and attempt_type='practice'
    order by lower(observer_name),submitted_at desc,created_at desc,id desc
  ),
  kai as (
    select distinct on (lower(observer_name))
      lower(observer_name) training_name,
      id,submitted_at,teacher_fidelity_agreement,student_behavior_agreement,qualified
    from public.observer_training_attempts
    where case_id='kai' and attempt_type='qualification'
    order by lower(observer_name),submitted_at desc,created_at desc,id desc
  ),
  feedback as (
    select distinct on (lower(observer_name))
      lower(observer_name) training_name,
      id,submitted_at,manageability,fidelity_ease,behavior_ease,cue_helpfulness,
      could_not_enter,hard_definitions,first_change,questions
    from public.observer_training_feedback
    order by lower(observer_name),submitted_at desc,created_at desc,id desc
  ),
  questions as (
    select distinct on (lower(observer_name))
      lower(observer_name) training_name,
      id,submitted_at,scoring_questions,practice_requests,other_notes
    from public.observer_training_questions
    order by lower(observer_name),submitted_at desc,created_at desc,id desc
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'observer_id',o.id,
      'observer_code',o.observer_code,
      'display_name',o.display_name,
      'observer_type',o.observer_type,
      'active',o.active,
      'clearance_status',o.clearance_status,
      'cleared_at',o.cleared_at,
      'clearance_note',o.clearance_note,
      'nora',case when n.id is null then null else jsonb_build_object(
        'submitted_at',n.submitted_at,
        'teacher_fidelity_agreement',n.teacher_fidelity_agreement,
        'student_behavior_agreement',n.student_behavior_agreement,
        'qualified',n.qualified
      ) end,
      'feedback',case when f.id is null then null else jsonb_build_object(
        'submitted_at',f.submitted_at,
        'manageability',f.manageability,
        'fidelity_ease',f.fidelity_ease,
        'behavior_ease',f.behavior_ease,
        'cue_helpfulness',f.cue_helpfulness,
        'could_not_enter',f.could_not_enter,
        'hard_definitions',f.hard_definitions,
        'first_change',f.first_change,
        'questions',f.questions
      ) end,
      'kai',case when k.id is null then null else jsonb_build_object(
        'submitted_at',k.submitted_at,
        'teacher_fidelity_agreement',k.teacher_fidelity_agreement,
        'student_behavior_agreement',k.student_behavior_agreement,
        'qualified',k.qualified
      ) end,
      'questions',case when q.id is null then null else jsonb_build_object(
        'submitted_at',q.submitted_at,
        'scoring_questions',q.scoring_questions,
        'practice_requests',q.practice_requests,
        'other_notes',q.other_notes
      ) end,
      'module_complete',(n.id is not null and n.qualified=true and f.id is not null and k.id is not null and q.id is not null),
      'online_criterion_met',(k.qualified=true),
      'ready_for_clearance',(n.qualified=true and f.id is not null and k.qualified=true and q.id is not null),
      'training_status',case
        when o.clearance_status='cleared' then 'cleared'
        when o.clearance_status='revoked' then 'recalibration_required'
        when k.id is not null and k.qualified=false then 'qualification_needs_review'
        when k.id is not null and k.qualified=true and q.id is null then 'qualification_passed_finish_module'
        when n.qualified=true and f.id is not null and k.qualified=true and q.id is not null then 'calibration_pending'
        when n.id is null then 'not_started'
        else 'in_progress'
      end
    )
    order by o.observer_code
  ),'[]'::jsonb) into result
  from observer_base o
  left join nora n on n.training_name=o.training_name
  left join feedback f on f.training_name=o.training_name
  left join kai k on k.training_name=o.training_name
  left join questions q on q.training_name=o.training_name;

  return result;
end
$function$;

create or replace function public.research_admin_set_observer_clearance(
  target_observer_id uuid,
  target_status text,
  target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  observer public.research_observers%rowtype;
  training_name text;
  online_ready boolean:=false;
  result public.research_observer_clearance%rowtype;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;
  if target_status not in ('pending','cleared','revoked') then
    raise exception 'invalid clearance status' using errcode='22023';
  end if;
  if length(target_note)>1000 then
    raise exception 'clearance note exceeds 1000 characters' using errcode='22001';
  end if;

  select * into observer from public.research_observers where id=target_observer_id;
  if observer.id is null then raise exception 'observer not found' using errcode='P0002'; end if;
  training_name:=lower(split_part(btrim(observer.display_name),' ',1));

  select (
    exists(
      select 1 from public.observer_training_attempts a
      where lower(a.observer_name)=training_name and a.case_id='nora'
        and a.attempt_type='practice' and a.qualified=true
    )
    and exists(
      select 1 from public.observer_training_feedback f
      where lower(f.observer_name)=training_name
    )
    and exists(
      select 1 from public.observer_training_attempts a
      where lower(a.observer_name)=training_name and a.case_id='kai'
        and a.attempt_type='qualification' and a.qualified=true
    )
    and exists(
      select 1 from public.observer_training_questions q
      where lower(q.observer_name)=training_name
    )
  ) into online_ready;

  if target_status='cleared' and not online_ready then
    raise exception 'online observer-training requirements are not complete' using errcode='55000';
  end if;

  insert into public.research_observer_clearance(
    observer_id,clearance_status,cleared_at,cleared_by,clearance_note,updated_at
  )
  values(
    target_observer_id,target_status,
    case when target_status='cleared' then now() else null end,
    case when target_status='cleared' then auth.uid() else null end,
    nullif(btrim(target_note),''),now()
  )
  on conflict(observer_id) do update set
    clearance_status=excluded.clearance_status,
    cleared_at=excluded.cleared_at,
    cleared_by=excluded.cleared_by,
    clearance_note=excluded.clearance_note,
    updated_at=now()
  returning * into result;

  return to_jsonb(result);
end
$function$;

revoke all on function public.research_admin_observer_training_dashboard() from public,anon,authenticated;
revoke all on function public.research_admin_set_observer_clearance(uuid,text,text) from public,anon,authenticated;
grant execute on function public.research_admin_observer_training_dashboard() to authenticated;
grant execute on function public.research_admin_set_observer_clearance(uuid,text,text) to authenticated;
