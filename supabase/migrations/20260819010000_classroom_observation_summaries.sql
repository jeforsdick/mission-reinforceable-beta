-- Paper forms are the raw source record. This additive table stores append-only
-- authoritative electronic summaries while the legacy item/interval tables remain intact.
create table public.research_classroom_observation_summary_revisions (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.research_classroom_observations(id),
  revision_number integer not null check (revision_number > 0),
  teacher_fidelity_percent numeric(7,4) not null check (teacher_fidelity_percent between 0 and 100),
  student_target_behavior_percent numeric(7,4) not null check (student_target_behavior_percent between 0 and 100),
  teacher_fidelity_ioa_percent numeric(7,4) check (teacher_fidelity_ioa_percent between 0 and 100),
  student_behavior_ioa_percent numeric(7,4) check (student_behavior_ioa_percent between 0 and 100),
  observation_note text check (length(observation_note) <= 1000),
  ioa_note text check (length(ioa_note) <= 1000),
  correction_reason text check (length(correction_reason) <= 1000),
  recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now(),
  unique(observation_id, revision_number),
  check ((teacher_fidelity_ioa_percent is null) = (student_behavior_ioa_percent is null)),
  check (revision_number=1 or nullif(btrim(correction_reason),'') is not null)
);
create index research_observation_summary_current_idx on public.research_classroom_observation_summary_revisions(observation_id,revision_number desc);
alter table public.research_classroom_observation_summary_revisions enable row level security;
revoke all on table public.research_classroom_observation_summary_revisions from anon,authenticated;
grant select on table public.research_classroom_observation_summary_revisions to authenticated;
create policy "Research admins read observation summary revisions" on public.research_classroom_observation_summary_revisions for select to authenticated using ((select public.is_research_admin()));
create trigger research_classroom_observation_summary_revisions_no_delete before delete on public.research_classroom_observation_summary_revisions for each row execute function public.prevent_research_operations_delete();

