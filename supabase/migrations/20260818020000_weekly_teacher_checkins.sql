-- Weekly teacher self-report check-ins and immutable participant submission path.
alter table public.participants add constraint participants_id_case_id_key unique (id, case_id);
create table public.weekly_teacher_checkins (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  case_id uuid not null references public.cases(id),
  week_start date not null,
  week_end date not null,
  available_on date not null,
  scheduled_study_days smallint not null,
  helpfulness_rating smallint not null,
  confidence_rating smallint not null,
  plan_difficult boolean not null,
  coach_note text,
  submitted_at timestamptz not null default now(),
  qa_mode boolean not null default false,
  created_at timestamptz not null default now(),
  constraint weekly_checkins_participant_case_fkey foreign key (participant_id, case_id)
    references public.participants(id, case_id),
  constraint weekly_checkins_monday check (extract(isodow from week_start) = 1),
  constraint weekly_checkins_friday check (week_end = week_start + 4),
  constraint weekly_checkins_available_in_week check (available_on between week_start and week_end),
  constraint weekly_checkins_scheduled_days check (scheduled_study_days between 1 and 5),
  constraint weekly_checkins_helpfulness_rating check (helpfulness_rating between 1 and 5),
  constraint weekly_checkins_confidence_rating check (confidence_rating between 1 and 5),
  constraint weekly_checkins_coach_note_length check (coach_note is null or char_length(coach_note) <= 1000)
);
create unique index weekly_checkins_participant_week_mode_key
  on public.weekly_teacher_checkins(participant_id, week_start, qa_mode);
create index weekly_checkins_case_submitted_idx
  on public.weekly_teacher_checkins(case_id, submitted_at desc) where qa_mode = false;

alter table public.weekly_teacher_checkins enable row level security;
revoke all on table public.weekly_teacher_checkins from anon;
revoke insert, update, delete on table public.weekly_teacher_checkins from authenticated;
grant select on table public.weekly_teacher_checkins to authenticated;

create policy "Participants read own normal weekly check-ins"
on public.weekly_teacher_checkins for select to authenticated
using (qa_mode = false and public.owns_active_participant_case(participant_id, case_id));
create policy "Assigned coaches read normal weekly check-ins"
on public.weekly_teacher_checkins for select to authenticated
using (qa_mode = false and public.is_active_case_coach(case_id));
create policy "Research admins read weekly check-ins"
on public.weekly_teacher_checkins for select to authenticated
using ((select public.is_research_admin()));

create or replace function public.submit_weekly_teacher_checkin(
  p_helpfulness_rating smallint,
  p_confidence_rating smallint,
  p_plan_difficult boolean,
  p_coach_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  participant public.participants%rowtype;
  today date := (now() at time zone 'America/Denver')::date;
  monday date;
  friday date;
  available date;
  scheduled smallint;
  result_id uuid;
begin
  if p_helpfulness_rating not between 1 and 5 or p_confidence_rating not between 1 and 5
     or p_plan_difficult is null or char_length(p_coach_note) > 1000 then
    raise exception 'invalid weekly check-in response' using errcode = '22023';
  end if;
  select p.* into participant from public.participants p join public.cases c on c.id=p.case_id
   where p.auth_user_id=(select auth.uid()) and p.active and c.active;
  if not found then raise exception 'active participant assignment not found' using errcode='42501'; end if;
  monday := today - (extract(isodow from today)::integer - 1); friday := monday + 4;
  with weekdays as (select d::date d from generate_series(monday, friday, interval '1 day') d),
  eligible as (select d from weekdays where d between date '2026-08-12' and date '2027-05-26' and d not in (
    date '2026-09-07',date '2026-09-18',date '2026-10-15',date '2026-10-16',date '2026-10-19',date '2026-10-20',date '2026-11-25',date '2026-11-26',date '2026-11-27',date '2026-12-21',date '2026-12-22',date '2026-12-23',date '2026-12-24',date '2026-12-25',date '2026-12-28',date '2026-12-29',date '2026-12-30',date '2026-12-31',date '2027-01-01',date '2027-01-04',date '2027-01-18',date '2027-02-12',date '2027-02-15',date '2027-02-16',date '2027-03-12',date '2027-03-15',date '2027-03-29',date '2027-03-30',date '2027-03-31',date '2027-04-01',date '2027-04-02',date '2027-04-05'))
  select max(d), count(*)::smallint into available, scheduled from eligible;
  if available is null or today < available or today >= monday + 7 then
    raise exception 'weekly check-in is not currently available' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(participant.id::text || ':' || monday::text || ':weekly-checkin',0));
  insert into public.weekly_teacher_checkins(participant_id,case_id,week_start,week_end,available_on,scheduled_study_days,helpfulness_rating,confidence_rating,plan_difficult,coach_note,qa_mode)
  values(participant.id,participant.case_id,monday,friday,available,scheduled,p_helpfulness_rating,p_confidence_rating,p_plan_difficult,nullif(btrim(p_coach_note),''),false)
  returning id into result_id;
  return result_id;
exception when unique_violation then raise exception 'weekly check-in already submitted' using errcode='23505';
end; $$;
revoke all on function public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text) from public;
grant execute on function public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text) to authenticated;
comment on table public.weekly_teacher_checkins is 'Immutable weekly participant self-report; excludes identifying student and plan content.';
comment on function public.submit_weekly_teacher_checkin(smallint,smallint,boolean,text) is 'Submits one normal check-in for the authenticated participant during the Denver weekly window.';
