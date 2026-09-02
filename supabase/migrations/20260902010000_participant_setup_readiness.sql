-- Researcher participant readiness and isolated fake-participant testing.
-- The existing participant/case/profile/reminder model remains authoritative.

alter table public.participants add column is_test boolean not null default false;
create index participants_real_study_idx on public.participants(participant_code) where not is_test;

create or replace function public.eligible_teacher_reminders(require_followup boolean default false)
returns table (participant_id uuid, case_id uuid, teacher_name text, teacher_email text)
language sql stable security definer set search_path = '' as $$
select p.id, p.case_id, pr.display_name, pr.email
from public.teacher_reminder_settings trs
join public.participants p on p.id = trs.participant_id
join public.cases c on c.id = p.case_id
join public.profiles pr on pr.id = p.auth_user_id
where trs.enabled and not p.is_test
and trs.activated_at is not null and trs.activated_at <= now()
and (trs.deactivated_at is null or trs.deactivated_at > now())
and (not require_followup or trs.followup_enabled)
and p.active and c.active and pr.active and pr.role = 'teacher'
and nullif(btrim(pr.email), '') is not null;
$$;

create function public.research_admin_participant_readiness(target_case_id uuid, target_study_date date default (now() at time zone 'America/Denver')::date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select jsonb_build_object(
  'participant_id',p.id,'study_id',p.participant_code,'teacher_name',pr.display_name,'teacher_email',pr.email,
  'auth_linked',p.auth_user_id=pr.id and lower(btrim(pr.email))=lower(btrim(ci.teacher_email)),
  'case_assigned',p.case_id=c.id,'participant_active',p.active and c.active,
  'reminders_enabled',coalesce(rs.enabled,false),'is_test',p.is_test,'study_date',target_study_date,
  'eligible',p.active and c.active and pr.active and pr.role='teacher' and nullif(btrim(pr.email),'') is not null
    and coalesce(rs.enabled,false) and rs.activated_at<=now() and (rs.deactivated_at is null or rs.deactivated_at>now())
    and not public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver'),
  'reason_not_eligible',case
    when p.auth_user_id<>pr.id or lower(btrim(pr.email))<>lower(btrim(ci.teacher_email)) then 'Teacher auth email does not match intake assignment'
    when pr.role<>'teacher' or not pr.active then 'Teacher profile is not active'
    when not p.active or not c.active then 'Participant or case is inactive'
    when not coalesce(rs.enabled,false) then 'Daily reminders are not enabled'
    when rs.activated_at is null or rs.activated_at>now() or rs.deactivated_at<=now() then 'Reminder activation is not current'
    when public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver') then 'Today''s required Daily mission is complete'
    else null end,
  'last_reminder',(select to_jsonb(e) from public.teacher_reminder_events e where e.participant_id=p.id order by e.study_date desc,e.updated_at desc limit 1),
  'last_daily_completion',(select jsonb_build_object('ended_at',gs.ended_at,'mission_id',gs.mission_id,'qa_mode',gs.qa_mode) from public.game_sessions gs where gs.participant_id=p.id and gs.case_id=c.id and gs.status='completed' and gs.mode='daily' order by gs.ended_at desc limit 1),
  'completed_required_today',public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver')
 ) into result
 from public.participants p join public.cases c on c.id=p.case_id join public.profiles pr on pr.id=p.auth_user_id
 left join public.case_intake ci on ci.case_id=c.id left join public.teacher_reminder_settings rs on rs.participant_id=p.id
 where c.id=target_case_id;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
 return result;
end $$;

create function public.research_admin_simulate_test_reminder(target_case_id uuid, target_study_date date default (now() at time zone 'America/Denver')::date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; event_id uuid;
begin
 r:=public.research_admin_participant_readiness(target_case_id,target_study_date);
 if not coalesce((r->>'is_test')::boolean,false) then raise exception 'test participant required' using errcode='22023'; end if;
 if coalesce((r->>'completed_required_today')::boolean,false) then return r||jsonb_build_object('outcome','suppressed_completed'); end if;
 if not coalesce((r->>'eligible')::boolean,false) then return r||jsonb_build_object('outcome','suppressed_not_eligible'); end if;
 insert into public.teacher_reminder_events(participant_id,case_id,reminder_type,study_date,status,provider_message_id)
 values((r->>'participant_id')::uuid,target_case_id,'daily_prompt',target_study_date,'sent','simulated-test')
 on conflict(participant_id,study_date,reminder_type) do nothing returning id into event_id;
 return r||jsonb_build_object('outcome',case when event_id is null then 'suppressed_duplicate' else 'simulated' end,'event_id',event_id);
end $$;

create function public.research_admin_set_test_participant(target_case_id uuid, target_is_test boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if not target_is_test then
  delete from public.teacher_reminder_events e using public.participants p
  where p.case_id=target_case_id and p.is_test and e.participant_id=p.id and e.provider_message_id='simulated-test';
 end if;
 update public.participants set is_test=target_is_test,updated_at=now() where case_id=target_case_id returning jsonb_build_object('participant_id',id,'is_test',is_test) into result;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
 return result;
end $$;

revoke all on function public.research_admin_participant_readiness(uuid,date), public.research_admin_simulate_test_reminder(uuid,date), public.research_admin_set_test_participant(uuid,boolean) from public;
grant execute on function public.research_admin_participant_readiness(uuid,date), public.research_admin_simulate_test_reminder(uuid,date), public.research_admin_set_test_participant(uuid,boolean) to authenticated;
comment on column public.participants.is_test is 'Explicitly set by a research admin for fake/QA participants excluded from production reminder recipients and dissertation outcomes/counts; never inferred from participant identity or email.';


-- Study-wide Research Admin summaries exclude explicit test participants. A
-- target_case_id intentionally retains direct QA inspection of that case.
create or replace function public.research_admin_operations_dashboard(target_case_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with case_rows as (select c.id,c.case_code,c.student_alias,p.participant_code study_id,p.is_test,c.active case_active,p.active participant_active,c.archived_at,c.archive_reason,
   coalesce((select pe.phase from public.research_case_phase_events pe where pe.case_id=c.id order by pe.effective_date desc,pe.recorded_at desc,pe.id desc limit 1),'prebaseline') current_phase,
   (select to_jsonb(cp) from public.research_case_protocol cp where cp.case_id=c.id) protocol,
   jsonb_build_object(
    'protected_content_present',gc.case_id is not null,
    'resource_map_ready',gc.case_id is not null and coalesce(gc.resources->'schemaVersion'='1'::jsonb,false) and coalesce(gc.resources->'sections'?&array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'],false)
      and (select count(distinct s.review_type)=3 from public.case_protected_content_signoffs s where s.case_id=c.id and s.protected_content_version=gc.version and s.review_type in('resource_behavior_review','resource_privacy_review','resource_qa_preview')),
    'reminders_enabled',coalesce((select rs.enabled from public.teacher_reminder_settings rs where rs.participant_id=p.id),false)
   ) prepared_content
   from public.cases c join public.participants p on p.case_id=c.id left join public.case_game_content gc on gc.case_id=c.id where (target_case_id is null and not p.is_test) or (target_case_id is not null and c.id=target_case_id))
 select jsonb_build_object('authoritative_timezone','America/Denver','cases',coalesce(jsonb_agg(
   to_jsonb(cr)||jsonb_build_object(
    'checklist',coalesce((select jsonb_agg(to_jsonb(x) order by x.item_key) from (select distinct on(e.item_key) e.* from public.research_protocol_checklist_events e where e.case_id=cr.id order by e.item_key,e.recorded_at desc,e.id desc)x),'[]'::jsonb),
    'checklist_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.recorded_at desc) from public.research_protocol_checklist_events e where e.case_id=cr.id),'[]'::jsonb),
    'phase_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.effective_date desc,e.recorded_at desc) from public.research_case_phase_events e where e.case_id=cr.id),'[]'::jsonb),
    'measures',coalesce((select jsonb_agg(to_jsonb(x) order by x.measure_key) from (select distinct on(e.measure_key)e.* from public.research_measure_events e where e.case_id=cr.id order by e.measure_key,e.recorded_at desc,e.id desc)x),'[]'::jsonb),
    'measure_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.recorded_at desc) from public.research_measure_events e where e.case_id=cr.id),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date) order by (t.status='pending') desc,t.due_date nulls last) from public.research_tasks t where t.case_id=cr.id),'[]'::jsonb),
    'coaching_contacts',coalesce((select jsonb_agg(to_jsonb(c) order by c.contact_date desc,c.recorded_at desc) from public.research_coaching_contacts c where c.case_id=cr.id),'[]'::jsonb),
    'study_events',coalesce((select jsonb_agg(to_jsonb(e) order by (e.resolved_at is null) desc,e.event_date desc) from public.research_study_events e where e.case_id=cr.id),'[]'::jsonb)
   ) order by cr.study_id) filter(where cr.id is not null),'[]'::jsonb),
   'study_wide_tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date) order by (t.status='pending') desc,t.due_date nulls last) from public.research_tasks t where t.case_id is null),'[]'::jsonb)) into result from case_rows cr;
 return result;
end $$;

create or replace function public.research_admin_observation_dashboard(target_case_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with current_summaries as (select distinct on(observation_id)* from public.research_classroom_observation_summary_revisions order by observation_id,revision_number desc,recorded_at desc,id desc),
 rows as (select o.*,po.observer_code primary_observer_code,so.observer_code secondary_observer_code,cs.teacher_fidelity_percent,cs.student_target_behavior_percent,cs.id summary_revision_id,cs.revision_number summary_revision_number,cs.observation_note summary_observation_note,cs.ioa_note,cs.correction_reason summary_correction_reason,cs.recorded_at summary_recorded_at,
  case when o.secondary_observer_id is not null and cs.teacher_fidelity_ioa_percent is not null and cs.student_behavior_ioa_percent is not null then jsonb_build_object('teacher_fidelity_ioa_percent',cs.teacher_fidelity_ioa_percent,'student_behavior_ioa_percent',cs.student_behavior_ioa_percent,'overall_ioa_attention',cs.teacher_fidelity_ioa_percent<=80 or cs.student_behavior_ioa_percent<=80,'summary_revision_id',cs.id) end ioa
  from public.research_classroom_observations o join public.participants participant on participant.case_id=o.case_id join current_summaries cs on cs.observation_id=o.id join public.research_observers po on po.id=o.primary_observer_id left join public.research_observers so on so.id=o.secondary_observer_id where (target_case_id is null and not participant.is_test) or (target_case_id is not null and o.case_id=target_case_id)),
 totals as (select count(*) n,count(*) filter(where ioa is not null)paired,count(*) filter(where (ioa->>'teacher_fidelity_ioa_percent')::numeric<=80)teacher_alerts,count(*) filter(where (ioa->>'student_behavior_ioa_percent')::numeric<=80)student_alerts from rows)
 select jsonb_build_object('observers',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('status',public.research_observer_status(o.id),'latest_training',(select to_jsonb(e) from public.research_observer_training_events e where e.observer_id=o.id order by e.event_date desc,e.recorded_at desc,e.id desc limit 1),'training_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.event_date desc,e.recorded_at desc,e.id desc) from public.research_observer_training_events e where e.observer_id=o.id),'[]'::jsonb)) order by o.observer_code) from public.research_observers o),'[]'::jsonb),'setups',coalesce((select jsonb_agg(to_jsonb(s)) from public.research_observation_setup s join public.participants setup_participant on setup_participant.case_id=s.case_id where (target_case_id is null and not setup_participant.is_test) or (target_case_id is not null and s.case_id=target_case_id)),'[]'::jsonb),'observations',coalesce((select jsonb_agg(to_jsonb(r) order by r.observation_date desc,r.session_number desc) from rows r),'[]'::jsonb),'coverage',jsonb_build_object('completed',totals.n,'ioa',totals.paired,'percent',case when totals.n=0 then 0 else round(100.0*totals.paired/totals.n,1) end,'required_minimum',ceil(totals.n*.20),'additional_needed',greatest(ceil(totals.n*.20)-totals.paired,0),'teacher_alerts',totals.teacher_alerts,'student_alerts',totals.student_alerts),'by_phase',coalesce((select jsonb_agg(x order by x.phase) from(select phase,count(*) completed,count(*) filter(where ioa is not null) ioa,round(100.0*count(*) filter(where ioa is not null)/count(*),1) percent from rows group by phase)x),'[]'::jsonb),'by_dyad',coalesce((select jsonb_agg(x order by x.study_id) from(select p.participant_code study_id,count(*) completed,count(*) filter(where r.ioa is not null) ioa,round(100.0*count(*) filter(where r.ioa is not null)/count(*),1) percent from rows r join public.participants p on p.case_id=r.case_id group by p.participant_code)x),'[]'::jsonb)) into result from totals; return result; end $$;
