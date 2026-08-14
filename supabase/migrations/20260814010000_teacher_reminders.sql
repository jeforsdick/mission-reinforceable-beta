-- Additive, explicitly activated teacher reminder configuration and minimal send log.
-- Creating a participant, case, intake, or Auth user never creates or enables a row.

create table public.teacher_reminder_settings (
participant_id uuid primary key references public.participants(id) on delete cascade,
enabled boolean not null default false,
followup_enabled boolean not null default false,
activated_at timestamptz,
deactivated_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint teacher_reminder_activation_required check (not enabled or activated_at is not null),
constraint teacher_reminder_deactivation_order check (
deactivated_at is null or activated_at is null or deactivated_at >= activated_at
)
);

create table public.teacher_reminder_events (
id uuid primary key default gen_random_uuid(),
participant_id uuid not null references public.participants(id) on delete cascade,
case_id uuid not null references public.cases(id) on delete cascade,
reminder_type text not null check (reminder_type in ('daily_prompt', 'followup_reminder')),
study_date date not null,
provider_message_id text,
status text not null check (status in ('pending', 'sent', 'failed')),
attempt_count integer not null default 1 check (attempt_count > 0),
last_attempt_at timestamptz not null default now(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint teacher_reminder_events_once_per_day unique
(participant_id, study_date, reminder_type)
);

create index teacher_reminder_events_case_id_idx
on public.teacher_reminder_events (case_id);
create index teacher_reminder_events_study_date_idx
on public.teacher_reminder_events (study_date);

create trigger teacher_reminder_settings_set_updated_at
before update on public.teacher_reminder_settings
for each row execute function public.set_updated_at();
create trigger teacher_reminder_events_set_updated_at
before update on public.teacher_reminder_events
for each row execute function public.set_updated_at();

alter table public.teacher_reminder_settings enable row level security;
alter table public.teacher_reminder_events enable row level security;
revoke all on table public.teacher_reminder_settings, public.teacher_reminder_events from anon, authenticated;
grant select, insert, update, delete on table public.teacher_reminder_settings to authenticated;
grant select on table public.teacher_reminder_events to authenticated;

create policy "Research admins manage teacher reminder settings"
on public.teacher_reminder_settings for all to authenticated
using ((select public.is_research_admin()))
with check ((select public.is_research_admin()));
create policy "Research admins read teacher reminder events"
on public.teacher_reminder_events for select to authenticated
using ((select public.is_research_admin()));

-- Service-role-only RPC: recipient identity is resolved from participant.auth_user_id.
create function public.eligible_teacher_reminders(require_followup boolean default false)
returns table (participant_id uuid, case_id uuid, teacher_name text, teacher_email text)
language sql
stable
security definer
set search_path = ''
as $$
select p.id, p.case_id, pr.display_name, pr.email
from public.teacher_reminder_settings trs
join public.participants p on p.id = trs.participant_id
join public.cases c on c.id = p.case_id
join public.profiles pr on pr.id = p.auth_user_id
where trs.enabled
and trs.activated_at is not null and trs.activated_at <= now()
and (trs.deactivated_at is null or trs.deactivated_at > now())
and (not require_followup or trs.followup_enabled)
and p.active and c.active and pr.active and pr.role = 'teacher'
and nullif(btrim(pr.email), '') is not null;
$$;

-- Atomically creates a claim or reclaims a failed attempt. A conflict against a
-- sent/pending row returns claimed=false; concurrent callers therefore cannot
-- both send. Reclaims retain the same unique row and increment attempt metadata.
create function public.claim_teacher_reminder_event(
target_participant_id uuid,
target_case_id uuid,
target_reminder_type text,
target_study_date date
)
returns table (event_id uuid, claimed boolean)
language sql
volatile
security definer
set search_path = ''
as $$
with claimed_event as (
insert into public.teacher_reminder_events as existing
(participant_id, case_id, reminder_type, study_date, status)
values
(target_participant_id, target_case_id, target_reminder_type, target_study_date, 'pending')
on conflict (participant_id, study_date, reminder_type) do update
set status = 'pending',
case_id = excluded.case_id,
provider_message_id = null,
attempt_count = existing.attempt_count + 1,
last_attempt_at = now(),
updated_at = now()
where existing.status = 'failed'
returning id
)
select ce.id, true from claimed_event ce
union all
select existing.id, false
from public.teacher_reminder_events existing
where existing.participant_id = target_participant_id
and existing.study_date = target_study_date
and existing.reminder_type = target_reminder_type
and not exists (select 1 from claimed_event);
$$;

-- Relational game_sessions is authoritative for same-study-day completion.
create function public.has_completed_mission_on_study_date(
target_participant_id uuid,
target_study_date date,
study_timezone text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
select exists (
select 1 from public.game_sessions gs
where gs.participant_id = target_participant_id
and gs.status = 'completed'
and (coalesce(gs.ended_at, gs.started_at) at time zone study_timezone)::date = target_study_date
);
$$;

revoke all on function public.eligible_teacher_reminders(boolean) from public;
revoke all on function public.has_completed_mission_on_study_date(uuid, date, text) from public;
revoke all on function public.claim_teacher_reminder_event(uuid, uuid, text, date) from public;
revoke execute on function public.eligible_teacher_reminders(boolean) from anon, authenticated;
revoke execute on function public.has_completed_mission_on_study_date(uuid, date, text) from anon, authenticated;
revoke execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date) from anon, authenticated;
grant execute on function public.eligible_teacher_reminders(boolean) to service_role;
grant execute on function public.has_completed_mission_on_study_date(uuid, date, text) to service_role;
grant execute on function public.claim_teacher_reminder_event(uuid, uuid, text, date) to service_role;

comment on table public.teacher_reminder_settings is
'Research-admin controlled intervention reminder activation; absent rows and new rows are disabled.';
comment on table public.teacher_reminder_events is
'Minimal idempotent operational log; contains no email body or student information.';
