-- Classroom observations and interobserver agreement (June 29 dissertation methods).
-- This additive, research-admin-only subsystem deliberately has no dependency on game scores,
-- teacher reports, or MR procedural-fidelity records.

create table public.research_observation_setup (
  case_id uuid primary key references public.cases(id),
  target_routine text not null check (btrim(target_routine) <> ''),
  target_behavior_definition text not null check (btrim(target_behavior_definition) <> ''),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create table public.research_observation_setup_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id),
  target_routine text not null, target_behavior_definition text not null, change_note text,
  recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now()
);
create table public.research_observers (
  id uuid primary key default gen_random_uuid(), observer_code text not null unique check (observer_code ~ '^[A-Za-z0-9-]{2,16}$'),
  display_name text not null check (btrim(display_name) <> ''), observer_type text not null check (observer_type in ('primary_researcher','trained_observer')),
  active boolean not null default true, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create unique index research_observers_one_primary on public.research_observers(observer_type) where observer_type='primary_researcher' and active;
create table public.research_observer_training_events (
  id uuid primary key default gen_random_uuid(), observer_id uuid not null references public.research_observers(id),
  event_type text not null check (event_type in ('training','practice','recalibration','retraining')), event_date date not null,
  teacher_fidelity_agreement numeric(5,2) check (teacher_fidelity_agreement between 0 and 100),
  student_behavior_agreement numeric(5,2) check (student_behavior_agreement between 0 and 100), brief_note text,
  recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now()
);
create table public.research_classroom_observations (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id), observation_date date not null,
  phase text not null check (phase in ('baseline','intervention','maintenance')), session_number integer not null check(session_number > 0),
  target_routine_snapshot text not null, target_behavior_definition_snapshot text not null, fidelity_items_snapshot jsonb not null,
  primary_observer_id uuid not null references public.research_observers(id), secondary_observer_id uuid references public.research_observers(id),
  duration_minutes smallint not null default 30 check(duration_minutes=30), interval_seconds smallint not null default 15 check(interval_seconds=15),
  interval_count smallint not null default 120 check(interval_count=120), start_time time, end_time time, context_note text,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique(case_id,phase,session_number), check(secondary_observer_id is null or secondary_observer_id<>primary_observer_id)
);
create table public.research_classroom_observation_records (
  id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.research_classroom_observations(id),
  observer_id uuid not null references public.research_observers(id), observer_role text not null check(observer_role in ('primary','secondary')),
  revision_number integer not null check(revision_number>0), fidelity_scores jsonb not null, student_intervals jsonb not null,
  implemented_count integer not null, not_implemented_count integer not null, no_opportunity_count integer not null,
  scoreable_count integer not null, teacher_fidelity_percent numeric(7,4), occurrence_count integer not null,
  no_occurrence_count integer not null, not_observed_count integer not null, observed_interval_count integer not null,
  student_target_behavior_percent numeric(7,4), observer_note text, submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(), correction_reason text,
  unique(observation_id,observer_role,revision_number),
  check((revision_number=1 and correction_reason is null) or (revision_number>1 and nullif(btrim(correction_reason),'') is not null))
);
create table public.research_classroom_ioa_results (
  id uuid primary key default gen_random_uuid(), observation_id uuid not null references public.research_classroom_observations(id),
  primary_record_id uuid not null references public.research_classroom_observation_records(id), secondary_record_id uuid not null references public.research_classroom_observation_records(id),
  teacher_item_agreements integer not null, teacher_item_disagreements integer not null, teacher_fidelity_ioa_percent numeric(7,4),
  student_interval_agreements integer not null, student_interval_disagreements integer not null,
  student_intervals_excluded_not_observed integer not null, student_behavior_ioa_percent numeric(7,4),
  meets_teacher_ioa_criterion boolean not null, meets_student_ioa_criterion boolean not null,
  overall_ioa_attention boolean not null, created_at timestamptz not null default now(),
  unique(primary_record_id,secondary_record_id)
);

create index research_observation_records_current_idx on public.research_classroom_observation_records(observation_id,observer_role,revision_number desc);
create index research_observations_case_date_idx on public.research_classroom_observations(case_id,observation_date desc);
create index research_training_observer_date_idx on public.research_observer_training_events(observer_id,event_date desc,recorded_at desc);

