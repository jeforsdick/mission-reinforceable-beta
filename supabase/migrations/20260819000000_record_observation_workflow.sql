-- Coordinates the already-validated session and primary record operations in one transaction.
-- The original RPCs remain public and authoritative; any failure rolls back both calls.
create function public.research_admin_record_classroom_observation(
  target_case_id uuid,
  target_observation_date date,
  target_primary_observer_id uuid,
  submitted_fidelity_scores jsonb,
  submitted_student_intervals jsonb,
  target_secondary_observer_id uuid default null,
  target_start_time time default null,
  target_end_time time default null,
  target_context_note text default null,
  target_observer_note text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare observation jsonb; primary_record jsonb;
begin
  observation := public.research_admin_create_classroom_observation(
    target_case_id, target_observation_date, target_primary_observer_id,
    target_secondary_observer_id, target_start_time, target_end_time, target_context_note
  );
  primary_record := public.research_admin_submit_classroom_observation_record(
    (observation->>'id')::uuid, 'primary', submitted_fidelity_scores,
    submitted_student_intervals, target_observer_note, null
  );
  return jsonb_build_object('observation', observation, 'primary_record', primary_record);
end $$;

revoke all on function public.research_admin_record_classroom_observation(uuid,date,uuid,jsonb,jsonb,uuid,time,time,text,text) from public,anon;
grant execute on function public.research_admin_record_classroom_observation(uuid,date,uuid,jsonb,jsonb,uuid,time,time,text,text) to authenticated;
