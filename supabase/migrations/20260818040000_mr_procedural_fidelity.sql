-- Dissertation-only, research-admin procedural-delivery fidelity audit trail.
-- Human judgments remain distinct from teacher engagement and classroom BIP fidelity.

create function public.is_mr_dissertation_study_day(target_date date)
returns boolean language sql immutable set search_path = '' as $$
  select target_date between date '2026-08-12' and date '2027-05-26'
    and extract(isodow from target_date) between 1 and 5
    and target_date not in (
      date '2026-09-07',date '2026-09-18',date '2026-10-15',date '2026-10-16',
      date '2026-10-19',date '2026-10-20',date '2026-11-25',date '2026-11-26',date '2026-11-27',
      date '2026-12-21',date '2026-12-22',date '2026-12-23',date '2026-12-24',date '2026-12-25',
      date '2026-12-28',date '2026-12-29',date '2026-12-30',date '2026-12-31',date '2027-01-01',
      date '2027-01-04',date '2027-01-18',date '2027-02-12',date '2027-02-15',date '2027-02-16',
      date '2027-03-12',date '2027-03-15',date '2027-03-29',date '2027-03-30',date '2027-03-31',
      date '2027-04-01',date '2027-04-02',date '2027-04-05'
    );
$$;

create table public.mr_procedural_fidelity_reviews (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete restrict,
  case_id uuid not null references public.cases(id) on delete restrict,
  review_scope text not null check (review_scope in ('daily','weekly')),
  study_date date,
  week_start date,
  week_end date,
  components jsonb not null,
  system_evidence jsonb not null default '{}'::jsonb,
  overall_notes text check (overall_notes is null or char_length(overall_notes) <= 2000),
  yes_count smallint not null check (yes_count >= 0),
  applicable_count smallint not null check (applicable_count >= 0),
  fidelity_percent numeric(5,2),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  constraint mr_fidelity_participant_case_fkey foreign key (participant_id, case_id)
    references public.participants(id, case_id) on delete restrict,
  constraint mr_fidelity_period_shape check (
    (review_scope='daily' and study_date is not null and week_start is null and week_end is null)
    or (review_scope='weekly' and study_date is null and week_start is not null
      and extract(isodow from week_start)=1 and week_end=week_start+4)
  ),
  constraint mr_fidelity_counts check (yes_count <= applicable_count),
  constraint mr_fidelity_percent_shape check (
    (applicable_count=0 and fidelity_percent is null)
    or (applicable_count>0 and fidelity_percent between 0 and 100)
  )
);
create index mr_procedural_fidelity_period_idx on public.mr_procedural_fidelity_reviews
  (participant_id, review_scope, coalesce(study_date, week_start), reviewed_at desc, id desc);

create function public.prevent_mr_procedural_fidelity_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'procedural fidelity reviews are append-only' using errcode='55000';
end $$;
create trigger mr_procedural_fidelity_append_only
before update or delete on public.mr_procedural_fidelity_reviews
for each row execute function public.prevent_mr_procedural_fidelity_mutation();

alter table public.mr_procedural_fidelity_reviews enable row level security;
revoke all on table public.mr_procedural_fidelity_reviews from anon, authenticated;
grant select on table public.mr_procedural_fidelity_reviews to authenticated;
create policy "Research admins read procedural fidelity reviews"
on public.mr_procedural_fidelity_reviews for select to authenticated
using ((select public.is_research_admin()));

