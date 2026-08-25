-- Administrative/adherence tracking for the external Qualtrics Weekly Teacher Report.
-- Deliberately contains no survey response, rating, score, behavior, or comment columns.
create table public.participant_weekly_checkins (
 id uuid primary key default gen_random_uuid(), participant_id uuid not null, case_id uuid not null,
 week_start date not null, week_end date not null, created_at timestamptz not null default now(),
 link_issued_at timestamptz, completed_at timestamptz, qa_mode boolean not null default false,
 constraint participant_weekly_checkins_participant_case_fkey foreign key(participant_id,case_id) references public.participants(id,case_id),
 constraint participant_weekly_checkins_week_shape check(extract(isodow from week_start)=1 and week_end=week_start+4),
 unique(participant_id,case_id,week_start,qa_mode)
);
create table public.participant_weekly_checkin_tokens (
 id uuid primary key default gen_random_uuid(), token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 participant_id uuid not null, case_id uuid not null, week_start date not null, week_end date not null,
 purpose text not null default 'weekly_teacher_checkin' check(purpose='weekly_teacher_checkin'),
 created_at timestamptz not null default now(), expires_at timestamptz not null, completed_at timestamptz,
 qa_mode boolean not null default false,
 constraint participant_weekly_checkin_tokens_participant_case_fkey foreign key(participant_id,case_id) references public.participants(id,case_id),
 constraint participant_weekly_checkin_tokens_week_shape check(extract(isodow from week_start)=1 and week_end=week_start+4)
);
comment on table public.participant_weekly_checkins is 'External-measure administration metadata only; never Qualtrics answers or study outcomes.';
comment on table public.participant_weekly_checkin_tokens is 'SHA-256 hashes of single-purpose opaque Qualtrics tracking tokens; raw tokens are never persisted.';
alter table public.participant_weekly_checkins enable row level security;
alter table public.participant_weekly_checkin_tokens enable row level security;
revoke all on public.participant_weekly_checkins,public.participant_weekly_checkin_tokens from public,anon,authenticated;
grant select on public.participant_weekly_checkins to authenticated;
create policy "Research admins read weekly administration status" on public.participant_weekly_checkins for select to authenticated using(public.is_research_admin());

create function public.research_admin_generate_weekly_checkin(target_participant_id uuid,target_case_id uuid,target_week_start date,target_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare intervention_start date; intervention_end date; target_code text; is_qa boolean; checkin_id uuid;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
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

create function public.complete_weekly_checkin(submitted_token_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare token_row public.participant_weekly_checkin_tokens%rowtype; completion_time timestamptz;
begin
 select * into token_row from public.participant_weekly_checkin_tokens where token_hash=submitted_token_hash and expires_at>=now() for update;
 if not found then raise exception 'completion token not found or expired' using errcode='P0002'; end if;
 completion_time:=coalesce(token_row.completed_at,now());
 update public.participant_weekly_checkin_tokens set completed_at=completion_time where id=token_row.id and completed_at is null;
 update public.participant_weekly_checkins set completed_at=coalesce(completed_at,completion_time)
 where participant_id=token_row.participant_id and case_id=token_row.case_id and week_start=token_row.week_start and qa_mode=token_row.qa_mode;
 return true;
end $$;
revoke all on function public.research_admin_generate_weekly_checkin(uuid,uuid,date,text),public.complete_weekly_checkin(text) from public,anon,authenticated;
-- Service-role endpoints call both functions; browsers cannot execute or mutate either table.
grant execute on function public.research_admin_generate_weekly_checkin(uuid,uuid,date,text),public.complete_weekly_checkin(text) to service_role;

create function public.research_admin_weekly_checkins(target_participant_id uuid,target_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; intervention_start date; intervention_end date;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if not exists(select 1 from public.participants p where p.id=target_participant_id and p.case_id=target_case_id) then raise exception 'participant/case assignment not found' using errcode='P0002'; end if;
 with resolved as (
   select phase,effective_date from (select pe.phase,pe.effective_date,row_number() over(partition by pe.effective_date order by pe.recorded_at desc,pe.id desc) precedence from public.research_case_phase_events pe where pe.case_id=target_case_id) ranked where precedence=1
 ) select r.effective_date into intervention_start from resolved r where r.phase='intervention' order by r.effective_date limit 1;
 with resolved as (
   select phase,effective_date from (select pe.phase,pe.effective_date,row_number() over(partition by pe.effective_date order by pe.recorded_at desc,pe.id desc) precedence from public.research_case_phase_events pe where pe.case_id=target_case_id) ranked where precedence=1
 ) select r.effective_date-1 into intervention_end from resolved r where r.effective_date>intervention_start and r.phase<>'intervention' order by r.effective_date limit 1;
 intervention_end:=coalesce(intervention_end,(now() at time zone 'America/Denver')::date);
 select coalesce(jsonb_agg(jsonb_build_object('week_start',w.monday,'week_end',w.monday+4,'expected',true,'link_issued_at',c.link_issued_at,'completed_at',c.completed_at,'qa_mode',coalesce(c.qa_mode,false),'status',case when c.completed_at is not null then 'complete' when c.link_issued_at is not null then 'link_issued' when w.monday>(now() at time zone 'America/Denver')::date then 'upcoming' else 'due' end) order by w.monday),'[]'::jsonb)
 into result from (select d::date monday from generate_series(intervention_start-(extract(isodow from intervention_start)::int-1),intervention_end,interval '7 days') d where intervention_start is not null and d::date<=intervention_end and d::date+4>=intervention_start and exists(select 1 from generate_series(d::date,d::date+4,interval '1 day') sd where public.is_mr_dissertation_study_day(sd::date))) w left join public.participant_weekly_checkins c on c.participant_id=target_participant_id and c.case_id=target_case_id and c.week_start=w.monday;
 return result;
end $$;
revoke all on function public.research_admin_weekly_checkins(uuid,uuid) from public,anon;
grant execute on function public.research_admin_weekly_checkins(uuid,uuid) to authenticated;
