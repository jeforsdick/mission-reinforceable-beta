-- Weekly check-in generation is a trusted-server operation. The Research Admin
-- endpoint authenticates the human caller before invoking this function with the
-- service-role credential; browser roles remain unable to execute it.
create or replace function public.research_admin_generate_weekly_checkin(target_participant_id uuid,target_case_id uuid,target_week_start date,target_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare intervention_start date; intervention_end date; target_code text; is_qa boolean; checkin_id uuid;
begin
 if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
 if target_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid token hash' using errcode='22023'; end if;
 select p.participant_code into target_code from public.participants p where p.id=target_participant_id and p.case_id=target_case_id;
 if target_code is null then raise exception 'participant/case assignment not found' using errcode='P0002'; end if;
 is_qa := target_code='MR-998';
 with resolved as (
   select phase,effective_date from (select pe.phase,pe.effective_date,row_number() over(partition by pe.effective_date order by pe.recorded_at desc,pe.id desc) precedence from public.research_case_phase_events pe where pe.case_id=target_case_id) ranked where precedence=1
 ) select r.effective_date into intervention_start from resolved r where r.phase='intervention' order by r.effective_date limit 1;
 with resolved as (
   select phase,effective_date from (select pe.phase,pe.effective_date,row_number() over(partition by pe.effective_date order by pe.recorded_at desc,pe.id desc) precedence from public.research_case_phase_events pe where pe.case_id=target_case_id) ranked where precedence=1
 ) select r.effective_date-1 into intervention_end from resolved r where r.effective_date>intervention_start and r.phase<>'intervention' order by r.effective_date limit 1;
 intervention_end:=coalesce(intervention_end,(now() at time zone 'America/Denver')::date+365);
 if intervention_start is null or target_week_start+4<intervention_start or target_week_start>intervention_end
   or not exists(select 1 from generate_series(target_week_start,target_week_start+4,interval '1 day') d where public.is_mr_dissertation_study_day(d::date))
 then raise exception 'weekly check-in is expected only for an Intervention week' using errcode='22023'; end if;
 insert into public.participant_weekly_checkins(participant_id,case_id,week_start,week_end,link_issued_at,qa_mode)
 values(target_participant_id,target_case_id,target_week_start,target_week_start+4,now(),is_qa)
 on conflict(participant_id,case_id,week_start,qa_mode) do update set link_issued_at=coalesce(public.participant_weekly_checkins.link_issued_at,excluded.link_issued_at)
 returning id into checkin_id;
 insert into public.participant_weekly_checkin_tokens(token_hash,participant_id,case_id,week_start,week_end,expires_at,qa_mode)
 values(target_token_hash,target_participant_id,target_case_id,target_week_start,target_week_start+4,(target_week_start+19)::timestamp at time zone 'America/Denver',is_qa);
 return checkin_id;
end $$;

revoke all on function public.research_admin_generate_weekly_checkin(uuid,uuid,date,text) from public,anon,authenticated;
grant execute on function public.research_admin_generate_weekly_checkin(uuid,uuid,date,text) to service_role;
