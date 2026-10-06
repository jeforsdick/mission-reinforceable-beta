-- Model the dissertation baseline as a multiple-probe condition:
-- Position 1 uses daily baseline; later positions use an initial 3-session series,
-- intermittent probes, and a final 3-session pre-intervention series.

alter table public.research_classroom_observations
  add column if not exists baseline_measurement_role text;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conname='research_classroom_observations_baseline_role_check'
      and conrelid='public.research_classroom_observations'::regclass
  ) then
    alter table public.research_classroom_observations
      add constraint research_classroom_observations_baseline_role_check
      check (
        baseline_measurement_role is null
        or baseline_measurement_role in(
          'daily_baseline','initial_series','intermittent_probe','preintervention_series'
        )
      );
  end if;
end $$;

create table if not exists public.research_baseline_probe_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  event_type text not null check(event_type in('preintervention_series_started')),
  effective_date date not null,
  brief_note text check(brief_note is null or char_length(brief_note)<=1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create unique index if not exists research_baseline_probe_events_one_preintervention_start
  on public.research_baseline_probe_events(case_id,event_type);

alter table public.research_baseline_probe_events enable row level security;
revoke all on table public.research_baseline_probe_events from anon, authenticated;
grant select on table public.research_baseline_probe_events to authenticated;

drop policy if exists "Research admins read baseline probe events" on public.research_baseline_probe_events;
create policy "Research admins read baseline probe events"
on public.research_baseline_probe_events
for select to authenticated
using ((select public.is_research_admin()));

drop trigger if exists research_baseline_probe_events_immutable on public.research_baseline_probe_events;
create trigger research_baseline_probe_events_immutable
before update or delete on public.research_baseline_probe_events
for each row execute function public.prevent_research_operations_delete();

create or replace function public.research_resolve_baseline_measurement_role(
  target_case_id uuid,
  target_observation_date date,
  target_session_number integer
)
returns text
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  position_number smallint;
  preintervention_start date;
begin
  select cp.stagger_position into position_number
  from public.research_case_protocol cp
  where cp.case_id=target_case_id;

  if position_number is null then return null; end if;
  if position_number=1 then return 'daily_baseline'; end if;
  if target_session_number<=3 then return 'initial_series'; end if;

  select e.effective_date into preintervention_start
  from public.research_baseline_probe_events e
  where e.case_id=target_case_id
    and e.event_type='preintervention_series_started'
  order by e.effective_date desc,e.recorded_at desc,e.id desc
  limit 1;

  if preintervention_start is not null
     and target_observation_date>=preintervention_start then
    return 'preintervention_series';
  end if;

  return 'intermittent_probe';
end
$function$;

revoke all on function public.research_resolve_baseline_measurement_role(uuid,date,integer)
from public, anon, authenticated;

create or replace function public.research_apply_baseline_measurement_role()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if new.phase='baseline' then
    new.baseline_measurement_role:=public.research_resolve_baseline_measurement_role(
      new.case_id,new.observation_date,new.session_number
    );
  else
    new.baseline_measurement_role:=null;
  end if;
  return new;
end
$function$;

drop trigger if exists research_classroom_observations_baseline_role on public.research_classroom_observations;
create trigger research_classroom_observations_baseline_role
before insert on public.research_classroom_observations
for each row execute function public.research_apply_baseline_measurement_role();

update public.research_classroom_observations o
set baseline_measurement_role=public.research_resolve_baseline_measurement_role(
  o.case_id,o.observation_date,o.session_number
)
where o.phase='baseline' and o.baseline_measurement_role is null;

create or replace function public.research_admin_start_preintervention_probe_series(
  target_case_id uuid,
  target_effective_date date,
  target_brief_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  denver_today date:=(now() at time zone 'America/Denver')::date;
  current_phase text;
  position_number smallint;
  planned_minimum integer;
  baseline_count integer;
  initial_count integer;
  result public.research_baseline_probe_events%rowtype;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  if target_effective_date is distinct from denver_today then
    raise exception 'the pre-intervention probe series must begin on the actual start date (America/Denver)'
      using errcode='22023';
  end if;

  if length(target_brief_note)>1000 then
    raise exception 'brief note exceeds 1000 characters' using errcode='22001';
  end if;

  perform pg_advisory_xact_lock(hashtext(target_case_id::text));

  select pe.phase into current_phase
  from public.research_case_phase_events pe
  where pe.case_id=target_case_id
  order by pe.effective_date desc,pe.recorded_at desc,pe.id desc
  limit 1;

  if coalesce(current_phase,'prebaseline')<>'baseline' then
    raise exception 'pre-intervention probe series can only begin during Baseline'
      using errcode='55000';
  end if;

  select cp.stagger_position,cp.planned_baseline_observations
  into position_number,planned_minimum
  from public.research_case_protocol cp
  where cp.case_id=target_case_id;

  if position_number is null then
    raise exception 'baseline assignment is required' using errcode='55000';
  end if;
  if position_number=1 then
    raise exception 'Position 1 uses daily baseline and does not use a separate pre-intervention probe series'
      using errcode='55000';
  end if;

  select
    count(*),
    count(*) filter(where o.baseline_measurement_role='initial_series')
  into baseline_count,initial_count
  from public.research_classroom_observations o
  where o.case_id=target_case_id
    and o.phase='baseline'
    and exists(
      select 1 from public.research_classroom_observation_summary_revisions sr
      where sr.observation_id=o.id
    );

  if initial_count<3 then
    raise exception 'complete the initial 3-session baseline series before intermittent probes'
      using errcode='55000';
  end if;

  if baseline_count<greatest(planned_minimum-3,3) then
    raise exception 'continue intermittent probes before beginning the final 3-session series: % of % pre-series observations complete',
      baseline_count,greatest(planned_minimum-3,3)
      using errcode='55000';
  end if;

  if exists(
    select 1 from public.research_baseline_probe_events e
    where e.case_id=target_case_id and e.event_type='preintervention_series_started'
  ) then
    raise exception 'pre-intervention probe series has already been started for this case'
      using errcode='55000';
  end if;

  insert into public.research_baseline_probe_events(
    case_id,event_type,effective_date,brief_note,recorded_by
  )
  values(
    target_case_id,'preintervention_series_started',target_effective_date,
    nullif(btrim(target_brief_note),''),auth.uid()
  )
  returning * into result;

  return jsonb_build_object(
    'case_id',target_case_id,
    'mode','preintervention_series',
    'effective_date',result.effective_date,
    'baseline_observation_count',baseline_count,
    'planned_baseline_minimum',planned_minimum
  );
end
$function$;

revoke all on function public.research_admin_start_preintervention_probe_series(uuid,date,text)
from public, anon;
grant execute on function public.research_admin_start_preintervention_probe_series(uuid,date,text)
to authenticated;

-- QA/test cases must not consume one of the five real dissertation stagger positions.
alter table public.research_case_protocol
  drop constraint if exists research_case_protocol_stagger_position_key;

create or replace function public.research_admin_set_case_protocol(
  target_case_id uuid,
  target_stagger_position smallint
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  baseline_count smallint;
  target_is_test boolean;
  result public.research_case_protocol%rowtype;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('research_case_protocol_swap'));

  if target_stagger_position not between 1 and 5 then
    raise exception 'stagger position must be 1 through 5' using errcode='22023';
  end if;

  if exists(
    select 1 from public.research_case_phase_events
    where case_id=target_case_id and phase='baseline'
  ) then
    raise exception 'protocol plan cannot be corrected after baseline has begun'
      using errcode='55000';
  end if;

  select p.is_test into target_is_test
  from public.participants p
  where p.case_id=target_case_id
  limit 1;

  if target_is_test is null then
    raise exception 'case participant not found' using errcode='P0002';
  end if;

  if not target_is_test and exists(
    select 1
    from public.research_case_protocol cp
    join public.participants p on p.case_id=cp.case_id
    where cp.case_id<>target_case_id
      and cp.stagger_position=target_stagger_position
      and p.is_test=false
  ) then
    raise exception 'stagger position % is already assigned to another dissertation case',target_stagger_position
      using errcode='23505';
  end if;

  baseline_count:=case target_stagger_position
    when 1 then 6 when 2 then 8 when 3 then 10 when 4 then 12 when 5 then 14
  end;

  insert into public.research_case_protocol(
    case_id,stagger_position,planned_baseline_observations,created_by,updated_by
  )
  values(
    target_case_id,target_stagger_position,baseline_count,auth.uid(),auth.uid()
  )
  on conflict(case_id) do update
  set stagger_position=excluded.stagger_position,
      planned_baseline_observations=excluded.planned_baseline_observations,
      updated_by=auth.uid(),
      updated_at=now()
  returning * into result;

  insert into public.research_case_protocol_events(
    case_id,stagger_position,planned_baseline_observations,recorded_by
  )
  values(target_case_id,target_stagger_position,baseline_count,auth.uid());

  return to_jsonb(result);
end
$function$;

alter table public.research_intervention_start_reviews
  add column if not exists initial_series_count integer,
  add column if not exists intermittent_probe_count integer,
  add column if not exists preintervention_series_count integer,
  add column if not exists orientation_completed boolean;

create or replace function public.research_admin_start_intervention_v2(
  target_case_id uuid,
  target_effective_date date,
  target_baseline_pattern_reviewed boolean,
  target_recent_series_reviewed boolean,
  target_orientation_completed boolean,
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
  initial_count integer;
  intermittent_count integer;
  preintervention_count integer;
  final_three_count integer;
  lower_real_count integer;
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
      using errcode='22023';
  end if;

  if coalesce(target_baseline_pattern_reviewed,false) is not true then
    raise exception 'baseline visual review confirmation is required'
      using errcode='55000';
  end if;

  if coalesce(target_orientation_completed,false) is not true then
    raise exception 'Mission: Reinforceable orientation must be completed as part of intervention launch'
      using errcode='55000';
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

  select
    count(*),
    count(*) filter(where o.baseline_measurement_role='initial_series'),
    count(*) filter(where o.baseline_measurement_role='intermittent_probe'),
    count(*) filter(where o.baseline_measurement_role='preintervention_series')
  into baseline_count,initial_count,intermittent_count,preintervention_count
  from public.research_classroom_observations o
  where o.case_id=target_case_id
    and o.phase='baseline'
    and exists(
      select 1 from public.research_classroom_observation_summary_revisions sr
      where sr.observation_id=o.id
    );

  if baseline_count<target_planned_minimum then
    raise exception 'baseline minimum not met: % finalized of % required',baseline_count,target_planned_minimum
      using errcode='55000';
  end if;

  if target_stagger_position>1 then
    if initial_count<3 then
      raise exception 'multiple-probe baseline requires an initial 3-session series before intermittent probes'
        using errcode='55000';
    end if;

    if preintervention_count<3 then
      raise exception 'multiple-probe baseline requires at least 3 finalized observations in the pre-intervention series'
        using errcode='55000';
    end if;

    select count(*) into final_three_count
    from (
      select o.baseline_measurement_role
      from public.research_classroom_observations o
      where o.case_id=target_case_id
        and o.phase='baseline'
        and exists(
          select 1 from public.research_classroom_observation_summary_revisions sr
          where sr.observation_id=o.id
        )
      order by o.observation_date desc,o.session_number desc,o.id desc
      limit 3
    ) final_rows
    where final_rows.baseline_measurement_role='preintervention_series';

    if final_three_count<>3 then
      raise exception 'the final 3 finalized baseline observations must be part of the pre-intervention probe series'
        using errcode='55000';
    end if;

    if coalesce(target_recent_series_reviewed,false) is not true then
      raise exception 'pre-intervention 3-session series review confirmation is required'
        using errcode='55000';
    end if;
  end if;

  select count(*) into lower_real_count
  from public.research_case_protocol cp
  join public.participants p on p.case_id=cp.case_id
  where p.is_test=false
    and cp.stagger_position<target_stagger_position;

  if lower_real_count<>target_stagger_position-1 then
    raise exception 'earlier real dissertation stagger positions must be assigned before this intervention can start'
      using errcode='55000';
  end if;

  if exists(
    select 1
    from public.research_case_protocol cp
    join public.participants p on p.case_id=cp.case_id and p.is_test=false
    where cp.stagger_position<target_stagger_position
      and coalesce((
        select pe.phase
        from public.research_case_phase_events pe
        where pe.case_id=cp.case_id
        order by pe.effective_date desc,pe.recorded_at desc,pe.id desc
        limit 1
      ),'prebaseline') not in('intervention','maintenance','complete','withdrawn')
  ) then
    raise exception 'planned stagger order requires earlier positions to enter intervention first'
      using errcode='55000';
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
      using errcode='55000';
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

  insert into public.research_protocol_checklist_events(
    case_id,item_key,status,status_date,brief_note,recorded_by
  )
  values(
    target_case_id,'intervention_orientation','complete',target_effective_date,
    'Completed as part of Mission: Reinforceable intervention launch.',target_actor_id
  );

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
    decision_note,recorded_by,initial_series_count,intermittent_probe_count,
    preintervention_series_count,orientation_completed
  )
  values(
    target_case_id,phase_event.id,baseline_count,target_planned_minimum,
    target_stagger_position,true,
    case when target_stagger_position=1 then true else target_recent_series_reviewed end,
    btrim(target_decision_note),target_actor_id,initial_count,intermittent_count,
    preintervention_count,true
  );

  update public.cases set active=true where id=target_case_id;

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
    enabled=true,activated_at=changed,deactivated_at=null;

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
    'initial_series_count',initial_count,
    'intermittent_probe_count',intermittent_count,
    'preintervention_series_count',preintervention_count,
    'case_active',true,
    'participant_active',true,
    'reminders_enabled',true,
    'orientation_completed',true,
    'started_at',changed
  );
end
$function$;

revoke all on function public.research_admin_start_intervention_v2(uuid,date,boolean,boolean,boolean,text,uuid)
from public, anon, authenticated;
grant execute on function public.research_admin_start_intervention_v2(uuid,date,boolean,boolean,boolean,text,uuid)
to service_role;

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
begin
  raise exception 'Use the current Start Intervention workflow so multiple-probe checks and launch orientation are recorded together.'
    using errcode='55000';
end
$function$;

revoke all on function public.research_admin_start_intervention(uuid,date,boolean,boolean,text,uuid)
from public, anon, authenticated, service_role;

comment on column public.research_classroom_observations.baseline_measurement_role is
  'Baseline measurement role: Position 1 daily baseline; later positions initial 3-session series, intermittent probes, or final pre-intervention series.';
comment on function public.research_admin_start_preintervention_probe_series(uuid,date,text) is
  'Begins the final multiple-probe baseline series for stagger positions 2-5 after the initial series and enough intermittent baseline/probe observations have accrued.';
comment on function public.research_admin_start_intervention_v2(uuid,date,boolean,boolean,boolean,text,uuid) is
  'Starts Mission: Reinforceable after multiple-probe baseline requirements, planned stagger order, visual review, and launch orientation are satisfied; phase/access/reminders change atomically.';
