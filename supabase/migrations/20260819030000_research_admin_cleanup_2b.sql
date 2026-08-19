-- Research Admin / Supabase Cleanup 2B.
-- Paper remains the raw source; only append-only electronic summaries complete sessions.

-- Replace every function that depends on retired raw storage before dropping it.
create or replace function public.research_admin_create_classroom_observation(target_case_id uuid,target_observation_date date,target_primary_observer_id uuid,target_secondary_observer_id uuid default null,target_start_time time default null,target_end_time time default null,target_context_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare setup public.research_observation_setup%rowtype; resolved_phase text; next_session integer; result public.research_classroom_observations%rowtype;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_observation_date>(now() at time zone 'America/Denver')::date then raise exception 'observation date cannot be in the future (America/Denver)' using errcode='22023'; end if;
 select * into setup from public.research_observation_setup where case_id=target_case_id; if setup.case_id is null then raise exception 'observation setup is required' using errcode='55000'; end if;
 select e.phase into resolved_phase from public.research_case_phase_events e where e.case_id=target_case_id and e.effective_date<=target_observation_date order by e.effective_date desc,e.recorded_at desc,e.id desc limit 1;
 resolved_phase:=coalesce(resolved_phase,'prebaseline'); if resolved_phase not in('baseline','intervention','maintenance') then raise exception 'observations are not allowed during phase %',resolved_phase using errcode='55000'; end if;
 if target_secondary_observer_id=target_primary_observer_id then raise exception 'primary and secondary observers must differ' using errcode='22023'; end if;
 if not exists(select 1 from public.research_observers o where o.id=target_primary_observer_id and o.active and (o.observer_type='primary_researcher' or (o.observer_type='trained_observer' and public.research_observer_status(o.id,target_observation_date)='qualified'))) then raise exception 'primary observer must be an active primary researcher or qualified trained observer' using errcode='55000'; end if;
 if target_secondary_observer_id is not null and not exists(select 1 from public.research_observers o where o.id=target_secondary_observer_id and o.observer_type='trained_observer' and o.active and public.research_observer_status(o.id,target_observation_date)='qualified') then raise exception 'secondary observer must be an active qualified trained observer' using errcode='55000'; end if;
 if length(target_context_note)>1000 then raise exception 'context note exceeds 1000 characters' using errcode='22001'; end if;
 perform pg_advisory_xact_lock(hashtext(target_case_id::text||resolved_phase)); select coalesce(max(session_number),0)+1 into next_session from public.research_classroom_observations where case_id=target_case_id and phase=resolved_phase;
 insert into public.research_classroom_observations(case_id,observation_date,phase,session_number,target_routine_snapshot,target_behavior_definition_snapshot,primary_observer_id,secondary_observer_id,start_time,end_time,context_note,created_by)
 values(target_case_id,target_observation_date,resolved_phase,next_session,setup.target_routine,setup.target_behavior_definition,target_primary_observer_id,target_secondary_observer_id,target_start_time,target_end_time,nullif(btrim(target_context_note),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;

create or replace function public.research_observer_status(target_observer_id uuid, as_of_date date default ((now() at time zone 'America/Denver')::date))
returns text language sql stable security definer set search_path='' as $$
 with o as (select * from public.research_observers where id=target_observer_id),
 current_summaries as (select distinct on(r.observation_id) r.observation_id,r.teacher_fidelity_ioa_percent,r.student_behavior_ioa_percent,r.recorded_at,s.observation_date,s.secondary_observer_id from public.research_classroom_observation_summary_revisions r join public.research_classroom_observations s on s.id=r.observation_id order by r.observation_id,r.revision_number desc,r.recorded_at desc,r.id desc),
 low as (select observation_date low_date,recorded_at low_recorded_at from current_summaries where secondary_observer_id=target_observer_id and observation_date<=as_of_date and (teacher_fidelity_ioa_percent<=80 or student_behavior_ioa_percent<=80) order by observation_date desc,recorded_at desc,observation_id desc limit 1),
 good as (select e.event_date good_date,e.recorded_at good_recorded_at from public.research_observer_training_events e where e.observer_id=target_observer_id and e.event_date<=as_of_date and e.event_type in('practice','recalibration','retraining') and e.teacher_fidelity_agreement>=85 and e.student_behavior_agreement>=85 order by e.event_date desc,e.recorded_at desc,e.id desc limit 1)
 select case when not o.active then 'inactive' when o.observer_type='primary_researcher' then 'qualified' when low.low_date is not null and (good.good_date is null or (good.good_date,good.good_recorded_at)<=(low.low_date,low.low_recorded_at)) then 'recalibration_required' when good.good_date is not null then 'qualified' else 'training_needed' end from o left join low on true left join good on true
$$;

create or replace function public.research_admin_observation_dashboard(target_case_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with current_summaries as (select distinct on(observation_id)* from public.research_classroom_observation_summary_revisions order by observation_id,revision_number desc,recorded_at desc,id desc),
 rows as (select o.*,po.observer_code primary_observer_code,so.observer_code secondary_observer_code,cs.teacher_fidelity_percent,cs.student_target_behavior_percent,cs.id summary_revision_id,cs.revision_number summary_revision_number,cs.observation_note summary_observation_note,cs.ioa_note,cs.correction_reason summary_correction_reason,cs.recorded_at summary_recorded_at,
  case when o.secondary_observer_id is not null and cs.teacher_fidelity_ioa_percent is not null and cs.student_behavior_ioa_percent is not null then jsonb_build_object('teacher_fidelity_ioa_percent',cs.teacher_fidelity_ioa_percent,'student_behavior_ioa_percent',cs.student_behavior_ioa_percent,'overall_ioa_attention',cs.teacher_fidelity_ioa_percent<=80 or cs.student_behavior_ioa_percent<=80,'summary_revision_id',cs.id) end ioa
  from public.research_classroom_observations o join current_summaries cs on cs.observation_id=o.id join public.research_observers po on po.id=o.primary_observer_id left join public.research_observers so on so.id=o.secondary_observer_id where target_case_id is null or o.case_id=target_case_id),
 totals as (select count(*) n,count(*) filter(where ioa is not null)paired,count(*) filter(where (ioa->>'teacher_fidelity_ioa_percent')::numeric<=80)teacher_alerts,count(*) filter(where (ioa->>'student_behavior_ioa_percent')::numeric<=80)student_alerts from rows)
 select jsonb_build_object('observers',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('status',public.research_observer_status(o.id),'latest_training',(select to_jsonb(e) from public.research_observer_training_events e where e.observer_id=o.id order by e.event_date desc,e.recorded_at desc,e.id desc limit 1),'training_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.event_date desc,e.recorded_at desc,e.id desc) from public.research_observer_training_events e where e.observer_id=o.id),'[]'::jsonb)) order by o.observer_code) from public.research_observers o),'[]'::jsonb),'setups',coalesce((select jsonb_agg(to_jsonb(s)) from public.research_observation_setup s where target_case_id is null or s.case_id=target_case_id),'[]'::jsonb),'observations',coalesce((select jsonb_agg(to_jsonb(r) order by r.observation_date desc,r.session_number desc) from rows r),'[]'::jsonb),'coverage',jsonb_build_object('completed',totals.n,'ioa',totals.paired,'percent',case when totals.n=0 then 0 else round(100.0*totals.paired/totals.n,1) end,'required_minimum',ceil(totals.n*.20),'additional_needed',greatest(ceil(totals.n*.20)-totals.paired,0),'teacher_alerts',totals.teacher_alerts,'student_alerts',totals.student_alerts),'by_phase',coalesce((select jsonb_agg(x order by x.phase) from(select phase,count(*) completed,count(*) filter(where ioa is not null) ioa,round(100.0*count(*) filter(where ioa is not null)/count(*),1) percent from rows group by phase)x),'[]'::jsonb),'by_dyad',coalesce((select jsonb_agg(x order by x.study_id) from(select p.participant_code study_id,count(*) completed,count(*) filter(where r.ioa is not null) ioa,round(100.0*count(*) filter(where r.ioa is not null)/count(*),1) percent from rows r join public.participants p on p.case_id=r.case_id group by p.participant_code)x),'[]'::jsonb)) into result from totals; return result; end $$;

-- Retired RPCs and raw-only helper. DROP FUNCTION also removes their grants.
drop function if exists public.research_admin_submit_classroom_observation_record(uuid,text,jsonb,jsonb,text,text);
drop function if exists public.research_admin_compute_classroom_ioa(uuid);
drop function if exists public.research_generate_classroom_ioa(uuid);
drop function if exists public.research_admin_create_legacy_observation_summary(uuid,numeric,numeric,numeric,numeric,text,text,text);

-- Remove table-local protections explicitly before their owning tables.
drop trigger if exists research_classroom_ioa_results_no_delete on public.research_classroom_ioa_results;
drop policy if exists "Research admins read research_classroom_ioa_results" on public.research_classroom_ioa_results;
drop table if exists public.research_classroom_ioa_results;
drop trigger if exists research_classroom_observation_records_no_delete on public.research_classroom_observation_records;
drop policy if exists "Research admins read research_classroom_observation_records" on public.research_classroom_observation_records;
drop index if exists public.research_observation_records_current_idx;
drop table if exists public.research_classroom_observation_records;

-- Session metadata no longer carries digital entry payload configuration.
alter table public.research_classroom_observations drop column if exists fidelity_items_snapshot;
alter table public.research_classroom_observations drop column if exists duration_minutes;
alter table public.research_classroom_observations drop column if exists interval_seconds;
alter table public.research_classroom_observations drop column if exists interval_count;
