-- Canonical bootstrap for the legacy objects on which the dissertation migrations depend.
-- This migration creates no study data and is intended to run first on a fresh project.

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  student_alias text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  participant_code text not null unique,
  case_id uuid not null references public.cases(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intake_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  teacher_email text not null,
  coach_name text not null,
  coach_email text not null,
  grade_level text not null,
  student_initials text not null,
  student_strengths text,
  preferred_items_activities text,
  preference_assessment_notes text,
  target_behavior text not null,
  behavior_topography text not null,
  primary_function text not null,
  replacement_behavior text not null,
  desired_behavior text not null,
  prevention_strategies text,
  teaching_strategies text,
  reinforcement_system text,
  response_strategy text,
  has_crisis_plan boolean not null default false,
  crisis_plan text,
  typical_settings text not null,
  common_triggers text not null,
  typical_antecedents text not null,
  typical_consequences text not null,
  current_staff_responses text not null,
  requested_scenarios text,
  additional_context text,
  fidelity_targets jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'declined', 'converted')),
  converted_case_id uuid references public.cases(id) on delete set null,
  converted_at timestamptz,
  submitted_at timestamptz not null default now()
);

create table if not exists public.case_game_content (
  case_id uuid primary key references public.cases(id) on delete cascade,
  config jsonb not null,
  resources jsonb not null,
  daily_missions jsonb not null default '[]'::jsonb,
  wildcard_missions jsonb not null default '[]'::jsonb,
  crisis_missions jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.cases enable row level security;
alter table public.participants enable row level security;
alter table public.intake_requests enable row level security;
alter table public.case_game_content enable row level security;

revoke all on table public.cases, public.participants, public.intake_requests,
  public.case_game_content from anon, authenticated;
grant insert on table public.intake_requests to anon, authenticated;
grant select on table public.cases, public.participants, public.case_game_content to authenticated;

create policy "Public can submit intake requests"
on public.intake_requests for insert to anon, authenticated
with check (status = 'submitted' and converted_case_id is null and converted_at is null);

create policy "Participants can view their own assignment"
on public.participants for select to authenticated
using (auth_user_id = (select auth.uid()) and active);

create policy "Participants can view their assigned active case"
on public.cases for select to authenticated
using (active and exists (
  select 1 from public.participants p
  where p.case_id = cases.id and p.auth_user_id = (select auth.uid()) and p.active
));

create policy "Participants can view assigned protected game content"
on public.case_game_content for select to authenticated
using (exists (
  select 1 from public.participants p
  where p.case_id = case_game_content.case_id
    and p.auth_user_id = (select auth.uid()) and p.active
));

comment on table public.intake_requests is
  'Public intake submissions; direct reads and mutations are unavailable to browser roles.';
comment on table public.case_game_content is
  'Protected individualized game content readable only for an authenticated active assignment.';
