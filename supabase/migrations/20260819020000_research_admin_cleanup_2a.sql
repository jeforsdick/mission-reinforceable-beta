-- Research Admin / Supabase Cleanup 2A.
-- Retires mission-bank comparability, baseline swapping, and the unused raw-entry
-- wrapper while preserving active content signoffs and all legacy raw observation data.

-- Remove retired signoff data before narrowing the existing shared constraint.
delete from public.case_protected_content_signoffs
where review_type = 'mission_bank_comparability';

alter table public.case_protected_content_signoffs
  drop constraint if exists case_protected_content_signoffs_review_type_check;
alter table public.case_protected_content_signoffs
  add constraint case_protected_content_signoffs_review_type_check check (review_type in (
    'resource_behavior_review',
    'resource_privacy_review',
    'resource_qa_preview'
  ));

-- Preserve the version-bound active review workflow with only its three live types.
create or replace function public.research_admin_record_case_signoff(
  target_case_id uuid,
  target_protected_content_version integer,
  target_review_type text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare current_version integer; new_signoff_id uuid;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;
  if target_review_type not in (
    'resource_behavior_review', 'resource_privacy_review', 'resource_qa_preview'
  ) then raise exception 'invalid review type' using errcode = '22023'; end if;

  select gc.version into current_version from public.case_game_content gc
  where gc.case_id = target_case_id for share;
  if not found then raise exception 'protected content not found' using errcode = 'P0002'; end if;
  if target_protected_content_version is distinct from current_version then
    raise exception 'protected content version changed; reload readiness before signing' using errcode = '22023';
  end if;
  insert into public.case_protected_content_signoffs(case_id, protected_content_version, review_type, reviewed_by)
  values (target_case_id, current_version, target_review_type, auth.uid()) returning id into new_signoff_id;
  return new_signoff_id;
end;
$$;

-- Replace JSON-producing functions before removing objects referenced by their old bodies.
create or replace function public.research_admin_case_readiness(target_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'case', jsonb_build_object('id', c.id, 'case_code', c.case_code, 'student_alias', c.student_alias, 'active', c.active),
    'participant', case when p.id is null then null else jsonb_build_object('id', p.id, 'auth_user_id', p.auth_user_id, 'participant_code', p.participant_code, 'active', p.active) end,
    'intake_snapshot', exists(select 1 from public.case_intake ci where ci.case_id = c.id),
    'fidelity_target_count', (select count(*) from public.fidelity_targets ft where ft.case_id = c.id and ft.active),
    'coach', (select jsonb_build_object('coach_user_id', cc.coach_user_id, 'active', cc.active, 'primary_coach', cc.primary_coach) from public.case_coaches cc where cc.case_id = c.id and cc.active and cc.primary_coach limit 1),
    'protected_content', (select jsonb_build_object('present', true, 'version', gc.version, 'updated_at', gc.updated_at) from public.case_game_content gc where gc.case_id = c.id),
    'resource_map', case when gc.case_id is null then jsonb_build_object('status', 'Needs content') else jsonb_build_object(
      'status', case
        when coalesce(gc.resources->'schemaVersion' = '1'::jsonb, false) is not true or coalesce(gc.resources->'sections' ?& array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'], false) is not true then 'Needs content'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review') then 'Needs behavioral review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review') then 'Needs privacy review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview') then 'Needs QA' else 'Ready' end,
      'behavior_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review'),
      'privacy_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review'),
      'qa_previewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview')
    ) end,
    'reminders', (select jsonb_build_object('enabled', rs.enabled) from public.teacher_reminder_settings rs where rs.participant_id = p.id)
  ) into result
  from public.intake_requests i join public.cases c on c.id = i.converted_case_id
  left join public.participants p on p.case_id = c.id left join public.case_game_content gc on gc.case_id = c.id
  where i.request_id = target_request_id and i.status = 'converted';
  if result is null then raise exception 'converted intake readiness not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create or replace function public.research_admin_operations_dashboard(target_case_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with case_rows as (select c.id,c.case_code,c.student_alias,p.participant_code study_id,c.active case_active,p.active participant_active,
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

-- Revoke API access before removing retired RPCs. Exact signatures avoid overload ambiguity.
revoke all on function public.research_admin_submit_mission_bank_comparability_review(uuid, integer, jsonb, text, boolean) from public, anon, authenticated;
drop function if exists public.research_admin_submit_mission_bank_comparability_review(uuid, integer, jsonb, text, boolean);

revoke all on function public.research_admin_swap_case_protocol_positions(uuid, uuid) from public, anon, authenticated;
drop function if exists public.research_admin_swap_case_protocol_positions(uuid, uuid);

revoke all on function public.research_admin_record_classroom_observation(uuid, date, uuid, jsonb, jsonb, uuid, time, time, text, text) from public, anon, authenticated;
drop function if exists public.research_admin_record_classroom_observation(uuid, date, uuid, jsonb, jsonb, uuid, time, time, text, text);

-- The comparability table has no remaining function/view dependencies. Remove its
-- table-local policy and index explicitly rather than using CASCADE.
drop policy if exists "Research admins read comparability reviews" on public.mission_bank_comparability_reviews;
drop index if exists public.mission_bank_comparability_reviews_lookup;
revoke all on table public.mission_bank_comparability_reviews from public, anon, authenticated;
drop table if exists public.mission_bank_comparability_reviews;
