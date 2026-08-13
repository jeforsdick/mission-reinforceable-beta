-- Mission: Reinforceable dissertation schema and access-control foundation.
-- Additive only: preserves public.participants, public.cases, and
-- public.case_game_content and their existing policies.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  role text not null check (role in ('teacher', 'coach', 'research_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_coaches (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete cascade,
  primary_coach boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint case_coaches_case_coach_key unique (case_id, coach_user_id)
);

create table public.case_intake (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  teacher_name text not null,
  teacher_email text not null,
  coach_name text not null,
  coach_email text not null,
  grade_level text not null,
  student_initials text not null,
  target_behavior text not null,
  behavior_topography text not null,
  primary_function text not null check (
    primary_function in (
      'escape_avoidance', 'attention', 'tangible_access',
      'automatic_sensory', 'multiple', 'unclear'
    )
  ),
  replacement_behavior text not null,
  desired_behavior text not null,
  prevention_strategies text not null,
  teaching_strategies text not null,
  reinforcement_system text not null,
  response_strategy text not null,
  has_crisis_plan boolean not null default false,
  crisis_plan text,
  typical_settings text not null,
  common_triggers text not null,
  typical_antecedents text not null,
  typical_consequences text not null,
  current_staff_responses text not null,
  requested_scenarios text,
  additional_context text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_intake_crisis_plan_required check (
    not has_crisis_plan or nullif(btrim(crisis_plan), '') is not null
  )
);

create table public.fidelity_targets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  domain text not null check (
    domain in ('proactive', 'teaching', 'reinforcement', 'response', 'crisis')
  ),
  description text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  case_id uuid not null references public.cases(id),
  participant_code text,
  mode text not null,
  mission_id text not null,
  mission_title text,
  game_content_version integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'started'
    check (status in ('started', 'completed', 'abandoned')),
  duration_seconds integer,
  active_duration_seconds integer,
  score numeric,
  max_score numeric,
  accuracy numeric,
  total_questions integer,
  plan_aligned_count integer,
  refine_count integer,
  missed_count integer,
  hints_used boolean,
  total_hints_opened integer,
  questions_with_hints integer,
  hint_use_rate numeric,
  created_at timestamptz not null default now()
);

create table public.game_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id),
  case_id uuid not null references public.cases(id),
  fidelity_target_id uuid references public.fidelity_targets(id),
  fidelity_domain text check (
    fidelity_domain in ('proactive', 'teaching', 'reinforcement', 'response', 'crisis')
  ),
  mission_id text not null,
  step_id text not null,
  step_index integer,
  scenario_title text,
  scenario_text text,
  context_tag text,
  choice_id text,
  selected_answer_text text,
  selected_score numeric,
  alignment text not null check (
    alignment in ('plan_aligned', 'workable_refine', 'missed_opportunity')
  ),
  best_answer_text text,
  feedback_text text,
  mechanism text,
  error_type text,
  function_tag text,
  hint_opened boolean not null default false,
  hint_open_count integer not null default 0,
  time_to_hint_ms integer,
  time_hint_to_answer_ms integer,
  response_time_ms integer,
  game_content_version integer,
  created_at timestamptz not null default now()
);

-- Composite keys prevent a response from mixing IDs from different cases,
-- participants, sessions, or fidelity targets.
alter table public.game_sessions
  add constraint game_sessions_id_participant_case_key
  unique (id, participant_id, case_id);
alter table public.fidelity_targets
  add constraint fidelity_targets_id_case_key unique (id, case_id);
alter table public.game_responses
  add constraint game_responses_session_participant_case_fkey
  foreign key (session_id, participant_id, case_id)
  references public.game_sessions (id, participant_id, case_id) on delete cascade;
alter table public.game_responses
  add constraint game_responses_fidelity_target_case_fkey
  foreign key (fidelity_target_id, case_id)
  references public.fidelity_targets (id, case_id);

create index case_coaches_case_id_idx on public.case_coaches (case_id);
create index case_coaches_coach_user_id_idx on public.case_coaches (coach_user_id);
create unique index case_coaches_one_active_primary_idx
  on public.case_coaches (case_id) where active and primary_coach;
create index fidelity_targets_case_id_idx on public.fidelity_targets (case_id);
create index game_sessions_participant_id_idx on public.game_sessions (participant_id);
create index game_sessions_case_id_idx on public.game_sessions (case_id);
create index game_sessions_started_at_idx on public.game_sessions (started_at);
create index game_responses_session_id_idx on public.game_responses (session_id);
create index game_responses_participant_id_idx on public.game_responses (participant_id);
create index game_responses_case_id_idx on public.game_responses (case_id);
create index game_responses_fidelity_target_id_idx on public.game_responses (fidelity_target_id);
create index game_responses_fidelity_domain_idx on public.game_responses (fidelity_domain);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger case_intake_set_updated_at
before update on public.case_intake
for each row execute function public.set_updated_at();

create trigger fidelity_targets_set_updated_at
before update on public.fidelity_targets
for each row execute function public.set_updated_at();

-- SECURITY DEFINER helpers keep policy checks independent of RLS on lookup tables.
-- Every object reference is schema-qualified and the search path is empty.
create function public.is_research_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'research_admin' and p.active
  );
