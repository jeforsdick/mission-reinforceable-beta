-- Baseline -> Intervention launch hardening.
-- Intervention onset is a single atomic event: phase + game access + daily reminders.
-- Baseline stability/interpretability remains a researcher visual-analysis judgment and
-- is documented explicitly rather than inferred by an automated algorithm.

create table if not exists public.research_intervention_start_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  phase_event_id uuid not null unique references public.research_case_phase_events(id) on delete restrict,
  baseline_observation_count integer not null check (baseline_observation_count >= 0),
  planned_baseline_minimum integer not null check (planned_baseline_minimum > 0),
  stagger_position smallint not null check (stagger_position between 1 and 5),
  baseline_pattern_reviewed boolean not null,
  recent_series_reviewed boolean not null,
  decision_note text not null check (char_length(btrim(decision_note)) between 1 and 1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

alter table public.research_intervention_start_reviews enable row level security;
revoke all on table public.research_intervention_start_reviews from anon, authenticated;
grant select on table public.research_intervention_start_reviews to authenticated;

drop policy if exists "Research admins read intervention start reviews" on public.research_intervention_start_reviews;
create policy "Research admins read intervention start reviews"
on public.research_intervention_start_reviews
for select to authenticated
using ((select public.is_research_admin()));

drop trigger if exists research_intervention_start_reviews_immutable on public.research_intervention_start_reviews;
create trigger research_intervention_start_reviews_immutable
before update or delete on public.research_intervention_start_reviews
for each row execute function public.prevent_research_operations_delete();

create or replace function public.research_admin_start_intervention(
  target_case_id uuid,
  target_effective_date date,
  target_baseline_pattern_reviewed boolean,
  target_recent_series_reviewed boolean,
  target_decision_note text,
  target_actor_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  denver_today date := (now() at time zone 'America/Denver')::date;
  current_phase text;
  target_participant_id uuid;
  teacher_id uuid;
  participant_count integer;
  target_stagger_position smallint;
  target_planned_minimum integer;
  baseline_count integer;
  current_version integer;
  phase_event public.research_case_phase_events%rowtype;
  changed timestamptz := now();
  reminders_were_enabled boolean := false;
  case_was_active boolean := false;
  participant_was_active boolean := false;
begin
  if not exists(
    select 1 from public.profiles pr
    where pr.id=target_actor_id and pr.role='research_admin' and pr.active
  ) then
    raise exception 'research admin required' using errcode='42501';
  end if;

  if target_effective_date is distinct from denver_today then
    raise exception 'Intervention must be started on the actual launch date (America/Denver).'
      using errcode='22023',
      detail='Record the intervention transition when Mission: Reinforceable exposure actually begins; do not predate or backdate it.';
  end if;

  if coalesce(target_baseline_pattern_reviewed,false) is not true then
    raise exception 'baseline visual review confirmation is required'
      using errcode='55000',
      detail='Review level, trend, variability, and interpretability before starting intervention.';
  end if;

  if nullif(btrim(target_decision_note),'') is null then
    raise exception 'baseline visual-analysis decision note is required' using errcode='22023';
  end if;

  if char_length(target_decision_note)>1000 then
    raise exception 'phase decision note exceeds 1000 characters' using errcode='22001';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_case_id::text));

  select pe.phase into current_phase
  from public.research_case_phase_events pe
  where pe.case_id=target_case_id
  order by pe.effective_date desc,pe.recorded_at desc,pe.id desc
  limit 1;

  if coalesce(current_phase,'prebaseline')<>'baseline' then
    raise exception 'Intervention can only start from Baseline; current phase is %',coalesce(current_phase,'prebaseline')
      using errcode='55000';
  end if;

  select cp.stagger_position,cp.planned_baseline_observations
  into target_stagger_position,target_planned_minimum
  from public.research_case_protocol cp
  where cp.case_id=target_case_id;

  if target_stagger_position is null or target_planned_minimum is null then
    raise exception 'baseline assignment is required before intervention' using errcode='55000';
  end if;

  select count(*) into baseline_count
  from public.research_classroom_observations o
  where o.case_id=target_case_id
    and o.phase='baseline'
    and exists(
      select 1 from public.research_classroom_observation_summary_revisions sr
      where sr.observation_id=o.id
    );

  if baseline_count<target_planned_minimum then
    raise exception 'baseline minimum not met: % finalized of % required',baseline_count,target_planned_minimum
      using errcode='55000',
      detail='The assigned baseline length is a minimum. Continue baseline until the minimum is met and the pattern is interpretable.';
  end if;

  if target_stagger_position>1 and coalesce(target_recent_series_reviewed,false) is not true then
    raise exception 'three-session pre-intervention series confirmation is required for stagger positions 2-5'
      using errcode='55000',
      detail='Confirm that the required consecutive observation series immediately before intervention has been completed and reviewed.';
  end if;

  if exists(
    select 1 from public.research_study_events e
    where e.case_id=target_case_id
      and e.resolved_at is null
      and e.affects_phase_interpretation=true
  ) then
    raise exception 'resolve phase-interpretation study events before starting intervention'
      using errcode='55000';
  end if;

  select count(*),min(p.id),min(p.auth_user_id)
  into participant_count,target_participant_id,teacher_id
  from public.participants p
  where p.case_id=target_case_id;

  if participant_count<>1 then
    raise exception 'Exactly one study participant must be linked to the case.' using errcode='55000';
  end if;

  if teacher_id is null or not exists(
    select 1 from public.profiles pr
    where pr.id=teacher_id and pr.active and pr.role='teacher'
  ) then
    raise exception 'An active teacher account is required.' using errcode='55000';
  end if;

  select c.active,p.active,coalesce(rs.enabled,false)
  into case_was_active,participant_was_active,reminders_were_enabled
  from public.cases c
  join public.participants p on p.case_id=c.id and p.id=target_participant_id
  left join public.teacher_reminder_settings rs on rs.participant_id=p.id
  where c.id=target_case_id
  for update of c,p;

  if case_was_active or participant_was_active or reminders_were_enabled then
    raise exception 'pre-intervention exposure state is not clean'
      using errcode='55000',
      detail='Baseline must not have Mission: Reinforceable game access or daily reminders active. Review the case before launching intervention.';
  end if;

  select gc.version into current_version
  from public.case_game_content gc
  where gc.case_id=target_case_id;

  if current_version is null then
    raise exception 'Current published game content is required.' using errcode='55000';
  end if;

  if not exists(
    select 1
    from public.case_game_content gc
    where gc.case_id=target_case_id
      and gc.version=current_version
      and coalesce(gc.resources->'schemaVersion'='1'::jsonb,false)
      and coalesce(gc.resources->'sections'?&array[
        'bip','functionForest','prevention','replacement','reinforcement',
        'errorCorrection','library','coaching','fidelity'
      ],false)
  ) then
    raise exception 'Current Resource Map must be complete before intervention.' using errcode='55000';
  end if;

  if not exists(
    select 1 from public.case_protected_content_signoffs s
    where s.case_id=target_case_id and s.protected_content_version=current_version
      and s.review_type='resource_behavior_review'
  ) then
    raise exception 'Current published version requires Behavior Review.' using errcode='55000';
  end if;

  if not exists(
    select 1 from public.case_protected_content_signoffs s
    where s.case_id=target_case_id and s.protected_content_version=current_version
      and s.review_type='resource_privacy_review'
  ) then
    raise exception 'Current published version requires Privacy Review.' using errcode='55000';
  end if;

  if not exists(
    select 1 from public.case_protected_content_signoffs s
    where s.case_id=target_case_id and s.protected_content_version=current_version
      and s.review_type='resource_qa_preview'
  ) then
    raise exception 'Current published version requires QA Preview Review.' using errcode='55000';
  end if;

  if coalesce((
    select e.status
    from public.research_protocol_checklist_events e
    where e.case_id=target_case_id and e.item_key='intervention_orientation'
    order by e.recorded_at desc,e.id desc limit 1
  ),'pending')<>'complete' then
    raise exception 'Intervention orientation must be complete.' using errcode='55000';
  end if;

  insert into public.research_case_phase_events(
    case_id,phase,effective_date,decision_note,recorded_by
  )
  values(
    target_case_id,'intervention',target_effective_date,btrim(target_decision_note),target_actor_id
  )
  returning * into phase_event;

  insert into public.research_intervention_start_reviews(
    case_id,phase_event_id,baseline_observation_count,planned_baseline_minimum,
    stagger_position,baseline_pattern_reviewed,recent_series_reviewed,
    decision_note,recorded_by
  )
  values(
    target_case_id,phase_event.id,baseline_count,target_planned_minimum,
    target_stagger_position,true,
    case when target_stagger_position=1 then true else target_recent_series_reviewed end,
    btrim(target_decision_note),target_actor_id
  );

  update public.cases
  set active=true
  where id=target_case_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='participants' and column_name='updated_at'
  ) then
    execute 'update public.participants set active=true,updated_at=$1 where id=$2'
    using changed,target_participant_id;
  else
    update public.participants set active=true where id=target_participant_id;
  end if;

  insert into public.teacher_reminder_settings(
    participant_id,enabled,activated_at,deactivated_at
  )
  values(target_participant_id,true,changed,null)
  on conflict(participant_id) do update set
    enabled=true,
    activated_at=changed,
    deactivated_at=null;

  insert into public.research_intervention_launch_events(
    case_id,participant_id,action,actor,recorded_at,protected_content_version
  )
  values
    (target_case_id,target_participant_id,'game_access_enabled',target_actor_id,changed,current_version),
    (target_case_id,target_participant_id,'reminders_enabled',target_actor_id,changed,current_version);

  return jsonb_build_object(
    'phase','intervention',
    'phase_event_id',phase_event.id,
    'baseline_observation_count',baseline_count,
    'planned_baseline_minimum',target_planned_minimum,
    'stagger_position',target_stagger_position,
    'case_active',true,
    'participant_active',true,
    'reminders_enabled',true,
    'started_at',changed
  );
