-- Correct reminder completion to match the study procedure: any valid, non-QA
-- Mission: Reinforceable mission completes the requirement for the day.
create or replace function public.has_completed_mission_on_study_date(
  target_participant_id uuid, target_case_id uuid, target_study_date date, study_timezone text
)
returns boolean language sql stable security definer set search_path = '' as $$
select exists (
 select 1 from public.game_sessions gs
 join public.case_game_content content on content.case_id = gs.case_id
 where gs.participant_id = target_participant_id
 and gs.case_id = target_case_id
 and gs.status = 'completed'
 and gs.qa_mode = false
 and gs.mode in ('daily', 'mystery', 'crisis')
 and gs.game_content_version = content.version
 and exists (
   select 1 from jsonb_array_elements(case gs.mode
     when 'daily' then content.daily_missions
     when 'mystery' then content.wildcard_missions
     when 'crisis' then content.crisis_missions end) published_mission
   where published_mission ->> 'id' = gs.mission_id
 )
 and (gs.ended_at at time zone 'America/Denver')::date = target_study_date
);
$$;

revoke all on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) from public;
revoke execute on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) from anon, authenticated;
grant execute on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) to service_role;
comment on function public.has_completed_mission_on_study_date(uuid,uuid,date,text) is
'True when the participant completed any valid Daily, Mystery, or Crisis mission from the case current published content on the study date in America/Denver; QA sessions do not count.';

-- Keep researcher readiness aligned with the same completion rule.
create or replace function public.research_admin_participant_readiness(target_case_id uuid, target_study_date date default (now() at time zone 'America/Denver')::date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select jsonb_build_object(
  'participant_id',p.id,'study_id',p.participant_code,'teacher_name',pr.display_name,'teacher_email',pr.email,
  'auth_linked',coalesce(p.auth_user_id=pr.id and lower(btrim(pr.email))=lower(btrim(ci.teacher_email)),false),
  'case_assigned',p.case_id=c.id,'participant_active',p.active and c.active,
  'teacher_profile_valid',pr.active and pr.role='teacher' and nullif(btrim(pr.email),'') is not null,
  'reminders_enabled',coalesce(rs.enabled,false),'is_test',p.is_test,'study_date',target_study_date,
  'eligible',p.active and c.active and pr.active and pr.role='teacher' and nullif(btrim(pr.email),'') is not null
    and coalesce(rs.enabled,false) and rs.activated_at<=now() and (rs.deactivated_at is null or rs.deactivated_at>now())
    and not public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver'),
  'simulation_available',p.is_test
    and coalesce(p.auth_user_id=pr.id and lower(btrim(pr.email))=lower(btrim(ci.teacher_email)),false)
    and p.case_id=c.id and p.active and c.active and pr.active and pr.role='teacher' and nullif(btrim(pr.email),'') is not null
    and not public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver'),
  'simulation_reason',case
    when not coalesce(p.auth_user_id=pr.id and lower(btrim(pr.email))=lower(btrim(ci.teacher_email)),false) then 'Teacher auth email does not match intake assignment'
    when p.case_id<>c.id then 'Case is not assigned'
    when not p.active or not c.active then 'Participant or case is inactive'
    when pr.role<>'teacher' or not pr.active or nullif(btrim(pr.email),'') is null then 'Teacher profile is not valid'
    when public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver') then 'Today''s mission is complete'
    else null end,
  'reason_not_eligible',case
    when p.auth_user_id<>pr.id or lower(btrim(pr.email))<>lower(btrim(ci.teacher_email)) then 'Teacher auth email does not match intake assignment'
    when pr.role<>'teacher' or not pr.active then 'Teacher profile is not active'
    when not p.active or not c.active then 'Participant or case is inactive'
    when not coalesce(rs.enabled,false) then 'Daily reminders are not enabled'
    when rs.activated_at is null or rs.activated_at>now() or rs.deactivated_at<=now() then 'Reminder activation is not current'
    when public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver') then 'Today''s mission is complete'
    else null end,
  'last_reminder',(select to_jsonb(e) from public.teacher_reminder_events e where e.participant_id=p.id order by e.study_date desc,e.updated_at desc limit 1),
  'last_mission_completion',(select jsonb_build_object('ended_at',gs.ended_at,'mission_id',gs.mission_id,'mode',gs.mode,'qa_mode',gs.qa_mode) from public.game_sessions gs where gs.participant_id=p.id and gs.case_id=c.id and gs.status='completed' and gs.qa_mode=false and gs.mode in ('daily','mystery','crisis') order by gs.ended_at desc limit 1),
  'completed_required_today',public.has_completed_mission_on_study_date(p.id,c.id,target_study_date,'America/Denver')
 ) into result
 from public.participants p join public.cases c on c.id=p.case_id join public.profiles pr on pr.id=p.auth_user_id
 left join public.case_intake ci on ci.case_id=c.id left join public.teacher_reminder_settings rs on rs.participant_id=p.id
 where c.id=target_case_id;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
 return result;
end $$;
revoke all on function public.research_admin_participant_readiness(uuid,date) from public;
grant execute on function public.research_admin_participant_readiness(uuid,date) to authenticated;