create function public.research_admin_record_classroom_observation_summary(
  target_case_id uuid, target_observation_date date, target_primary_observer_id uuid,
  target_teacher_fidelity_percent numeric, target_student_target_behavior_percent numeric,
  target_secondary_observer_id uuid default null, target_teacher_fidelity_ioa_percent numeric default null,
  target_student_behavior_ioa_percent numeric default null, target_start_time time default null,
  target_end_time time default null, target_observation_note text default null, target_ioa_note text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare observation jsonb; summary jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if target_teacher_fidelity_percent not between 0 and 100 or target_student_target_behavior_percent not between 0 and 100 then raise exception 'observation percentages must be between 0 and 100' using errcode='22023'; end if;
  if (target_secondary_observer_id is null) <> (target_teacher_fidelity_ioa_percent is null) or (target_secondary_observer_id is null) <> (target_student_behavior_ioa_percent is null) then raise exception 'IOA observer and both IOA percentages are required together' using errcode='22023'; end if;
  if target_teacher_fidelity_ioa_percent not between 0 and 100 or target_student_behavior_ioa_percent not between 0 and 100 then raise exception 'IOA percentages must be between 0 and 100' using errcode='22023'; end if;
  observation := public.research_admin_create_classroom_observation(target_case_id,target_observation_date,target_primary_observer_id,target_secondary_observer_id,target_start_time,target_end_time,target_observation_note);
  insert into public.research_classroom_observation_summary_revisions(observation_id,revision_number,teacher_fidelity_percent,student_target_behavior_percent,teacher_fidelity_ioa_percent,student_behavior_ioa_percent,observation_note,ioa_note,recorded_by)
  values((observation->>'id')::uuid,1,target_teacher_fidelity_percent,target_student_target_behavior_percent,target_teacher_fidelity_ioa_percent,target_student_behavior_ioa_percent,nullif(btrim(target_observation_note),''),nullif(btrim(target_ioa_note),''),auth.uid()) returning to_jsonb(research_classroom_observation_summary_revisions.*) into summary;
  return jsonb_build_object('observation',observation,'summary',summary);
end $$;

-- Starts the summary revision stream for an observation finalized under the legacy
-- raw-entry workflow. Raw fidelity and interval rows remain untouched.
create function public.research_admin_create_legacy_observation_summary(
 target_observation_id uuid, target_teacher_fidelity_percent numeric, target_student_target_behavior_percent numeric,
 target_teacher_fidelity_ioa_percent numeric default null, target_student_behavior_ioa_percent numeric default null,
 target_observation_note text default null, target_ioa_note text default null, target_correction_reason text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare obs public.research_classroom_observations%rowtype; legacy_has_ioa boolean; result public.research_classroom_observation_summary_revisions%rowtype;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select * into obs from public.research_classroom_observations where id=target_observation_id for update;
 if obs.id is null then raise exception 'observation not found' using errcode='P0002'; end if;
 if not exists(select 1 from public.research_classroom_observation_records where observation_id=obs.id and observer_role='primary') then raise exception 'a finalized legacy raw observation record is required' using errcode='55000'; end if;
 select exists(select 1 from public.research_classroom_observation_records where observation_id=obs.id and observer_role='secondary') into legacy_has_ioa;
 if exists(select 1 from public.research_classroom_observation_summary_revisions where observation_id=obs.id) then raise exception 'observation already has a summary revision' using errcode='23505'; end if;
 if nullif(btrim(target_correction_reason),'') is null then raise exception 'correction reason is required for a legacy summary correction' using errcode='22023'; end if;
 if target_teacher_fidelity_percent not between 0 and 100 or target_student_target_behavior_percent not between 0 and 100 then raise exception 'observation percentages must be between 0 and 100' using errcode='22023'; end if;
 if legacy_has_ioa <> (target_teacher_fidelity_ioa_percent is not null) or legacy_has_ioa <> (target_student_behavior_ioa_percent is not null) then raise exception 'collected legacy IOA and both IOA percentages are required together' using errcode='22023'; end if;
 if target_teacher_fidelity_ioa_percent not between 0 and 100 or target_student_behavior_ioa_percent not between 0 and 100 then raise exception 'IOA percentages must be between 0 and 100' using errcode='22023'; end if;
 if length(target_observation_note)>1000 or length(target_ioa_note)>1000 or length(target_correction_reason)>1000 then raise exception 'observation summary note exceeds 1000 characters' using errcode='22001'; end if;
 insert into public.research_classroom_observation_summary_revisions(observation_id,revision_number,teacher_fidelity_percent,student_target_behavior_percent,teacher_fidelity_ioa_percent,student_behavior_ioa_percent,observation_note,ioa_note,correction_reason,recorded_by)
 values(obs.id,1,target_teacher_fidelity_percent,target_student_target_behavior_percent,target_teacher_fidelity_ioa_percent,target_student_behavior_ioa_percent,nullif(btrim(target_observation_note),''),nullif(btrim(target_ioa_note),''),btrim(target_correction_reason),auth.uid()) returning * into result;
 return to_jsonb(result);
end $$;

create function public.research_admin_revise_classroom_observation_summary(
 target_observation_id uuid, target_teacher_fidelity_percent numeric, target_student_target_behavior_percent numeric,
 target_teacher_fidelity_ioa_percent numeric default null, target_student_behavior_ioa_percent numeric default null,
 target_observation_note text default null, target_ioa_note text default null, target_correction_reason text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare obs public.research_classroom_observations%rowtype; rev integer; current_has_ioa boolean; result public.research_classroom_observation_summary_revisions%rowtype;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select * into obs from public.research_classroom_observations where id=target_observation_id for update;
 if obs.id is null then raise exception 'observation not found' using errcode='P0002'; end if;
 if not exists(select 1 from public.research_classroom_observation_summary_revisions where observation_id=obs.id) then raise exception 'legacy raw observations use the existing raw-record correction workflow' using errcode='55000'; end if;
 if nullif(btrim(target_correction_reason),'') is null then raise exception 'correction reason is required for a summary revision' using errcode='22023'; end if;
 if target_teacher_fidelity_percent not between 0 and 100 or target_student_target_behavior_percent not between 0 and 100 then raise exception 'observation percentages must be between 0 and 100' using errcode='22023'; end if;
 select teacher_fidelity_ioa_percent is not null into current_has_ioa from public.research_classroom_observation_summary_revisions where observation_id=obs.id order by revision_number desc limit 1;
 if current_has_ioa <> (target_teacher_fidelity_ioa_percent is not null) or current_has_ioa <> (target_student_behavior_ioa_percent is not null) then raise exception 'IOA collection status and both IOA percentages must remain consistent' using errcode='22023'; end if;
 if target_teacher_fidelity_ioa_percent not between 0 and 100 or target_student_behavior_ioa_percent not between 0 and 100 then raise exception 'IOA percentages must be between 0 and 100' using errcode='22023'; end if;
 select max(revision_number)+1 into rev from public.research_classroom_observation_summary_revisions where observation_id=obs.id;
 insert into public.research_classroom_observation_summary_revisions(observation_id,revision_number,teacher_fidelity_percent,student_target_behavior_percent,teacher_fidelity_ioa_percent,student_behavior_ioa_percent,observation_note,ioa_note,correction_reason,recorded_by)
 values(obs.id,rev,target_teacher_fidelity_percent,target_student_target_behavior_percent,target_teacher_fidelity_ioa_percent,target_student_behavior_ioa_percent,nullif(btrim(target_observation_note),''),nullif(btrim(target_ioa_note),''),btrim(target_correction_reason),auth.uid()) returning * into result;
 return to_jsonb(result);
end $$;

create or replace function public.research_admin_observation_dashboard(target_case_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with current_records as (select distinct on(observation_id,observer_role)* from public.research_classroom_observation_records order by observation_id,observer_role,revision_number desc),
 current_summaries as (select distinct on(observation_id)* from public.research_classroom_observation_summary_revisions order by observation_id,revision_number desc,recorded_at desc),
 rows as (
  select o.*,po.observer_code primary_observer_code,so.observer_code secondary_observer_code,
   coalesce(cs.teacher_fidelity_percent,pr.teacher_fidelity_percent) teacher_fidelity_percent,
   coalesce(cs.student_target_behavior_percent,pr.student_target_behavior_percent) student_target_behavior_percent,
   coalesce(cs.id,pr.id) primary_record_id,case when cs.id is not null and cs.teacher_fidelity_ioa_percent is not null then cs.id else sr.id end secondary_record_id,
   cs.id summary_revision_id,cs.revision_number summary_revision_number,cs.observation_note summary_observation_note,cs.ioa_note,cs.correction_reason summary_correction_reason,cs.recorded_at summary_recorded_at,
   case when pr.id is null then null else jsonb_build_object('id',pr.id,'revision_number',pr.revision_number,'fidelity_scores',pr.fidelity_scores,'student_intervals',pr.student_intervals,'observer_note',pr.observer_note,'submitted_at',pr.submitted_at) end primary_record,
   case when sr.id is null then null else jsonb_build_object('id',sr.id,'revision_number',sr.revision_number,'fidelity_scores',sr.fidelity_scores,'student_intervals',sr.student_intervals,'observer_note',sr.observer_note,'submitted_at',sr.submitted_at) end secondary_record,
   case when cs.id is not null and cs.teacher_fidelity_ioa_percent is not null then jsonb_build_object('teacher_fidelity_ioa_percent',cs.teacher_fidelity_ioa_percent,'student_behavior_ioa_percent',cs.student_behavior_ioa_percent,'overall_ioa_attention',cs.teacher_fidelity_ioa_percent<=80 or cs.student_behavior_ioa_percent<=80,'summary_revision_id',cs.id)
    else (select to_jsonb(i) from public.research_classroom_ioa_results i where i.primary_record_id=pr.id and i.secondary_record_id=sr.id order by i.created_at desc limit 1) end ioa
  from public.research_classroom_observations o join public.research_observers po on po.id=o.primary_observer_id left join public.research_observers so on so.id=o.secondary_observer_id
  left join current_records pr on pr.observation_id=o.id and pr.observer_role='primary' left join current_records sr on sr.observation_id=o.id and sr.observer_role='secondary' left join current_summaries cs on cs.observation_id=o.id
  where target_case_id is null or o.case_id=target_case_id),
 totals as (select count(*) filter(where primary_record_id is not null)n,count(*) filter(where primary_record_id is not null and secondary_record_id is not null)paired,count(*) filter(where ioa is not null and (ioa->>'teacher_fidelity_ioa_percent')::numeric<=80)teacher_alerts,count(*) filter(where ioa is not null and (ioa->>'student_behavior_ioa_percent')::numeric<=80)student_alerts,count(*) filter(where ioa is not null and ((ioa->>'teacher_fidelity_ioa_percent') is null or (ioa->>'student_behavior_ioa_percent') is null))not_calculable from rows)
 select jsonb_build_object('observers',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('status',public.research_observer_status(o.id),'latest_training',(select to_jsonb(e) from public.research_observer_training_events e where e.observer_id=o.id order by e.event_date desc,e.recorded_at desc limit 1),'training_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.event_date desc,e.recorded_at desc) from public.research_observer_training_events e where e.observer_id=o.id),'[]'::jsonb)) order by o.observer_code) from public.research_observers o),'[]'::jsonb),'setups',coalesce((select jsonb_agg(to_jsonb(s)) from public.research_observation_setup s where target_case_id is null or s.case_id=target_case_id),'[]'::jsonb),'observations',coalesce((select jsonb_agg(to_jsonb(r) order by r.observation_date desc,r.session_number desc) from rows r),'[]'::jsonb),'coverage',jsonb_build_object('completed',totals.n,'ioa',totals.paired,'percent',case when totals.n=0 then 0 else round(100.0*totals.paired/totals.n,1) end,'required_minimum',ceil(totals.n*.20),'additional_needed',greatest(ceil(totals.n*.20)-totals.paired,0),'teacher_alerts',totals.teacher_alerts,'student_alerts',totals.student_alerts,'not_calculable',totals.not_calculable),'by_phase',coalesce((select jsonb_agg(x order by x.phase) from(select phase,count(*) filter(where primary_record_id is not null)completed,count(*) filter(where primary_record_id is not null and secondary_record_id is not null)ioa,case when count(*) filter(where primary_record_id is not null)=0 then 0 else round(100.0*count(*) filter(where primary_record_id is not null and secondary_record_id is not null)/count(*) filter(where primary_record_id is not null),1) end percent from rows group by phase)x),'[]'::jsonb),'by_dyad',coalesce((select jsonb_agg(x order by x.study_id) from(select p.participant_code study_id,count(*) filter(where r.primary_record_id is not null)completed,count(*) filter(where r.primary_record_id is not null and r.secondary_record_id is not null)ioa,case when count(*) filter(where r.primary_record_id is not null)=0 then 0 else round(100.0*count(*) filter(where r.primary_record_id is not null and r.secondary_record_id is not null)/count(*) filter(where r.primary_record_id is not null),1) end percent from rows r join public.participants p on p.case_id=r.case_id group by p.participant_code)x),'[]'::jsonb)) into result from totals; return result; end $$;

revoke all on function public.research_admin_record_classroom_observation_summary(uuid,date,uuid,numeric,numeric,uuid,numeric,numeric,time,time,text,text) from public,anon;
revoke all on function public.research_admin_create_legacy_observation_summary(uuid,numeric,numeric,numeric,numeric,text,text,text) from public,anon;
revoke all on function public.research_admin_revise_classroom_observation_summary(uuid,numeric,numeric,numeric,numeric,text,text,text) from public,anon;
grant execute on function public.research_admin_record_classroom_observation_summary(uuid,date,uuid,numeric,numeric,uuid,numeric,numeric,time,time,text,text) to authenticated;
grant execute on function public.research_admin_create_legacy_observation_summary(uuid,numeric,numeric,numeric,numeric,text,text,text) to authenticated;
grant execute on function public.research_admin_revise_classroom_observation_summary(uuid,numeric,numeric,numeric,numeric,text,text,text) to authenticated;

-- Apply the existing >80/recalibration qualification rule to both storage paths.
create or replace function public.research_observer_status(target_observer_id uuid, as_of_date date default ((now() at time zone 'America/Denver')::date))
returns text language sql stable security definer set search_path='' as $$
 with o as (select * from public.research_observers where id=target_observer_id),
 current_records as (select distinct on(r.observation_id,r.observer_role) r.observation_id,r.observer_role,r.id from public.research_classroom_observation_records r order by r.observation_id,r.observer_role,r.revision_number desc,r.submitted_at desc,r.id desc),
 current_ioa as (select i.observation_id,i.overall_ioa_attention,i.created_at recorded_at,s.observation_date from public.research_classroom_ioa_results i join public.research_classroom_observations s on s.id=i.observation_id join current_records p on p.observation_id=i.observation_id and p.observer_role='primary' and p.id=i.primary_record_id join current_records secondary on secondary.observation_id=i.observation_id and secondary.observer_role='secondary' and secondary.id=i.secondary_record_id),
 current_summaries as (select distinct on(r.observation_id) r.*,s.observation_date from public.research_classroom_observation_summary_revisions r join public.research_classroom_observations s on s.id=r.observation_id order by r.observation_id,r.revision_number desc,r.recorded_at desc),
 attention as (select observation_id,observation_date,recorded_at from current_ioa where overall_ioa_attention union all select observation_id,observation_date,recorded_at from current_summaries where teacher_fidelity_ioa_percent<=80 or student_behavior_ioa_percent<=80),
 low as (select a.observation_date low_date,a.recorded_at low_recorded_at from attention a join public.research_classroom_observations s on s.id=a.observation_id where s.secondary_observer_id=target_observer_id and a.observation_date<=as_of_date order by a.observation_date desc,a.recorded_at desc,a.observation_id desc limit 1),
 good as (select e.event_date good_date,e.recorded_at good_recorded_at from public.research_observer_training_events e where e.observer_id=target_observer_id and e.event_date<=as_of_date and e.event_type in('practice','recalibration','retraining') and e.teacher_fidelity_agreement>=85 and e.student_behavior_agreement>=85 order by e.event_date desc,e.recorded_at desc,e.id desc limit 1)
 select case when not o.active then 'inactive' when o.observer_type='primary_researcher' then 'qualified' when low.low_date is not null and (good.good_date is null or (good.good_date,good.good_recorded_at)<=(low.low_date,low.low_recorded_at)) then 'recalibration_required' when good.good_date is not null then 'qualified' else 'training_needed' end from o left join low on true left join good on true
$$;
revoke all on function public.research_observer_status(uuid,date) from public,anon,authenticated;