end
$function$;

revoke all on function public.research_admin_start_intervention(uuid,date,boolean,boolean,text,uuid)
from public, anon, authenticated;
grant execute on function public.research_admin_start_intervention(uuid,date,boolean,boolean,text,uuid)
to service_role;

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
  current_phase text;
  key text;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  if target_effective_date>denver_today then
    raise exception 'phase effective date cannot be in the future (America/Denver)' using errcode='22023';
  end if;

  if target_phase='intervention' then
    raise exception 'Use Start Intervention so phase, game access, and daily reminders begin together.'
      using errcode='55000';
  end if;

  select pe.phase into current_phase
  from public.research_case_phase_events pe
  where pe.case_id=target_case_id
  order by pe.effective_date desc,pe.recorded_at desc,pe.id desc
  limit 1;

  if coalesce(current_phase,'prebaseline')='baseline'
     and target_phase not in ('baseline','withdrawn') then
    raise exception 'Baseline can only move to Intervention through Start Intervention, or to Withdrawn.'
      using errcode='55000';
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
      select 1 from public.fidelity_targets f
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

  insert into public.research_case_phase_events(
    case_id,phase,effective_date,decision_note,recorded_by
  )
  values(
    target_case_id,target_phase,target_effective_date,nullif(btrim(target_decision_note),''),auth.uid()
  )
  returning * into result;

  return to_jsonb(result);
end
$function$;

revoke all on function public.research_admin_record_phase(uuid,text,date,text) from public, anon;
grant execute on function public.research_admin_record_phase(uuid,text,date,text) to authenticated;

comment on function public.research_admin_start_intervention(uuid,date,boolean,boolean,text,uuid) is
  'Atomically starts Intervention after objective baseline/game readiness checks and documented researcher visual review; activates game access and daily reminders in the same transaction.';
