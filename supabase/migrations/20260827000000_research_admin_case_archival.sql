-- Study-record archival is dashboard organization only. It is intentionally
-- independent of case/participant activation, lifecycle, reminders, and access.
alter table public.cases
  add column if not exists archived_at timestamptz null,
  add column if not exists archive_reason text null;

comment on column public.cases.archived_at is
  'Research Admin study-record archival timestamp; null means current. Does not govern access or lifecycle.';
comment on column public.cases.archive_reason is
  'Optional Research Admin explanation for study-record archival.';

-- Archive only the two reviewed obsolete fixture pairs. Matching both identifiers
-- prevents similarly named QA/current cases (including CASE-998 and CASE-DEMO-2)
-- from being changed. Replays retain the original archival timestamp.
update public.cases c
set archived_at = coalesce(c.archived_at, timestamptz '2026-08-27 00:00:00+00'),
    archive_reason = 'Obsolete fictional development fixture archived before dissertation launch.'
where exists (
  select 1
  from (values
    ('CASE-999'::text, 'MR-999'::text),
    ('CASE-DEMO'::text, 'MR-DEMO'::text)
  ) as fixture(case_code, study_id)
  join public.participants p on p.case_id = c.id and p.participant_code = fixture.study_id
  where c.case_code = fixture.case_code
);

create or replace function public.research_admin_operations_dashboard(target_case_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with case_rows as (select c.id,c.case_code,c.student_alias,p.participant_code study_id,c.active case_active,p.active participant_active,c.archived_at,c.archive_reason,
   coalesce((select pe.phase from public.research_case_phase_events pe where pe.case_id=c.id order by pe.effective_date desc,pe.recorded_at desc,pe.id desc limit 1),'prebaseline') current_phase,
   (select to_jsonb(cp) from public.research_case_protocol cp where cp.case_id=c.id) protocol,
   jsonb_build_object(
    'protected_content_present',gc.case_id is not null,
    'resource_map_ready',gc.case_id is not null and coalesce(gc.resources->'schemaVersion'='1'::jsonb,false) and coalesce(gc.resources->'sections'?&array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'],false)
      and (select count(distinct s.review_type)=3 from public.case_protected_content_signoffs s where s.case_id=c.id and s.protected_content_version=gc.version and s.review_type in('resource_behavior_review','resource_privacy_review','resource_qa_preview')),
    'reminders_enabled',coalesce((select rs.enabled from public.teacher_reminder_settings rs where rs.participant_id=p.id),false)
   ) prepared_content
   from public.cases c join public.participants p on p.case_id=c.id left join public.case_game_content gc on gc.case_id=c.id where target_case_id is null or c.id=target_case_id)
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