create function public.research_admin_procedural_fidelity_evidence(
  target_participant_id uuid, target_case_id uuid, target_scope text,
  target_study_date date default null, target_week_start date default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
  target_week_end date;
  denver_today date := (now() at time zone 'America/Denver')::date;
  current_week_start date;
begin
  current_week_start := denver_today - (extract(isodow from denver_today)::integer - 1);
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.participants p where p.id=target_participant_id and p.case_id=target_case_id)
    then raise exception 'participant/case assignment not found' using errcode='P0002'; end if;
  if target_scope='daily' then
    if not public.is_mr_dissertation_study_day(target_study_date) then raise exception 'daily target must be a scheduled Granite study day' using errcode='22023'; end if;
    if target_study_date > denver_today then
      raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023';
    end if;
    select jsonb_build_object(
      'authoritative_timezone','America/Denver',
      'daily_prompt', coalesce((select jsonb_build_object('event_id',e.id,'status',e.status,'attempt_count',e.attempt_count,'last_attempt_at',e.last_attempt_at)
        from public.teacher_reminder_events e where e.participant_id=target_participant_id and e.study_date=target_study_date and e.reminder_type='daily_prompt'),
        jsonb_build_object('recorded',false,'message','No reminder event recorded. This does not automatically mean No.')),
      'mission_availability', (select jsonb_build_object('case_active',c.active,'participant_active',p.active,
        'protected_content_present',gc.case_id is not null,'protected_content_version',gc.version,
        'outage_log','No reliable outage log is available; researcher confirmation required.')
        from public.participants p join public.cases c on c.id=p.case_id left join public.case_game_content gc on gc.case_id=c.id where p.id=target_participant_id),
      'functional_access', (select jsonb_build_object('auth_user_linked',p.auth_user_id is not null,
        'active_teacher_profile',coalesce(pr.active and pr.role='teacher',false),
        'non_qa_session_count',count(gs.id),
        'interpretation',case when count(gs.id)>0 then 'A non-QA gameplay session is positive access evidence.' else 'No gameplay session recorded. This does not by itself indicate an access failure.' end)
        from public.participants p left join public.profiles pr on pr.id=p.auth_user_id
        left join public.game_sessions gs on gs.participant_id=p.id and not gs.qa_mode
          and (gs.started_at at time zone 'America/Denver')::date=target_study_date where p.id=target_participant_id group by p.auth_user_id,pr.active,pr.role)
    ) into result;
  elsif target_scope='weekly' then
    target_week_end := target_week_start+4;
    if extract(isodow from target_week_start)<>1 or not exists(select 1 from generate_series(target_week_start,target_week_end,interval '1 day') d where public.is_mr_dissertation_study_day(d::date))
      then raise exception 'weekly target must be a Monday-Friday week containing a Granite study day' using errcode='22023'; end if;
    if target_week_start > current_week_start then
      raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023';
    end if;
    select jsonb_build_object('authoritative_timezone','America/Denver',
      'weekly_usage_summary',jsonb_build_object('message','No automated delivery log is available yet; researcher confirmation required.'),
      'weekly_teacher_checkin',coalesce((select jsonb_build_object('record_exists',true,'submitted_at',w.submitted_at)
        from public.weekly_teacher_checkins w where w.participant_id=target_participant_id and w.week_start=target_week_start and not w.qa_mode),
        jsonb_build_object('record_exists',false,'message','No normal weekly submission recorded. Nonsubmission does not prove the check-in was not distributed.'))
    ) into result;
  else raise exception 'review scope must be daily or weekly' using errcode='22023'; end if;
  return result;
end $$;

create function public.research_admin_submit_procedural_fidelity_review(
  target_participant_id uuid, target_case_id uuid, target_review_scope text,
  target_study_date date default null, target_week_start date default null,
  submitted_components jsonb default null, submitted_overall_notes text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare expected text[]; component_key text; component jsonb; yeses smallint:=0; applicable smallint:=0;
  percent numeric(5,2); evidence jsonb; new_row public.mr_procedural_fidelity_reviews%rowtype; normalized_notes text;
  denver_today date := (now() at time zone 'America/Denver')::date;
  current_week_start date;
begin
  current_week_start := denver_today - (extract(isodow from denver_today)::integer - 1);
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.participants p join public.cases c on c.id=p.case_id
    where p.id=target_participant_id and p.case_id=target_case_id and p.active and c.active)
    then raise exception 'active participant/case assignment required' using errcode='42501'; end if;
  if target_review_scope='daily' then
    expected:=array['daily_prompt_delivered','mission_available','functional_access_available'];
    if target_study_date is null or target_week_start is not null or not public.is_mr_dissertation_study_day(target_study_date)
      then raise exception 'daily target must be a scheduled Granite study day' using errcode='22023'; end if;
    if target_study_date > denver_today then
      raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023';
    end if;
  elsif target_review_scope='weekly' then
    expected:=array['weekly_usage_summary_delivered','weekly_teacher_checkin_distributed'];
    if target_study_date is not null or target_week_start is null or extract(isodow from target_week_start)<>1
      or not exists(select 1 from generate_series(target_week_start,target_week_start+4,interval '1 day') d where public.is_mr_dissertation_study_day(d::date))
      then raise exception 'weekly target must contain at least one scheduled Granite study day' using errcode='22023'; end if;
    if target_week_start > current_week_start then
      raise exception 'procedural fidelity cannot be recorded for a future study period' using errcode='22023';
    end if;
  else raise exception 'review scope must be daily or weekly' using errcode='22023'; end if;
  if jsonb_typeof(submitted_components) is distinct from 'object' or
    (select array_agg(k order by k) from jsonb_object_keys(submitted_components) k)
      is distinct from (select array_agg(k order by k) from unnest(expected) k)
    then raise exception 'exact expected component keys are required' using errcode='22023'; end if;
  foreach component_key in array expected loop
    component:=submitted_components->component_key;
    if jsonb_typeof(component) is distinct from 'object' or not component?'status'
      or component-array['status','note']<>'{}'::jsonb or jsonb_typeof(component->'status') is distinct from 'string'
      or component->>'status' not in ('yes','no','na')
      or (component?'note' and jsonb_typeof(component->'note') not in ('string','null'))
      or char_length(coalesce(component->>'note',''))>1000
      then raise exception 'invalid procedural fidelity component: %',component_key using errcode='22023'; end if;
    if component->>'status' in ('no','na') and nullif(btrim(coalesce(component->>'note','')),'') is null
      then raise exception 'a brief note is required for No and N/A: %',component_key using errcode='22023'; end if;
    yeses:=yeses+(component->>'status'='yes')::integer;
    applicable:=applicable+(component->>'status' in ('yes','no'))::integer;
  end loop;
  normalized_notes:=nullif(btrim(submitted_overall_notes),'');
  if char_length(coalesce(normalized_notes,''))>2000 then raise exception 'overall notes must be 2000 characters or fewer' using errcode='22023'; end if;
  percent:=case when applicable=0 then null else round(100.0*yeses/applicable,2) end;
  evidence:=public.research_admin_procedural_fidelity_evidence(target_participant_id,target_case_id,target_review_scope,target_study_date,target_week_start);
  insert into public.mr_procedural_fidelity_reviews(participant_id,case_id,review_scope,study_date,week_start,week_end,components,system_evidence,overall_notes,yes_count,applicable_count,fidelity_percent,reviewed_by)
  values(target_participant_id,target_case_id,target_review_scope,target_study_date,target_week_start,case when target_review_scope='weekly' then target_week_start+4 end,
    submitted_components,evidence,normalized_notes,yeses,applicable,percent,auth.uid()) returning * into new_row;
  return to_jsonb(new_row);
