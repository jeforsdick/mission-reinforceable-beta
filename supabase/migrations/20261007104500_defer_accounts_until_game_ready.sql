create or replace function public.provision_intake_case_v2(
  target_request_id uuid,
  study_id text,
  new_case_code text,
  student_game_alias text,
  reviewed_targets jsonb,
  target_is_test boolean default false
)
returns table(case_id uuid, participant_id uuid)
language plpgsql security definer set search_path='' as $$
declare intake public.intake_requests%rowtype; created_case_id uuid; created_participant_id uuid;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if target_request_id is null then raise exception 'request ID is required' using errcode='22023'; end if;
  if study_id is null or study_id !~ '^MR-[0-9]{3}$' then raise exception 'Study ID must match MR-###' using errcode='22023'; end if;
  if new_case_code is null or new_case_code !~ '^CASE-[0-9]{3}$' then raise exception 'Case code must match CASE-###' using errcode='22023'; end if;
  if nullif(btrim(student_game_alias),'') is null then raise exception 'student game alias is required' using errcode='22023'; end if;
  if jsonb_typeof(reviewed_targets)<>'array' or jsonb_array_length(reviewed_targets)=0 then raise exception 'reviewed fidelity targets are required' using errcode='22023'; end if;
  select * into intake from public.intake_requests where request_id=target_request_id for update;
  if not found then raise exception 'intake not found' using errcode='P0002'; end if;
  if intake.status<>'approved' or intake.converted_case_id is not null then raise exception 'intake must be approved and unconverted' using errcode='22023'; end if;
  if exists(select 1 from public.participants where participant_code=study_id) then raise exception 'Study ID is already used' using errcode='23505'; end if;
  if exists(select 1 from public.cases where case_code=new_case_code) then raise exception 'case code is already used' using errcode='23505'; end if;
  if exists (
    select 1 from jsonb_array_elements(reviewed_targets) t
    where jsonb_typeof(t)<>'object'
      or t->>'domain' not in ('proactive','teaching','reinforcement','response','crisis')
      or nullif(btrim(t->>'description'),'') is null
      or ((t->>'domain')='crisis' and not intake.has_crisis_plan)
  ) then raise exception 'invalid reviewed fidelity target' using errcode='22023'; end if;
  if exists (
    select 1 from unnest(array['proactive','teaching','reinforcement','response']) d
    where not exists(select 1 from jsonb_array_elements(reviewed_targets) t where t->>'domain'=d)
  ) then raise exception 'each required fidelity domain needs a target' using errcode='22023'; end if;

  insert into public.cases(case_code,student_alias,active)
  values(new_case_code,btrim(student_game_alias),false) returning id into created_case_id;

  insert into public.participants(auth_user_id,participant_code,case_id,active,is_test)
  values(null,study_id,created_case_id,false,coalesce(target_is_test,false))
  returning id into created_participant_id;

  insert into public.case_intake(
    case_id,teacher_name,teacher_email,coach_name,coach_email,grade_level,student_initials,
    target_behavior,behavior_topography,primary_function,replacement_behavior,desired_behavior,
    prevention_strategies,teaching_strategies,reinforcement_system,response_strategy,
    student_strengths,preferred_items_activities,preference_assessment_notes,has_crisis_plan,crisis_plan,
    typical_settings,common_triggers,typical_antecedents,typical_consequences,current_staff_responses,
    requested_scenarios,additional_context,status,submitted_by,submitted_at
  ) values(
    created_case_id,intake.teacher_name,intake.teacher_email,intake.coach_name,intake.coach_email,
    intake.grade_level,intake.student_initials,intake.target_behavior,intake.behavior_topography,
    intake.primary_function,intake.replacement_behavior,intake.desired_behavior,
    intake.prevention_strategies,intake.teaching_strategies,intake.reinforcement_system,
    intake.response_strategy,intake.student_strengths,intake.preferred_items_activities,
    intake.preference_assessment_notes,intake.has_crisis_plan,intake.crisis_plan,intake.typical_settings,
    intake.common_triggers,intake.typical_antecedents,intake.typical_consequences,
    intake.current_staff_responses,intake.requested_scenarios,intake.additional_context,
    'submitted',auth.uid(),now()
  );

  insert into public.fidelity_targets(case_id,domain,description,sort_order,target_key,active)
  select created_case_id,t.domain,t.description,t.domain_order,t.domain||'_'||lpad(t.domain_order::text,2,'0'),true
  from (
    select item->>'domain' domain,btrim(item->>'description') description,
      row_number() over(partition by item->>'domain' order by ordinal)::integer domain_order
    from jsonb_array_elements(reviewed_targets) with ordinality source(item,ordinal)
  ) t;

  update public.intake_requests set status='converted',converted_case_id=created_case_id,converted_at=now()
  where request_id=target_request_id;
  insert into public.research_onboarding_actions(actor_user_id,action_type,request_id,case_id)
  values(auth.uid(),'case_provisioned',target_request_id,created_case_id);
  return query select created_case_id,created_participant_id;
end $$;
revoke all on function public.provision_intake_case_v2(uuid,text,text,text,jsonb,boolean) from public,anon;
grant execute on function public.provision_intake_case_v2(uuid,text,text,text,jsonb,boolean) to authenticated,service_role;