create function public.research_observer_status(target_observer_id uuid, as_of_date date default ((now() at time zone 'America/Denver')::date))
returns text language sql stable security definer set search_path='' as $$
  with o as (select * from public.research_observers where id=target_observer_id),
  low as (select max(s.observation_date) low_date from public.research_classroom_ioa_results r join public.research_classroom_observations s on s.id=r.observation_id where s.secondary_observer_id=target_observer_id and s.observation_date<=as_of_date and r.overall_ioa_attention),
  good as (select max(e.event_date) good_date from public.research_observer_training_events e where e.observer_id=target_observer_id and e.event_date<=as_of_date and e.event_type in('practice','recalibration','retraining') and e.teacher_fidelity_agreement>=85 and e.student_behavior_agreement>=85)
  select case when not o.active then 'inactive' when o.observer_type='primary_researcher' then 'qualified'
    when low.low_date is not null and (good.good_date is null or good.good_date<=low.low_date) then 'recalibration_required'
    when good.good_date is not null then 'qualified' else 'training_needed' end from o cross join low cross join good
$$;

create function public.research_admin_save_observation_setup(target_case_id uuid,target_routine text,target_behavior_definition text,target_change_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_observation_setup%rowtype; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if nullif(btrim(target_routine),'') is null or nullif(btrim(target_behavior_definition),'') is null then raise exception 'target routine and operational definition are required' using errcode='22023'; end if;
 insert into public.research_observation_setup(case_id,target_routine,target_behavior_definition,created_by,updated_by) values(target_case_id,btrim(target_routine),btrim(target_behavior_definition),auth.uid(),auth.uid())
 on conflict(case_id) do update set target_routine=excluded.target_routine,target_behavior_definition=excluded.target_behavior_definition,updated_by=auth.uid(),updated_at=now() returning * into result;
 insert into public.research_observation_setup_events(case_id,target_routine,target_behavior_definition,change_note,recorded_by) values(target_case_id,result.target_routine,result.target_behavior_definition,nullif(btrim(target_change_note),''),auth.uid()); return to_jsonb(result); end $$;

create function public.research_admin_save_observer(target_observer_id uuid,target_observer_code text,target_display_name text,target_observer_type text,target_active boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_observers%rowtype; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_observer_id is null then insert into public.research_observers(observer_code,display_name,observer_type,active,created_by) values(upper(btrim(target_observer_code)),btrim(target_display_name),target_observer_type,target_active,auth.uid()) returning * into result;
 else update public.research_observers set observer_code=upper(btrim(target_observer_code)),display_name=btrim(target_display_name),observer_type=target_observer_type,active=target_active,updated_by=auth.uid(),updated_at=now() where id=target_observer_id returning * into result; end if; return to_jsonb(result); end $$;

create function public.research_admin_record_observer_training(target_observer_id uuid,target_event_type text,target_event_date date,target_teacher_fidelity_agreement numeric,target_student_behavior_agreement numeric,target_brief_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_observer_training_events%rowtype; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_event_date>(now() at time zone 'America/Denver')::date then raise exception 'training date cannot be in the future (America/Denver)' using errcode='22023'; end if;
 insert into public.research_observer_training_events(observer_id,event_type,event_date,teacher_fidelity_agreement,student_behavior_agreement,brief_note,recorded_by) values(target_observer_id,target_event_type,target_event_date,target_teacher_fidelity_agreement,target_student_behavior_agreement,nullif(btrim(target_brief_note),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;

create function public.research_admin_create_classroom_observation(target_case_id uuid,target_observation_date date,target_primary_observer_id uuid,target_secondary_observer_id uuid default null,target_start_time time default null,target_end_time time default null,target_context_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare setup public.research_observation_setup%rowtype; resolved_phase text; items jsonb; next_session integer; result public.research_classroom_observations%rowtype;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_observation_date>(now() at time zone 'America/Denver')::date then raise exception 'observation date cannot be in the future (America/Denver)' using errcode='22023'; end if;
 select * into setup from public.research_observation_setup where case_id=target_case_id; if setup.case_id is null then raise exception 'observation setup is required' using errcode='55000'; end if;
 select e.phase into resolved_phase from public.research_case_phase_events e where e.case_id=target_case_id and e.effective_date<=target_observation_date order by e.effective_date desc,e.recorded_at desc,e.id desc limit 1;
 resolved_phase:=coalesce(resolved_phase,'prebaseline'); if resolved_phase not in('baseline','intervention','maintenance') then raise exception 'observations are not allowed during phase %',resolved_phase using errcode='55000'; end if;
 if target_secondary_observer_id=target_primary_observer_id then raise exception 'primary and secondary observers must differ' using errcode='22023'; end if;
 if not exists(select 1 from public.research_observers where id=target_primary_observer_id and active) then raise exception 'active primary observer required' using errcode='22023'; end if;
 if target_secondary_observer_id is not null and public.research_observer_status(target_secondary_observer_id,target_observation_date)<>'qualified' then raise exception 'secondary observer must be qualified and not require recalibration' using errcode='55000'; end if;
 select jsonb_agg(jsonb_build_object('target_key',f.target_key,'domain',f.domain,'description',f.description,'sort_order',f.sort_order) order by f.sort_order,f.target_key) into items from public.fidelity_targets f where f.case_id=target_case_id and f.active;
 if items is null then raise exception 'at least one active fidelity target is required' using errcode='55000'; end if;
 if exists(select 1 from jsonb_array_elements(items) x where nullif(btrim(x->>'target_key'),'') is null) then raise exception 'every active fidelity target requires a stable target_key' using errcode='55000'; end if;
 perform pg_advisory_xact_lock(hashtext(target_case_id::text||resolved_phase)); select coalesce(max(session_number),0)+1 into next_session from public.research_classroom_observations where case_id=target_case_id and phase=resolved_phase;
 insert into public.research_classroom_observations(case_id,observation_date,phase,session_number,target_routine_snapshot,target_behavior_definition_snapshot,fidelity_items_snapshot,primary_observer_id,secondary_observer_id,start_time,end_time,context_note,created_by)
 values(target_case_id,target_observation_date,resolved_phase,next_session,setup.target_routine,setup.target_behavior_definition,items,target_primary_observer_id,target_secondary_observer_id,target_start_time,target_end_time,nullif(btrim(target_context_note),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;

-- Declared before submission RPC; replaced below with the complete calculator.
create function public.research_generate_classroom_ioa(target_observation_id uuid) returns uuid language plpgsql security definer set search_path='' as $$ begin return null; end $$;

create function public.research_admin_submit_classroom_observation_record(target_observation_id uuid,target_observer_role text,submitted_fidelity_scores jsonb,submitted_student_intervals jsonb,target_observer_note text default null,target_correction_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare obs public.research_classroom_observations%rowtype; result public.research_classroom_observation_records%rowtype; rev integer; assigned uuid; snapshot_keys text[]; score_keys text[]; interval_numbers integer[]; impl integer; notimpl integer; noop integer; occurrence integer; nooccurrence integer; notobserved integer;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select * into obs from public.research_classroom_observations where id=target_observation_id for update; if obs.id is null then raise exception 'observation not found' using errcode='P0002'; end if;
 if target_observer_role not in('primary','secondary') then raise exception 'observer role must be primary or secondary' using errcode='22023'; end if; assigned:=case when target_observer_role='primary' then obs.primary_observer_id else obs.secondary_observer_id end; if assigned is null then raise exception 'no observer assigned for role' using errcode='22023'; end if;
 if jsonb_typeof(submitted_fidelity_scores)<>'array' then raise exception 'fidelity scores must be an array' using errcode='22023'; end if;
 select array_agg(x->>'target_key' order by x->>'target_key') into snapshot_keys from jsonb_array_elements(obs.fidelity_items_snapshot)x;
 select array_agg(x->>'target_key' order by x->>'target_key'),count(*) filter(where x->>'status' not in('implemented_as_written','not_implemented_as_written','no_opportunity')),count(*) filter(where x->>'status'='implemented_as_written'),count(*) filter(where x->>'status'='not_implemented_as_written'),count(*) filter(where x->>'status'='no_opportunity') into score_keys,rev,impl,notimpl,noop from jsonb_array_elements(submitted_fidelity_scores)x;
 if score_keys is distinct from snapshot_keys or cardinality(score_keys)<>(select count(distinct k) from unnest(score_keys)k) then raise exception 'fidelity target keys must exactly match snapshot without duplicates' using errcode='22023'; end if; if rev>0 then raise exception 'invalid fidelity status' using errcode='22023'; end if;
 if jsonb_typeof(submitted_student_intervals)<>'array' or jsonb_array_length(submitted_student_intervals)<>120 then raise exception 'exactly 120 student intervals are required' using errcode='22023'; end if;
 select array_agg((x->>'interval_number')::integer order by (x->>'interval_number')::integer),count(*) filter(where x->>'status' not in('occurrence','no_occurrence','not_observed')),count(*) filter(where x->>'status'='occurrence'),count(*) filter(where x->>'status'='no_occurrence'),count(*) filter(where x->>'status'='not_observed') into interval_numbers,rev,occurrence,nooccurrence,notobserved from jsonb_array_elements(submitted_student_intervals)x;
 if interval_numbers<>array(select generate_series(1,120)) or cardinality(interval_numbers)<>(select count(distinct n) from unnest(interval_numbers)n) then raise exception 'interval numbers must be unique 1 through 120' using errcode='22023'; end if; if rev>0 then raise exception 'invalid interval status' using errcode='22023'; end if;
 select coalesce(max(revision_number),0)+1 into rev from public.research_classroom_observation_records where observation_id=obs.id and observer_role=target_observer_role;
 if rev>1 and nullif(btrim(target_correction_reason),'') is null then raise exception 'correction reason is required for a revision' using errcode='22023'; end if;
 insert into public.research_classroom_observation_records(observation_id,observer_id,observer_role,revision_number,fidelity_scores,student_intervals,implemented_count,not_implemented_count,no_opportunity_count,scoreable_count,teacher_fidelity_percent,occurrence_count,no_occurrence_count,not_observed_count,observed_interval_count,student_target_behavior_percent,observer_note,submitted_by,correction_reason)
 values(obs.id,assigned,target_observer_role,rev,submitted_fidelity_scores,submitted_student_intervals,impl,notimpl,noop,impl+notimpl,case when impl+notimpl=0 then null else 100.0*impl/(impl+notimpl) end,occurrence,nooccurrence,notobserved,occurrence+nooccurrence,case when occurrence+nooccurrence=0 then null else 100.0*occurrence/(occurrence+nooccurrence) end,nullif(btrim(target_observer_note),''),auth.uid(),nullif(btrim(target_correction_reason),'')) returning * into result;
 perform public.research_generate_classroom_ioa(obs.id); return to_jsonb(result); end $$;

create or replace function public.research_generate_classroom_ioa(target_observation_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.research_classroom_observation_records%rowtype; s public.research_classroom_observation_records%rowtype; ta integer; td integer; sa integer; sd integer; sx integer; result_id uuid;
begin
 select * into p from public.research_classroom_observation_records where observation_id=target_observation_id and observer_role='primary' order by revision_number desc limit 1;
 select * into s from public.research_classroom_observation_records where observation_id=target_observation_id and observer_role='secondary' order by revision_number desc limit 1; if p.id is null or s.id is null then return null; end if;
 if exists(select 1 from public.research_classroom_ioa_results where primary_record_id=p.id and secondary_record_id=s.id) then return (select id from public.research_classroom_ioa_results where primary_record_id=p.id and secondary_record_id=s.id); end if;
 select count(*) filter(where px->>'status'=sxv->>'status'),count(*) filter(where px->>'status'<>sxv->>'status') into ta,td from jsonb_array_elements(p.fidelity_scores)px join jsonb_array_elements(s.fidelity_scores)sxv on sxv->>'target_key'=px->>'target_key';
 select count(*) filter(where px->>'status'<>'not_observed' and sxv->>'status'<>'not_observed' and px->>'status'=sxv->>'status'),count(*) filter(where px->>'status'<>'not_observed' and sxv->>'status'<>'not_observed' and px->>'status'<>sxv->>'status'),count(*) filter(where px->>'status'='not_observed' or sxv->>'status'='not_observed') into sa,sd,sx from jsonb_array_elements(p.student_intervals)px join jsonb_array_elements(s.student_intervals)sxv on sxv->>'interval_number'=px->>'interval_number';
 insert into public.research_classroom_ioa_results(observation_id,primary_record_id,secondary_record_id,teacher_item_agreements,teacher_item_disagreements,teacher_fidelity_ioa_percent,student_interval_agreements,student_interval_disagreements,student_intervals_excluded_not_observed,student_behavior_ioa_percent,meets_teacher_ioa_criterion,meets_student_ioa_criterion,overall_ioa_attention)
 values(target_observation_id,p.id,s.id,ta,td,case when ta+td=0 then null else 100.0*ta/(ta+td) end,sa,sd,sx,case when sa+sd=0 then null else 100.0*sa/(sa+sd) end,(case when ta+td=0 then null else 100.0*ta/(ta+td) end)>80,coalesce((case when sa+sd=0 then null else 100.0*sa/(sa+sd) end)>80,false),coalesce((case when ta+td=0 then null else 100.0*ta/(ta+td) end)<=80,false) or coalesce((case when sa+sd=0 then null else 100.0*sa/(sa+sd) end)<=80,false)) returning id into result_id; return result_id; end $$;

create function public.research_admin_observation_dashboard(target_case_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with current_records as (select distinct on(observation_id,observer_role)* from public.research_classroom_observation_records order by observation_id,observer_role,revision_number desc), rows as (
 select o.*,pr.teacher_fidelity_percent,pr.student_target_behavior_percent,pr.id primary_record_id,sr.id secondary_record_id,
 (select to_jsonb(i) from public.research_classroom_ioa_results i where i.primary_record_id=pr.id and i.secondary_record_id=sr.id order by i.created_at desc limit 1) ioa
 from public.research_classroom_observations o left join current_records pr on pr.observation_id=o.id and pr.observer_role='primary' left join current_records sr on sr.observation_id=o.id and sr.observer_role='secondary' where target_case_id is null or o.case_id=target_case_id), totals as(select count(*) filter(where primary_record_id is not null)n,count(*) filter(where primary_record_id is not null and secondary_record_id is not null)paired from rows)
 select jsonb_build_object('observers',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('status',public.research_observer_status(o.id),'latest_training',(select to_jsonb(e) from public.research_observer_training_events e where e.observer_id=o.id order by e.event_date desc,e.recorded_at desc limit 1)) order by o.observer_code) from public.research_observers o),'[]'::jsonb),
 'setups',coalesce((select jsonb_agg(to_jsonb(s)) from public.research_observation_setup s where target_case_id is null or s.case_id=target_case_id),'[]'::jsonb),
 'observations',coalesce((select jsonb_agg(to_jsonb(r) order by r.observation_date desc,r.session_number desc) from rows r),'[]'::jsonb),
 'coverage',jsonb_build_object('completed',totals.n,'ioa',totals.paired,'percent',case when totals.n=0 then 0 else round(100.0*totals.paired/totals.n,1) end,'required_minimum',ceil(totals.n*.20),'additional_needed',greatest(ceil(totals.n*.20)-totals.paired,0)),
 'by_phase',coalesce((select jsonb_agg(x) from(select phase,count(*) filter(where primary_record_id is not null) completed,count(*) filter(where primary_record_id is not null and secondary_record_id is not null) ioa from rows group by phase)x),'[]'::jsonb)) into result from totals; return result; end $$;

do $$ declare t text; begin foreach t in array array['research_observation_setup','research_observation_setup_events','research_observers','research_observer_training_events','research_classroom_observations','research_classroom_observation_records','research_classroom_ioa_results'] loop
 execute format('alter table public.%I enable row level security',t); execute format('revoke all on table public.%I from anon,authenticated',t); execute format('grant select on table public.%I to authenticated',t); execute format('create policy "Research admins read %s" on public.%I for select to authenticated using ((select public.is_research_admin()))',t,t); end loop; end $$;
do $$ declare t text; begin foreach t in array array['research_observation_setup_events','research_observer_training_events','research_classroom_observations','research_classroom_observation_records','research_classroom_ioa_results'] loop execute format('create trigger %I_no_delete before delete on public.%I for each row execute function public.prevent_research_operations_delete()',t,t); end loop; end $$;
do $$ declare fn record; begin for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('research_admin_save_observation_setup','research_admin_save_observer','research_admin_record_observer_training','research_admin_create_classroom_observation','research_admin_submit_classroom_observation_record','research_admin_observation_dashboard') loop execute format('revoke all on function %s from public,anon',fn.signature); execute format('grant execute on function %s to authenticated',fn.signature); end loop; end $$;
revoke all on function public.research_generate_classroom_ioa(uuid) from public,anon,authenticated;
revoke all on function public.research_observer_status(uuid,date) from public,anon,authenticated;
