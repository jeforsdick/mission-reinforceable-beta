-- Descriptive study-day context only. Nothing in this migration participates in
-- adherence, gameplay, phase, fidelity, observation, or reminder calculations.
create table public.participant_study_day_status_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  participant_id uuid not null,
  case_id uuid not null,
  study_date date not null,
  reason text not null check (reason in ('teacher_absent', 'student_absent', 'schedule_disruption')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  constraint study_day_status_tokens_participant_case_fk
    foreign key (participant_id, case_id) references public.participants(id, case_id) on delete restrict
);

create table public.participant_study_day_status_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  case_id uuid not null,
  study_date date not null,
  -- NULL is the research-admin-only "clear reported disruption" correction.
  reason text check (reason in ('teacher_absent', 'student_absent', 'schedule_disruption')),
  source text not null check (source in ('daily_email', 'research_admin')),
  recorded_at timestamptz not null default now(),
  token_id uuid unique references public.participant_study_day_status_tokens(id) on delete restrict,
  supersedes_event_id uuid references public.participant_study_day_status_events(id) on delete restrict,
  recorded_by_type text not null check (recorded_by_type in ('teacher_link', 'research_admin')),
  recorded_by_user_id uuid references public.profiles(id) on delete restrict,
  constraint study_day_status_events_participant_case_fk
    foreign key (participant_id, case_id) references public.participants(id, case_id) on delete restrict,
  constraint study_day_status_event_origin_check check (
    (source = 'daily_email' and recorded_by_type = 'teacher_link' and token_id is not null and
      recorded_by_user_id is null and reason is not null and supersedes_event_id is null)
    or
    (source = 'research_admin' and recorded_by_type = 'research_admin' and token_id is null and
      recorded_by_user_id is not null and supersedes_event_id is not null)
  )
);

create index participant_study_day_status_events_participant_date_idx
  on public.participant_study_day_status_events (participant_id, study_date);
create index participant_study_day_status_events_case_date_idx
  on public.participant_study_day_status_events (case_id, study_date);
create index participant_study_day_status_events_recorded_at_idx
  on public.participant_study_day_status_events (recorded_at);
create index participant_study_day_status_tokens_participant_date_idx
  on public.participant_study_day_status_tokens (participant_id, study_date);

create function public.prevent_study_day_status_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'study-day status events are append-only';
end $$;
create trigger participant_study_day_status_events_immutable
before update or delete on public.participant_study_day_status_events
for each row execute function public.prevent_study_day_status_event_mutation();

alter table public.participant_study_day_status_tokens enable row level security;
alter table public.participant_study_day_status_events enable row level security;
revoke all on public.participant_study_day_status_tokens, public.participant_study_day_status_events from anon, authenticated;
grant select on public.participant_study_day_status_events to authenticated;
create policy "Research admins read study-day context history"
on public.participant_study_day_status_events for select to authenticated
using ((select public.is_research_admin()));

-- Service-role-only atomic consumption. A unique token_id makes concurrent and
-- repeated POSTs idempotent; an existing event is returned without mutation.
create function public.record_study_day_status_token(target_token_hash text)
returns table (event_id uuid, reason text, already_recorded boolean)
language plpgsql security definer set search_path = '' as $$
declare token_row public.participant_study_day_status_tokens%rowtype;
declare existing_id uuid;
begin
  select * into token_row from public.participant_study_day_status_tokens
  where token_hash = target_token_hash for update;
  if not found then raise exception 'invalid_status_token' using errcode = 'P0001'; end if;
  select e.id into existing_id from public.participant_study_day_status_events e where e.token_id = token_row.id;
  if existing_id is not null then
    return query select existing_id, token_row.reason, true; return;
  end if;
  if token_row.expires_at < now() then raise exception 'expired_status_token' using errcode = 'P0001'; end if;
  insert into public.participant_study_day_status_events
    (participant_id, case_id, study_date, reason, source, token_id, recorded_by_type)
  values (token_row.participant_id, token_row.case_id, token_row.study_date, token_row.reason,
    'daily_email', token_row.id, 'teacher_link') returning id into existing_id;
  update public.participant_study_day_status_tokens set consumed_at = now() where id = token_row.id;
  return query select existing_id, token_row.reason, false;
end $$;

-- Deterministic current state: recorded_at followed by UUID is the total order.
create function public.current_participant_study_day_status(target_participant_id uuid default null, target_case_id uuid default null)
returns table (participant_id uuid, case_id uuid, study_date date, event_id uuid, reason text,
  source text, recorded_at timestamptz, has_history boolean)
language sql stable security definer set search_path = '' as $$
with ranked as (
  select e.*, row_number() over (partition by e.participant_id, e.study_date order by e.recorded_at desc, e.id desc) position,
    count(*) over (partition by e.participant_id, e.study_date) event_count
  from public.participant_study_day_status_events e
  where (target_participant_id is null or e.participant_id = target_participant_id)
    and (target_case_id is null or e.case_id = target_case_id)
)
select participant_id, case_id, study_date, id, reason, source, recorded_at, event_count > 1
from ranked where position = 1 order by study_date desc, recorded_at desc, id desc;
$$;

create function public.research_admin_correct_study_day_status(target_event_id uuid, target_reason text, target_actor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare prior public.participant_study_day_status_events%rowtype; declare new_id uuid;
begin
  if not public.is_research_admin() or auth.uid() is distinct from target_actor_id then raise exception 'active research admin required'; end if;
  if target_reason is not null and target_reason not in ('teacher_absent','student_absent','schedule_disruption') then raise exception 'invalid reason'; end if;
  select * into prior from public.participant_study_day_status_events where id=target_event_id;
  if not found then raise exception 'status event not found'; end if;
  insert into public.participant_study_day_status_events(participant_id,case_id,study_date,reason,source,supersedes_event_id,recorded_by_type,recorded_by_user_id)
  values(prior.participant_id,prior.case_id,prior.study_date,target_reason,'research_admin',prior.id,'research_admin',target_actor_id)
  returning id into new_id; return new_id;
end $$;

revoke all on function public.record_study_day_status_token(text) from public;
revoke all on function public.current_participant_study_day_status(uuid,uuid) from public;
revoke all on function public.research_admin_correct_study_day_status(uuid,text,uuid) from public;
grant execute on function public.record_study_day_status_token(text) to service_role;
grant execute on function public.current_participant_study_day_status(uuid,uuid) to service_role;
grant execute on function public.research_admin_correct_study_day_status(uuid,text,uuid) to authenticated;

comment on table public.participant_study_day_status_events is 'Append-only descriptive context; explicitly excluded from study outcome and adherence calculations.';
comment on table public.participant_study_day_status_tokens is 'Hashed, single-purpose, short-lived teacher link capabilities; raw tokens are never stored.';
