-- Read-only detailed observation audit for Research Admin.
-- Uses the previously recorded observer snapshots; never recalculates or overwrites study results.
create or replace function public.research_admin_observation_details(target_observation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  observation_row public.research_classroom_observations%rowtype;
  detail_case jsonb;
  slot_data jsonb;
  current_summary jsonb;
  record_data jsonb;
  comparison_data jsonb;
begin
  if auth.uid() is null or not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;

  select * into observation_row
  from public.research_classroom_observations
  where id = target_observation_id;
  if observation_row.id is null then
    raise exception 'observation not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'case_code', c.case_code,
    'student_alias', c.student_alias,
    'is_test', coalesce(bool_or(p.is_test), false)
  ) into detail_case
  from public.cases c
  left join public.participants p on p.case_id = c.id
  where c.id = observation_row.case_id
  group by c.id, c.case_code, c.student_alias;

  select jsonb_build_object(
    'id', s.id,
    'status', s.status,
    'observation_date', s.observation_date,
    'planned_start_time', s.planned_start_time,
    'planned_end_time', s.planned_end_time,
    'attendance_status', s.attendance_status,
    'secondary_role', s.secondary_role,
    'routine_label', s.routine_label_snapshot,
    'observer_message_note', s.observer_message_note
  ) into slot_data
  from public.research_observation_schedule_slots s
  where s.observation_id = target_observation_id
  limit 1;

  select jsonb_build_object(
    'revision_number', sr.revision_number,
    'teacher_fidelity_percent', sr.teacher_fidelity_percent,
    'student_target_behavior_percent', sr.student_target_behavior_percent,
    'teacher_fidelity_ioa_percent', sr.teacher_fidelity_ioa_percent,
    'student_behavior_ioa_percent', sr.student_behavior_ioa_percent,
    'observation_note', sr.observation_note,
    'ioa_note', sr.ioa_note,
    'correction_reason', sr.correction_reason,
    'recorded_at', sr.recorded_at
  ) into current_summary
  from public.research_classroom_observation_summary_revisions sr
  where sr.observation_id = target_observation_id
  order by sr.revision_number desc, sr.recorded_at desc, sr.id desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'observer_name', o.display_name,
    'observer_code', o.observer_code,
    'observer_role', r.observer_role,
    'status', r.status,
    'started_at', r.started_at,
    'collection_ended_at', r.collection_ended_at,
    'submitted_at', r.submitted_at,
    'elapsed_seconds', r.elapsed_seconds,
    'interval_seconds', r.interval_seconds,
    'interval_count', r.interval_count,
    'interval_scores', r.interval_scores,
    'fidelity_target_snapshot', r.fidelity_target_snapshot,
    'fidelity_scores', r.fidelity_scores,
    'fidelity_outcomes', r.fidelity_outcomes,
    'fidelity_opportunities', r.fidelity_opportunities,
    'teacher_fidelity_percent', r.teacher_fidelity_percent,
    'student_target_behavior_percent', r.student_target_behavior_percent,
    'observation_note', r.observation_note
  ) order by case when r.observer_role = 'primary' then 0 else 1 end, r.id), '[]'::jsonb)
  into record_data
  from public.research_observation_records_v2 r
  join public.research_observation_schedule_slots s on s.id = r.slot_id
  left join public.research_observers o on o.id = r.observer_id
  where s.observation_id = target_observation_id;

  select jsonb_build_object(
    'secondary_role', cp.secondary_role,
    'counts_toward_ioa', cp.counts_toward_ioa,
    'teacher_fidelity_ioa_percent', cp.teacher_fidelity_ioa_percent,
    'student_behavior_ioa_percent', cp.student_behavior_ioa_percent,
    'teacher_agreements', cp.teacher_agreements,
    'teacher_disagreements', cp.teacher_disagreements,
    'student_agreements', cp.student_agreements,
    'student_disagreements', cp.student_disagreements,
    'excluded_intervals', cp.excluded_intervals,
    'calculated_at', cp.calculated_at
  ) into comparison_data
  from public.research_observation_comparisons_v2 cp
  join public.research_observation_schedule_slots s on s.id = cp.slot_id
  where s.observation_id = target_observation_id
  order by cp.calculated_at desc
  limit 1;

  return jsonb_build_object(
    'case', detail_case,
    'observation', jsonb_build_object(
      'id', observation_row.id,
      'observation_date', observation_row.observation_date,
      'phase', observation_row.phase,
      'session_number', observation_row.session_number,
      'baseline_measurement_role', observation_row.baseline_measurement_role,
      'target_routine', observation_row.target_routine_snapshot,
      'target_behavior_definition', observation_row.target_behavior_definition_snapshot,
      'start_time', observation_row.start_time,
      'end_time', observation_row.end_time,
      'context_note', observation_row.context_note
    ),
    'slot', slot_data,
    'summary', current_summary,
    'records', record_data,
    'comparison', comparison_data
  );
end;
$function$;

revoke all on function public.research_admin_observation_details(uuid) from public, anon;
grant execute on function public.research_admin_observation_details(uuid) to authenticated, service_role;
