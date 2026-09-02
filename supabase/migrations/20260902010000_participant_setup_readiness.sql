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
 update public.participants set is_test=target_is_test,updated_at=now() where case_id=target_case_id returning jsonb_build_object('participant_id',id,'is_test',is_test) into result;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
 return result;
end $$;

revoke all on function public.research_admin_participant_readiness(uuid,date), public.research_admin_simulate_test_reminder(uuid,date), public.research_admin_set_test_participant(uuid,boolean) from public;
grant execute on function public.research_admin_participant_readiness(uuid,date), public.research_admin_simulate_test_reminder(uuid,date), public.research_admin_set_test_participant(uuid,boolean) to authenticated;
comment on column public.participants.is_test is 'Explicitly set by a research admin for fake/QA participants excluded from production reminder recipients and dissertation outcomes/counts; never inferred from participant identity or email.';
