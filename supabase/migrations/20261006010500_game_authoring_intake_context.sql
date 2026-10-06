-- Feed deidentified, minimum-necessary intake/BSP context into the private
-- Research Admin game-authoring workspace. The approved BSP remains the
-- dissertation source of truth; intake context is supplemental authoring context.

create or replace function public.research_admin_game_authoring_workspace(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  result jsonb;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;
  if target_case_id is null then
    raise exception 'case ID is required' using errcode='22023';
  end if;
  if not exists (select 1 from public.cases c where c.id=target_case_id) then
    raise exception 'case not found' using errcode='P0002';
  end if;

  select jsonb_build_object(
    'case', jsonb_build_object(
      'id',c.id,
      'case_code',c.case_code,
      'student_alias',c.student_alias
    ),
    'primary_function', (
      select ci.primary_function
      from public.case_intake ci
      where ci.case_id=c.id
      order by ci.updated_at desc,ci.id desc
      limit 1
    ),
    'has_crisis_plan', coalesce((
      select ci.has_crisis_plan
      from public.case_intake ci
      where ci.case_id=c.id
      order by ci.updated_at desc,ci.id desc
      limit 1
    ),false),
    'intake_context', (
      select jsonb_strip_nulls(jsonb_build_object(
        'source_status',ci.status,
        'source_updated_at',ci.updated_at,
        'grade_level',ci.grade_level,
        'target_behavior',ci.target_behavior,
        'behavior_topography',ci.behavior_topography,
        'primary_function',ci.primary_function,
        'replacement_behavior',ci.replacement_behavior,
        'desired_behavior',ci.desired_behavior,
        'prevention_strategies',ci.prevention_strategies,
        'teaching_strategies',ci.teaching_strategies,
        'reinforcement_system',ci.reinforcement_system,
        'response_strategy',ci.response_strategy,
        'has_crisis_plan',ci.has_crisis_plan,
        'crisis_plan',case when ci.has_crisis_plan then ci.crisis_plan else null end,
        'typical_settings',ci.typical_settings,
        'common_triggers',ci.common_triggers,
        'typical_consequences',ci.typical_consequences,
        'current_staff_responses',ci.current_staff_responses,
        'requested_scenarios',ci.requested_scenarios,
        'student_strengths',ci.student_strengths,
        'preferred_items_activities',ci.preferred_items_activities,
        'preference_assessment_notes',ci.preference_assessment_notes,
        'additional_context',ci.additional_context
      ))
      from public.case_intake ci
      where ci.case_id=c.id
      order by ci.updated_at desc,ci.id desc
      limit 1
    ),
    'fidelity_targets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'target_key',ft.target_key,
        'domain',ft.domain,
        'description',ft.description,
        'sort_order',ft.sort_order
      ) order by ft.sort_order,ft.target_key,ft.id)
      from public.fidelity_targets ft
      where ft.case_id=c.id and ft.active
    ),'[]'::jsonb),
    'setup_draft', (
      select jsonb_build_object(
        'revision_id',d.id,
        'setup',d.setup,
        'created_at',d.created_at,
        'created_by',d.created_by
      )
      from public.case_game_setup_draft_revisions d
      where d.case_id=c.id
      order by d.created_at desc,d.id desc
      limit 1
    ),
    'resource_draft', (
      select jsonb_build_object(
        'revision_id',d.id,
        'resources',d.resources,
        'created_at',d.created_at,
        'created_by',d.created_by
      )
      from public.case_game_resource_draft_revisions d
      where d.case_id=c.id
      order by d.created_at desc,d.id desc
      limit 1
    ),
    'missions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mission_type',latest.mission_type,
        'slot_number',latest.slot_number,
        'revision_id',latest.id,
        'mission',latest.mission,
        'created_at',latest.created_at,
        'created_by',latest.created_by
      ) order by case latest.mission_type when 'daily' then 1 when 'wild' then 2 else 3 end,latest.slot_number)
      from (
        select distinct on (d.mission_type,d.slot_number) d.*
        from public.case_game_mission_draft_revisions d
        where d.case_id=c.id
        order by d.mission_type,d.slot_number,d.created_at desc,d.id desc
      ) latest
    ),'[]'::jsonb)
  )
  into result
  from public.cases c
  where c.id=target_case_id;

  return result;
end;
$$;
