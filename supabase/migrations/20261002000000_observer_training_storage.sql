create table if not exists public.observer_training_attempts (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  observer_name text not null check (observer_name in ('Austen','Casey','Melissa','Kathleen','Jess')),
  case_id text not null check (case_id in ('nora','kai')),
  attempt_type text not null check (attempt_type in ('practice','qualification')),
  module_version text not null default 'v5',
  case_version integer not null default 1 check (case_version > 0),
  started_at timestamptz,
  submitted_at timestamptz not null,
  video_duration_seconds integer not null check (video_duration_seconds > 0),
  interval_seconds integer not null default 15 check (interval_seconds > 0),
  intervals jsonb not null default '[]'::jsonb check (jsonb_typeof(intervals) = 'array'),
  fidelity_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(fidelity_scores) = 'object'),
  fidelity_outcomes jsonb not null default '{}'::jsonb check (jsonb_typeof(fidelity_outcomes) = 'object'),
  notes text,
  teacher_fidelity_agreement numeric(5,2) check (teacher_fidelity_agreement between 0 and 100),
  desired_outcome_agreement numeric(5,2) check (desired_outcome_agreement between 0 and 100),
  student_behavior_agreement numeric(5,2) check (student_behavior_agreement between 0 and 100),
  qualified boolean,
  auth_user_id uuid default auth.uid(),
  source_environment text not null default 'preview' check (source_environment in ('preview','production')),
  created_at timestamptz not null default now()
);

create table if not exists public.observer_training_feedback (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  observer_name text not null check (observer_name in ('Austen','Casey','Melissa','Kathleen','Jess')),
  case_id text not null default 'nora' check (case_id in ('nora','kai')),
  manageability smallint check (manageability between 1 and 5),
  fidelity_ease smallint check (fidelity_ease between 1 and 5),
  behavior_ease smallint check (behavior_ease between 1 and 5),
  cue_helpfulness smallint check (cue_helpfulness between 1 and 5),
  could_not_enter boolean,
  hard_definitions text,
  first_change text,
  questions text,
  submitted_at timestamptz not null,
  auth_user_id uuid default auth.uid(),
  source_environment text not null default 'preview' check (source_environment in ('preview','production')),
  created_at timestamptz not null default now()
);

create table if not exists public.observer_training_questions (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  observer_name text not null check (observer_name in ('Austen','Casey','Melissa','Kathleen','Jess')),
  scoring_questions text,
  practice_requests text,
  other_notes text,
  submitted_at timestamptz not null,
  auth_user_id uuid default auth.uid(),
  source_environment text not null default 'preview' check (source_environment in ('preview','production')),
  created_at timestamptz not null default now()
);

alter table public.observer_training_attempts enable row level security;
alter table public.observer_training_feedback enable row level security;
alter table public.observer_training_questions enable row level security;

revoke all on public.observer_training_attempts from anon, authenticated;
revoke all on public.observer_training_feedback from anon, authenticated;
revoke all on public.observer_training_questions from anon, authenticated;

grant insert on public.observer_training_attempts to anon, authenticated;
grant insert on public.observer_training_feedback to anon, authenticated;
grant insert on public.observer_training_questions to anon, authenticated;
grant select on public.observer_training_attempts to authenticated;
grant select on public.observer_training_feedback to authenticated;
grant select on public.observer_training_questions to authenticated;

drop policy if exists "Training module inserts attempts" on public.observer_training_attempts;
create policy "Training module inserts attempts"
on public.observer_training_attempts
for insert
to anon, authenticated
with check (
  observer_name in ('Austen','Casey','Melissa','Kathleen','Jess')
  and case_id in ('nora','kai')
  and attempt_type in ('practice','qualification')
  and interval_seconds = 15
  and jsonb_array_length(intervals) between 1 and 240
);

drop policy if exists "Research admins read training attempts" on public.observer_training_attempts;
create policy "Research admins read training attempts"
on public.observer_training_attempts
for select
to authenticated
using ((select is_research_admin()));

drop policy if exists "Training module inserts feedback" on public.observer_training_feedback;
create policy "Training module inserts feedback"
on public.observer_training_feedback
for insert
to anon, authenticated
with check (
  observer_name in ('Austen','Casey','Melissa','Kathleen','Jess')
  and case_id in ('nora','kai')
);

drop policy if exists "Research admins read training feedback" on public.observer_training_feedback;
create policy "Research admins read training feedback"
on public.observer_training_feedback
for select
to authenticated
using ((select is_research_admin()));

drop policy if exists "Training module inserts questions" on public.observer_training_questions;
create policy "Training module inserts questions"
on public.observer_training_questions
for insert
to anon, authenticated
with check (observer_name in ('Austen','Casey','Melissa','Kathleen','Jess'));

drop policy if exists "Research admins read training questions" on public.observer_training_questions;
create policy "Research admins read training questions"
on public.observer_training_questions
for select
to authenticated
using ((select is_research_admin()));

create index if not exists observer_training_attempts_observer_case_idx
  on public.observer_training_attempts(observer_name, case_id, submitted_at desc);
create index if not exists observer_training_feedback_observer_idx
  on public.observer_training_feedback(observer_name, submitted_at desc);
create index if not exists observer_training_questions_observer_idx
  on public.observer_training_questions(observer_name, submitted_at desc);
