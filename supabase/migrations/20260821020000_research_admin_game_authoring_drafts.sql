-- Protected, append-only browser-authoring foundation for Research Admin.
-- These tables may contain participant-specific protected authoring content. They
-- are research-admin-only, never participant runtime, never coach-facing, never
-- public, never returned to teachers, and never automatically published.

create table public.case_game_resource_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  resources jsonb not null check (jsonb_typeof(resources) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create index case_game_resource_draft_revisions_latest_idx
on public.case_game_resource_draft_revisions(case_id, created_at desc, id desc);

create table public.case_game_mission_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  mission_type text not null,
  slot_number integer not null,
  mission jsonb not null check (jsonb_typeof(mission) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  constraint case_game_mission_draft_type_slot_check check (
    (mission_type = 'daily' and slot_number between 1 and 10)
    or (mission_type = 'wild' and slot_number between 1 and 5)
    or (mission_type = 'crisis' and slot_number between 1 and 5)
  )
);

create index case_game_mission_draft_revisions_latest_idx
on public.case_game_mission_draft_revisions(case_id, mission_type, slot_number, created_at desc, id desc);

create table public.case_game_setup_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  setup jsonb not null check (jsonb_typeof(setup) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict
);

create index case_game_setup_draft_revisions_latest_idx
on public.case_game_setup_draft_revisions(case_id, created_at desc, id desc);

alter table public.case_game_resource_draft_revisions enable row level security;
alter table public.case_game_mission_draft_revisions enable row level security;
alter table public.case_game_setup_draft_revisions enable row level security;

revoke all on table public.case_game_resource_draft_revisions from anon, authenticated;
revoke all on table public.case_game_mission_draft_revisions from anon, authenticated;
revoke all on table public.case_game_setup_draft_revisions from anon, authenticated;

create function public.research_admin_save_resource_map_draft(
  target_case_id uuid,
  target_resources jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_revision_id uuid;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_case_id is null then raise exception 'case ID is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.cases c where c.id = target_case_id) then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if target_resources is null or jsonb_typeof(target_resources) <> 'object' then
    raise exception 'resources draft must be a JSON object' using errcode = '22023';
  end if;
  insert into public.case_game_resource_draft_revisions(case_id, resources, created_by)
  values (target_case_id, target_resources, auth.uid()) returning id into new_revision_id;
  return new_revision_id;
end;
$$;

create function public.research_admin_save_mission_draft(
  target_case_id uuid,
  target_mission_type text,
  target_slot_number integer,
  target_mission jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_revision_id uuid;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_case_id is null then raise exception 'case ID is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.cases c where c.id = target_case_id) then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if target_mission_type not in ('daily', 'wild', 'crisis') then
    raise exception 'invalid mission type' using errcode = '22023';
  end if;
  if target_slot_number is null
    or (target_mission_type = 'daily' and target_slot_number not between 1 and 10)
    or (target_mission_type in ('wild', 'crisis') and target_slot_number not between 1 and 5) then
    raise exception 'invalid mission slot' using errcode = '22023';
  end if;
  if target_mission is null or jsonb_typeof(target_mission) <> 'object' then
    raise exception 'mission draft must be a JSON object' using errcode = '22023';
  end if;

  -- A crisis draft may hold an elevated-but-safe scenario even when the approved
  -- intake snapshot has no crisis plan. Final crisis validation and publishing
  -- will be implemented later and must enforce the Mission Authoring Standard;
  -- this save operation neither infers nor manufactures crisis procedures.
  insert into public.case_game_mission_draft_revisions(
    case_id, mission_type, slot_number, mission, created_by
  ) values (
    target_case_id, target_mission_type, target_slot_number, target_mission, auth.uid()
  ) returning id into new_revision_id;
  return new_revision_id;
end;
$$;

create function public.research_admin_save_game_setup_draft(
  target_case_id uuid,
  target_setup jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_revision_id uuid;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_case_id is null then raise exception 'case ID is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.cases c where c.id = target_case_id) then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if target_setup is null or jsonb_typeof(target_setup) <> 'object' then
    raise exception 'setup draft must be a JSON object' using errcode = '22023';
  end if;
  insert into public.case_game_setup_draft_revisions(case_id, setup, created_by)
  values (target_case_id, target_setup, auth.uid()) returning id into new_revision_id;
  return new_revision_id;
end;
$$;

create function public.research_admin_game_authoring_workspace(target_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_case_id is null then raise exception 'case ID is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.cases c where c.id = target_case_id) then
    raise exception 'case not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'case', jsonb_build_object('id', c.id, 'case_code', c.case_code, 'student_alias', c.student_alias),
    'has_crisis_plan', coalesce((
      select ci.has_crisis_plan from public.case_intake ci
      where ci.case_id = c.id order by ci.updated_at desc, ci.id desc limit 1
    ), false),
    'fidelity_targets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'target_key', ft.target_key, 'domain', ft.domain, 'description', ft.description,
        'sort_order', ft.sort_order
      ) order by ft.sort_order, ft.target_key, ft.id)
      from public.fidelity_targets ft where ft.case_id = c.id and ft.active
    ), '[]'::jsonb),
    'setup_draft', (
      select jsonb_build_object('revision_id', d.id, 'setup', d.setup, 'created_at', d.created_at, 'created_by', d.created_by)
      from public.case_game_setup_draft_revisions d where d.case_id = c.id
      order by d.created_at desc, d.id desc limit 1
    ),
    'resource_draft', (
      select jsonb_build_object('revision_id', d.id, 'resources', d.resources, 'created_at', d.created_at, 'created_by', d.created_by)
      from public.case_game_resource_draft_revisions d where d.case_id = c.id
      order by d.created_at desc, d.id desc limit 1
    ),
    'missions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mission_type', latest.mission_type, 'slot_number', latest.slot_number,
        'revision_id', latest.id, 'mission', latest.mission,
        'created_at', latest.created_at, 'created_by', latest.created_by
      ) order by case latest.mission_type when 'daily' then 1 when 'wild' then 2 else 3 end, latest.slot_number)
      from (
        select distinct on (d.mission_type, d.slot_number) d.*
        from public.case_game_mission_draft_revisions d where d.case_id = c.id
        order by d.mission_type, d.slot_number, d.created_at desc, d.id desc
      ) latest
    ), '[]'::jsonb)
  ) into result from public.cases c where c.id = target_case_id;
  return result;
end;
$$;

revoke all on function public.research_admin_save_resource_map_draft(uuid, jsonb) from public;
revoke all on function public.research_admin_save_mission_draft(uuid, text, integer, jsonb) from public;
revoke all on function public.research_admin_save_game_setup_draft(uuid, jsonb) from public;
revoke all on function public.research_admin_game_authoring_workspace(uuid) from public;
grant execute on function public.research_admin_save_resource_map_draft(uuid, jsonb) to authenticated;
grant execute on function public.research_admin_save_mission_draft(uuid, text, integer, jsonb) to authenticated;
grant execute on function public.research_admin_save_game_setup_draft(uuid, jsonb) to authenticated;
grant execute on function public.research_admin_game_authoring_workspace(uuid) to authenticated;

comment on table public.case_game_resource_draft_revisions is
'Protected, append-only Research Admin Resource Map drafts; not runtime or published content.';
comment on table public.case_game_mission_draft_revisions is
'Protected, append-only Research Admin mission drafts; not runtime or published content.';
comment on table public.case_game_setup_draft_revisions is
'Protected, append-only Research Admin game setup drafts; not runtime or published content.';
