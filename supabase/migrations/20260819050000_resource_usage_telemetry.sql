-- Privacy-minimal, append-only Resource Map engagement telemetry.
alter table public.participants
add constraint participants_id_case_id_key unique (id, case_id);

create table public.game_resource_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  case_id uuid not null references public.cases(id),
  event_name text not null,
  section_key text,
  game_content_version integer,
  qa_mode boolean not null default false,
  occurred_at timestamptz not null default now(),
  constraint game_resource_events_event_name_check check (
    event_name in ('resources_opened', 'resource_section_opened')
  ),
  constraint game_resource_events_section_key_check check (
    (event_name = 'resources_opened' and section_key is null)
    or
    (event_name = 'resource_section_opened' and section_key in (
      'bip', 'functionForest', 'prevention', 'replacement', 'reinforcement',
      'errorCorrection', 'library', 'coaching', 'fidelity'
    ))
  ),
  constraint game_resource_events_participant_case_fkey
    foreign key (participant_id, case_id)
    references public.participants(id, case_id)
);

create index game_resource_events_participant_occurred_idx
on public.game_resource_events(participant_id, occurred_at);
create index game_resource_events_case_occurred_idx
on public.game_resource_events(case_id, occurred_at);
create index game_resource_events_case_event_section_idx
on public.game_resource_events(case_id, event_name, section_key);

alter table public.game_resource_events enable row level security;
revoke all on table public.game_resource_events from anon, authenticated;
grant select, insert on table public.game_resource_events to authenticated;

create policy "Participants create their own resource events"
on public.game_resource_events for insert to authenticated
with check (
  qa_mode = false
  and public.owns_active_participant_case(participant_id, case_id)
);

create policy "Research admins read resource events"
on public.game_resource_events for select to authenticated
using ((select public.is_research_admin()));

create policy "Research admins create QA resource events"
on public.game_resource_events for insert to authenticated
with check (
  qa_mode = true
  and (select public.is_research_admin())
  and exists (
    select 1
    from public.participants p
    join public.cases c on c.id = p.case_id
    where p.id = game_resource_events.participant_id
      and p.case_id = game_resource_events.case_id
      and p.active = false
      and c.active = false
      and exists (
        select 1 from public.case_game_content gc where gc.case_id = c.id
      )
  )
);

create policy "Assigned coaches read participant resource events"
on public.game_resource_events for select to authenticated
using (qa_mode = false and public.is_active_case_coach(case_id));

comment on table public.game_resource_events is
'Intentional Resource Map access events; descriptive engagement/usage data, not fidelity, treatment integrity, mastery, compliance, phase logic, or required dose.';
