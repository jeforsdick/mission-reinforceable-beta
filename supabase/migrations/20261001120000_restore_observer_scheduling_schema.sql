-- Restore observer-operations tables that exist in the hosted study database
-- but were absent from the checked-in migration history. This file deliberately
-- predates 20261004223000_observer_live_workflow_v2.sql, which references them.
-- Safe for pre-existing databases: CREATE TABLE IF NOT EXISTS, conditional
-- policy creation, and no DROP/DELETE/TRUNCATE or data modifications.
-- Schema, constraints and RLS policies reconciled with production (2026-10-15).

create table if not exists public.research_case_observation_schedule (
  case_id uuid primary key,
  routine_start_time time without time zone not null,
  routine_end_time time without time zone not null,
  weekly_target_days integer not null default 3 check (weekly_target_days between 1 and 5),
  active boolean not null default true,
  schedule_note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  routine_label text,
  check (routine_end_time > routine_start_time)
);

create table if not exists public.research_observation_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  observation_date date not null,
  planned_start_time time without time zone not null,
  planned_end_time time without time zone not null,
  primary_observer_id uuid references public.research_observers(id),
  secondary_observer_id uuid references public.research_observers(id),
  secondary_role text check (secondary_role in ('formal_ioa', 'supported_calibration', 'calibration_and_ioa')),
  status text not null default 'needs_assignment'
    check (status in ('needs_assignment', 'scheduled', 'confirmed', 'completed', 'needs_reschedule', 'cancelled')),
  attendance_status text not null default 'unchecked'
    check (attendance_status in ('unchecked', 'student_present', 'student_absent', 'not_applicable')),
  observation_id uuid references public.research_classroom_observations(id),
  observer_message_note text,
  reschedule_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  case_code_snapshot text,
  routine_label_snapshot text,
  unique (case_id, observation_date),
  check (planned_end_time > planned_start_time),
  check (primary_observer_id is null or secondary_observer_id is null
    or primary_observer_id <> secondary_observer_id)
);

create table if not exists public.research_observation_week_targets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  week_start_date date not null,
  target_days integer not null default 3 check (target_days between 0 and 5),
  prior_week_deficit integer not null default 0 check (prior_week_deficit between 0 and 5),
  make_up_target integer not null default 0 check (make_up_target between 0 and 5),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (case_id, week_start_date)
);

create table if not exists public.research_observer_accounts (
  observer_id uuid primary key references public.research_observers(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.research_observer_clearance (
  observer_id uuid primary key references public.research_observers(id) on delete cascade,
  clearance_status text not null default 'pending'
    check (clearance_status in ('pending', 'cleared', 'revoked')),
  cleared_at timestamptz,
  cleared_by uuid references auth.users(id),
  clearance_note text,
  updated_at timestamptz not null default now()
);

-- Mirror the hosted permission model: no anonymous access; authenticated
-- role access is constrained further by per-table row level security.
revoke all on public.research_case_observation_schedule,
  public.research_observation_schedule_slots,
  public.research_observation_week_targets,
  public.research_observer_accounts,
  public.research_observer_clearance from anon;

grant select, insert, update, delete on
  public.research_case_observation_schedule,
  public.research_observation_schedule_slots,
  public.research_observation_week_targets,
  public.research_observer_accounts,
  public.research_observer_clearance to authenticated;

alter table public.research_case_observation_schedule enable row level security;
alter table public.research_observation_schedule_slots enable row level security;
alter table public.research_observation_week_targets enable row level security;
alter table public.research_observer_accounts enable row level security;
alter table public.research_observer_clearance enable row level security;

-- Create policies only when absent, without replacing policies on a live DB.
do $policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_case_observation_schedule'
    and policyname = 'Research admins manage case schedules') then
    create policy "Research admins manage case schedules"
      on public.research_case_observation_schedule for all to authenticated
      using ((select public.is_research_admin()))
      with check ((select public.is_research_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_case_observation_schedule'
    and policyname = 'Observers read assigned case schedule') then
    create policy "Observers read assigned case schedule"
      on public.research_case_observation_schedule for select to authenticated
      using (exists (
        select 1 from public.research_observer_accounts a
        join public.research_observation_schedule_slots s
          on s.primary_observer_id = a.observer_id or s.secondary_observer_id = a.observer_id
        where a.auth_user_id = (select auth.uid()) and a.active = true
          and s.case_id = research_case_observation_schedule.case_id
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observation_schedule_slots'
    and policyname = 'Research admins manage schedule slots') then
    create policy "Research admins manage schedule slots"
      on public.research_observation_schedule_slots for all to authenticated
      using ((select public.is_research_admin()))
      with check ((select public.is_research_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observation_schedule_slots'
    and policyname = 'Observers read own schedule slots') then
    create policy "Observers read own schedule slots"
      on public.research_observation_schedule_slots for select to authenticated
      using (exists (
        select 1 from public.research_observer_accounts a
        where a.auth_user_id = (select auth.uid()) and a.active = true
          and (a.observer_id = research_observation_schedule_slots.primary_observer_id
            or a.observer_id = research_observation_schedule_slots.secondary_observer_id)
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observation_week_targets'
    and policyname = 'Research admins manage weekly targets') then
    create policy "Research admins manage weekly targets"
      on public.research_observation_week_targets for all to authenticated
      using ((select public.is_research_admin()))
      with check ((select public.is_research_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observer_accounts'
    and policyname = 'Research admins manage observer accounts') then
    create policy "Research admins manage observer accounts"
      on public.research_observer_accounts for all to authenticated
      using ((select public.is_research_admin()))
      with check ((select public.is_research_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observer_accounts'
    and policyname = 'Observers read own account mapping') then
    create policy "Observers read own account mapping"
      on public.research_observer_accounts for select to authenticated
      using ((select auth.uid()) = auth_user_id and active = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observer_clearance'
    and policyname = 'Research admins manage observer clearance') then
    create policy "Research admins manage observer clearance"
      on public.research_observer_clearance for all to authenticated
      using ((select public.is_research_admin()))
      with check ((select public.is_research_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'research_observer_clearance'
    and policyname = 'Observers read own clearance') then
    create policy "Observers read own clearance"
      on public.research_observer_clearance for select to authenticated
      using (exists (
        select 1 from public.research_observer_accounts a
        where a.auth_user_id = (select auth.uid()) and a.active = true
          and a.observer_id = research_observer_clearance.observer_id
      ));
  end if;
end
$policies$;
