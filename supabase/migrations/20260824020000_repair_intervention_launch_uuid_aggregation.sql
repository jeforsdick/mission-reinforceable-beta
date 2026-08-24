-- Repair intervention launch readiness without aggregating UUID participant columns.
create or replace function public.research_admin_assert_intervention_launch_ready(target_case_id uuid, target_actor_id uuid default auth.uid())
returns table(participant_id uuid, protected_content_version integer)
language plpgsql stable security definer set search_path='' as $$
declare participant_count integer; current_phase text; orientation_status text; teacher_id uuid; found_participant_id uuid; current_version integer;
begin
  if not exists(select 1 from public.profiles pr where pr.id=target_actor_id and pr.role='research_admin' and pr.active) then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.cases c where c.id=target_case_id) then raise exception 'case not found' using errcode='P0002'; end if;
  select count(*) into participant_count
  from public.participants p where p.case_id=target_case_id;
  if participant_count <> 1 then raise exception 'Exactly one study participant must be linked to the case.' using errcode='55000'; end if;
  select p.id, p.auth_user_id into found_participant_id, teacher_id
  from public.participants p where p.case_id=target_case_id limit 1;
  select pe.phase into current_phase from public.research_case_phase_events pe where pe.case_id=target_case_id
  order by pe.effective_date desc, pe.recorded_at desc, pe.id desc limit 1;
  if coalesce(current_phase,'prebaseline') <> 'intervention' then raise exception 'Game access can only be enabled during Intervention.' using errcode='55000'; end if;
  select gc.version into current_version from public.case_game_content gc where gc.case_id=target_case_id;
  if current_version is null then raise exception 'Current published game content is required.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_behavior_review') then raise exception 'Current published version requires Behavior Review.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_privacy_review') then raise exception 'Current published version requires Privacy Review.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_qa_preview') then raise exception 'Current published version requires QA Preview Review.' using errcode='55000'; end if;
  select e.status into orientation_status from public.research_protocol_checklist_events e
  where e.case_id=target_case_id and e.item_key='intervention_orientation' order by e.recorded_at desc,e.id desc limit 1;
  if coalesce(orientation_status,'pending') <> 'complete' then raise exception 'Intervention orientation must be complete.' using errcode='55000'; end if;
  if teacher_id is null or not exists(select 1 from public.profiles pr where pr.id=teacher_id and pr.active and pr.role='teacher')
    then raise exception 'An active teacher account is required.' using errcode='55000'; end if;
  participant_id:=found_participant_id; protected_content_version:=current_version; return next;
end $$;
