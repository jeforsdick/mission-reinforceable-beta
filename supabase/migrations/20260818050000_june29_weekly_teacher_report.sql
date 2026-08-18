-- June 29 Weekly Mission: Reinforceable Teacher Report.
-- Additive evolution preserves legacy check-in rows without reinterpreting them.
alter table public.weekly_teacher_checkins
  alter column helpfulness_rating drop not null,
  alter column confidence_rating drop not null,
  alter column plan_difficult drop not null,
  add column report_version text not null default 'legacy_checkin_v1',
  add column access_rating smallint,
  add column manageability_rating smallint,
  add column bsp_relevance_rating smallint,
  add column implementation_thinking_rating smallint,
  add column feedback_usefulness_rating smallint,
  add column barriers_facilitators text,
  add column target_behavior_rating smallint,
  add column replacement_behavior_rating smallint,
  add column behavior_context_note text,
  add constraint weekly_reports_version_shape check (
    (report_version = 'legacy_checkin_v1' and helpfulness_rating is not null and confidence_rating is not null and plan_difficult is not null)
    or (report_version = 'june29_v1' and access_rating between 1 and 5 and manageability_rating between 1 and 5
      and bsp_relevance_rating between 1 and 5 and implementation_thinking_rating between 1 and 5
      and feedback_usefulness_rating between 1 and 5 and target_behavior_rating between 1 and 5
      and replacement_behavior_rating between 1 and 5)
  ),
  add constraint weekly_reports_barriers_length check (barriers_facilitators is null or char_length(barriers_facilitators) <= 1000),
  add constraint weekly_reports_behavior_context_length check (behavior_context_note is null or char_length(behavior_context_note) <= 1000);

-- Raw research/social-validity responses are not coach data.
drop policy if exists "Assigned coaches read normal weekly check-ins" on public.weekly_teacher_checkins;

-- The superseded response format can no longer be submitted.
revoke all on function public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text) from public, authenticated;
drop function public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text);

create function public.submit_weekly_teacher_report(
  p_access_rating smallint,
  p_manageability_rating smallint,
  p_bsp_relevance_rating smallint,
  p_implementation_thinking_rating smallint,
  p_feedback_usefulness_rating smallint,
  p_target_behavior_rating smallint,
  p_replacement_behavior_rating smallint,
  p_barriers_facilitators text default null,
  p_behavior_context_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  participant public.participants%rowtype;
  today date := (now() at time zone 'America/Denver')::date;
  monday date := today - (extract(isodow from today)::integer - 1);
  friday date;
  available date;
  scheduled smallint;
  result_id uuid;
begin
  friday := monday + 4;
  if p_access_rating not between 1 and 5 or p_manageability_rating not between 1 and 5
    or p_bsp_relevance_rating not between 1 and 5 or p_implementation_thinking_rating not between 1 and 5
    or p_feedback_usefulness_rating not between 1 and 5 or p_target_behavior_rating not between 1 and 5
    or p_replacement_behavior_rating not between 1 and 5
    or char_length(p_barriers_facilitators) > 1000 or char_length(p_behavior_context_note) > 1000 then
    raise exception 'invalid weekly teacher report response' using errcode = '22023';
  end if;
  select p.* into participant from public.participants p join public.cases c on c.id=p.case_id
    where p.auth_user_id=(select auth.uid()) and p.active and c.active;
  if not found then raise exception 'active participant assignment not found' using errcode='42501'; end if;
  select max(d::date), count(*)::smallint into available, scheduled
    from generate_series(monday,friday,interval '1 day') d where public.is_mr_dissertation_study_day(d::date);
  if available is null or today < available or today >= monday + 7 then
    raise exception 'weekly teacher report is not currently available' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(participant.id::text || ':' || monday::text || ':weekly-report',0));
  insert into public.weekly_teacher_checkins(
    participant_id,case_id,week_start,week_end,available_on,scheduled_study_days,report_version,
    access_rating,manageability_rating,bsp_relevance_rating,implementation_thinking_rating,
    feedback_usefulness_rating,target_behavior_rating,replacement_behavior_rating,
    barriers_facilitators,behavior_context_note,qa_mode)
  values(participant.id,participant.case_id,monday,friday,available,scheduled,'june29_v1',
    p_access_rating,p_manageability_rating,p_bsp_relevance_rating,p_implementation_thinking_rating,
    p_feedback_usefulness_rating,p_target_behavior_rating,p_replacement_behavior_rating,
    nullif(btrim(p_barriers_facilitators),''),nullif(btrim(p_behavior_context_note),''),false)
  returning id into result_id;
  return result_id;
exception when unique_violation then raise exception 'weekly teacher report already submitted' using errcode='23505';
end; $$;
revoke all on function public.submit_weekly_teacher_report(smallint,smallint,smallint,smallint,smallint,smallint,smallint,text,text) from public;
grant execute on function public.submit_weekly_teacher_report(smallint,smallint,smallint,smallint,smallint,smallint,smallint,text,text) to authenticated;
comment on function public.submit_weekly_teacher_report(smallint,smallint,smallint,smallint,smallint,smallint,smallint,text,text)
  is 'Submits the June 29 teacher-report measure; completion is engagement evidence, not MR distribution fidelity.';