$$;

create function public.is_active_case_coach(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_coaches cc
    join public.profiles p on p.id = cc.coach_user_id
    join public.cases c on c.id = cc.case_id
    where cc.case_id = target_case_id
      and cc.coach_user_id = auth.uid()
      and cc.active and p.active and p.role = 'coach' and c.active
  );
$$;

create function public.owns_active_participant_case(
  target_participant_id uuid,
  target_case_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.participants p
    join public.cases c on c.id = p.case_id
    where p.id = target_participant_id
      and p.case_id = target_case_id
      and p.auth_user_id = auth.uid()
      and p.active and c.active
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.is_research_admin() from public;
revoke all on function public.is_active_case_coach(uuid) from public;
revoke all on function public.owns_active_participant_case(uuid, uuid) from public;
grant execute on function public.is_research_admin() to authenticated;
grant execute on function public.is_active_case_coach(uuid) to authenticated;
grant execute on function public.owns_active_participant_case(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.case_coaches enable row level security;
alter table public.case_intake enable row level security;
alter table public.fidelity_targets enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_responses enable row level security;

revoke all on table public.profiles, public.case_coaches, public.case_intake,
  public.fidelity_targets, public.game_sessions, public.game_responses from anon;
grant select on table public.profiles, public.case_coaches, public.case_intake,
  public.fidelity_targets, public.game_sessions, public.game_responses to authenticated;
grant insert, update on table public.game_sessions to authenticated;
grant insert on table public.game_responses to authenticated;
grant insert, update, delete on table public.profiles, public.case_coaches,
  public.case_intake, public.fidelity_targets, public.game_sessions,
  public.game_responses to authenticated;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy "Research admins manage profiles"
on public.profiles for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

create policy "Coaches can read their own assignments"
on public.case_coaches for select to authenticated
using (coach_user_id = (select auth.uid()) and active);
create policy "Research admins manage case coach assignments"
on public.case_coaches for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

create policy "Assigned users can read case intake"
on public.case_intake for select to authenticated
using (
  public.is_active_case_coach(case_id)
  or exists (
    select 1 from public.participants p
    where p.case_id = case_intake.case_id
      and p.auth_user_id = (select auth.uid()) and p.active
  )
  or (select public.is_research_admin())
);
create policy "Research admins manage case intake"
on public.case_intake for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

create policy "Assigned users can read fidelity targets"
on public.fidelity_targets for select to authenticated
using (
  public.is_active_case_coach(case_id)
  or exists (
    select 1 from public.participants p
    where p.case_id = fidelity_targets.case_id
      and p.auth_user_id = (select auth.uid()) and p.active
  )
  or (select public.is_research_admin())
);
create policy "Research admins manage fidelity targets"
on public.fidelity_targets for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

create policy "Participants can read their own game sessions"
on public.game_sessions for select to authenticated
using (public.owns_active_participant_case(participant_id, case_id));
create policy "Participants can create their own game sessions"
on public.game_sessions for insert to authenticated
with check (public.owns_active_participant_case(participant_id, case_id));
create policy "Participants can update their own game sessions"
on public.game_sessions for update to authenticated
using (public.owns_active_participant_case(participant_id, case_id))
with check (public.owns_active_participant_case(participant_id, case_id));
create policy "Assigned coaches can read game sessions"
on public.game_sessions for select to authenticated
using (public.is_active_case_coach(case_id));
create policy "Research admins manage game sessions"
on public.game_sessions for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

create policy "Participants can read their own game responses"
on public.game_responses for select to authenticated
using (public.owns_active_participant_case(participant_id, case_id));
create policy "Participants can create their own game responses"
on public.game_responses for insert to authenticated
with check (
  public.owns_active_participant_case(participant_id, case_id)
  and exists (
    select 1 from public.game_sessions gs
    where gs.id = game_responses.session_id
      and gs.participant_id = game_responses.participant_id
      and gs.case_id = game_responses.case_id
  )
);
create policy "Assigned coaches can read game responses"
on public.game_responses for select to authenticated
using (public.is_active_case_coach(case_id));
create policy "Research admins manage game responses"
on public.game_responses for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));

-- Narrowly scoped SELECT access on existing tables; existing policies remain intact.
create policy "Assigned coaches and research admins can read cases"
on public.cases for select to authenticated
using (
  public.is_active_case_coach(id) or (select public.is_research_admin())
);
create policy "Research admins can read protected game content"
on public.case_game_content for select to authenticated
using ((select public.is_research_admin()));

comment on table public.profiles is 'Application role metadata for Supabase Auth users; roles are admin-managed.';
comment on table public.case_coaches is 'Admin-managed many-to-many assignments between coach profiles and cases.';
comment on table public.case_intake is 'One V1 practitioner intake record per case; contains limited identifying information.';
comment on table public.fidelity_targets is 'Atomic implementation behaviors used to evaluate plan fidelity.';
comment on table public.game_sessions is 'One relational, de-identified record per mission attempt.';
comment on table public.game_responses is 'One relational, de-identified record per meaningful gameplay decision.';