end $$;

create function public.research_admin_procedural_fidelity_dashboard(target_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 select jsonb_build_object('participant_id',p.id,'case_active',c.active,'participant_active',p.active,
  'history',coalesce((select jsonb_agg(to_jsonb(x) order by x.reviewed_at desc,x.id desc) from (
    select r.*,coalesce(pr.display_name,'Research admin') reviewer,
      row_number() over(partition by r.participant_id,r.review_scope,coalesce(r.study_date,r.week_start) order by r.reviewed_at desc,r.id desc)=1 is_current
    from public.mr_procedural_fidelity_reviews r left join public.profiles pr on pr.id=r.reviewed_by where r.participant_id=p.id) x),'[]'::jsonb),
  'summary',coalesce((select jsonb_build_object(
    'daily_yes',coalesce(sum(yes_count) filter(where review_scope='daily'),0),'daily_applicable',coalesce(sum(applicable_count) filter(where review_scope='daily'),0),
    'weekly_yes',coalesce(sum(yes_count) filter(where review_scope='weekly'),0),'weekly_applicable',coalesce(sum(applicable_count) filter(where review_scope='weekly'),0),
    'overall_yes',coalesce(sum(yes_count),0),'overall_applicable',coalesce(sum(applicable_count),0),
    'daily_dates',count(*) filter(where review_scope='daily'),'study_weeks',count(*) filter(where review_scope='weekly')) from (
      select distinct on(review_scope,coalesce(study_date,week_start)) review_scope,yes_count,applicable_count
      from public.mr_procedural_fidelity_reviews where participant_id=p.id order by review_scope,coalesce(study_date,week_start),reviewed_at desc,id desc) latest),'{}'::jsonb)
 ) into result from public.cases c join public.participants p on p.case_id=c.id where c.id=target_case_id;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if; return result;
end $$;

revoke all on function public.is_mr_dissertation_study_day(date) from public;
revoke all on function public.prevent_mr_procedural_fidelity_mutation() from public;
revoke all on function public.research_admin_procedural_fidelity_evidence(uuid,uuid,text,date,date) from public;
revoke all on function public.research_admin_submit_procedural_fidelity_review(uuid,uuid,text,date,date,jsonb,text) from public;
revoke all on function public.research_admin_procedural_fidelity_dashboard(uuid) from public;
grant execute on function public.research_admin_procedural_fidelity_evidence(uuid,uuid,text,date,date) to authenticated;
grant execute on function public.research_admin_submit_procedural_fidelity_review(uuid,uuid,text,date,date,jsonb,text) to authenticated;
grant execute on function public.research_admin_procedural_fidelity_dashboard(uuid) to authenticated;

comment on table public.mr_procedural_fidelity_reviews is 'Append-only research-admin judgments of MR delivery; engagement and classroom BIP fidelity are excluded.';
comment on function public.is_mr_dissertation_study_day(date) is 'Frozen Granite calendar, interpreted in the authoritative America/Denver study timezone.';
