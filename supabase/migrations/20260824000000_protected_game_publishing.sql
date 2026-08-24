-- Immutable protected game publishing from the canonical browser draft workspace.

create table public.case_game_content_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  version integer not null check (version > 0),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  resources jsonb not null check (jsonb_typeof(resources) = 'object'),
  daily_missions jsonb not null check (jsonb_typeof(daily_missions) = 'array' and jsonb_array_length(daily_missions) = 10),
  wildcard_missions jsonb not null check (jsonb_typeof(wildcard_missions) = 'array' and jsonb_array_length(wildcard_missions) = 5),
  crisis_missions jsonb not null check (jsonb_typeof(crisis_missions) = 'array' and jsonb_array_length(crisis_missions) = 5),
  source_setup_revision_id uuid not null references public.case_game_setup_draft_revisions(id) on delete restrict,
  source_resource_revision_id uuid not null references public.case_game_resource_draft_revisions(id) on delete restrict,
  source_mission_revision_manifest jsonb not null check (jsonb_typeof(source_mission_revision_manifest) = 'array' and jsonb_array_length(source_mission_revision_manifest) = 20),
  published_at timestamptz not null default clock_timestamp(),
  published_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  constraint case_game_content_versions_case_version_key unique (case_id, version)
);

create index case_game_content_versions_case_published_idx
on public.case_game_content_versions(case_id, version desc);

alter table public.case_game_content_versions enable row level security;
revoke all on table public.case_game_content_versions from anon, authenticated;

create policy "Research admins read protected game versions"
on public.case_game_content_versions for select to authenticated
using (public.is_research_admin());
grant select on table public.case_game_content_versions to authenticated;

create function public.prevent_protected_game_version_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'protected game versions are immutable' using errcode = '55000';
end;
$$;

create trigger case_game_content_versions_immutable
before update or delete on public.case_game_content_versions
for each row execute function public.prevent_protected_game_version_mutation();

-- Returns only IDs and timestamps. The browser binds its strict Full Draft result
-- to this exact snapshot; publish rejects it if any latest revision subsequently changes.
create function public.research_admin_game_draft_manifest(target_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if not exists (select 1 from public.cases c where c.id = target_case_id) then raise exception 'case not found' using errcode = 'P0002'; end if;
  select jsonb_build_object(
    'setup_revision_id', (select d.id from public.case_game_setup_draft_revisions d where d.case_id=target_case_id order by d.created_at desc,d.id desc limit 1),
    'resource_revision_id', (select d.id from public.case_game_resource_draft_revisions d where d.case_id=target_case_id order by d.created_at desc,d.id desc limit 1),
    'missions', coalesce((select jsonb_agg(jsonb_build_object('mission_type',x.mission_type,'slot_number',x.slot_number,'revision_id',x.id)
      order by case x.mission_type when 'daily' then 1 when 'wild' then 2 else 3 end,x.slot_number)
      from (select distinct on (d.mission_type,d.slot_number) d.id,d.mission_type,d.slot_number
        from public.case_game_mission_draft_revisions d where d.case_id=target_case_id
        order by d.mission_type,d.slot_number,d.created_at desc,d.id desc) x), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create function public.research_admin_game_publish_status(target_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  select jsonb_build_object('version',v.version,'published_at',v.published_at,
    'source_setup_revision_id',v.source_setup_revision_id,'source_resource_revision_id',v.source_resource_revision_id,
    'source_mission_revision_manifest',v.source_mission_revision_manifest)
  into result from public.case_game_content_versions v where v.case_id=target_case_id order by v.version desc limit 1;
  return result;
end;
$$;

create function public.research_admin_publish_game_draft(target_case_id uuid, validated_revision_manifest jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  case_row public.cases%rowtype; setup_row public.case_game_setup_draft_revisions%rowtype;
  resource_row public.case_game_resource_draft_revisions%rowtype; current_manifest jsonb;
  mission_manifest jsonb; daily jsonb; wild jsonb; crisis jsonb; clean_config jsonb;
  next_version integer; version_id uuid; published_time timestamptz := clock_timestamp();
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_case_id is null then raise exception 'case ID is required' using errcode = '22023'; end if;
  select * into case_row from public.cases c where c.id=target_case_id;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  if nullif(btrim(case_row.student_alias),'') is null then raise exception 'authoritative case alias is required' using errcode = '22023'; end if;

  -- Serialize publishers per case. The unique constraint remains a final concurrency guard.
  perform pg_advisory_xact_lock(hashtextextended(target_case_id::text, 0));
  current_manifest := public.research_admin_game_draft_manifest(target_case_id);
  if validated_revision_manifest is null or validated_revision_manifest <> current_manifest then
    raise exception 'saved drafts changed after Full Draft Check; run Check Full Draft again' using errcode = '40001';
  end if;

  select * into setup_row from public.case_game_setup_draft_revisions d where d.id=(current_manifest->>'setup_revision_id')::uuid and d.case_id=target_case_id;
  if not found then raise exception 'saved Game Setup is required' using errcode = '22023'; end if;
  if nullif(btrim(setup_row.setup->>'bipBriefing'),'') is null then raise exception 'a substantive BIP Briefing is required' using errcode = '22023'; end if;
  select * into resource_row from public.case_game_resource_draft_revisions d where d.id=(current_manifest->>'resource_revision_id')::uuid and d.case_id=target_case_id;
  if not found then raise exception 'saved Resource Map is required' using errcode = '22023'; end if;
  if not (resource_row.resources ? 'sections') or
     (select count(*) from jsonb_object_keys(resource_row.resources->'sections') k
       where k in ('bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity')) <> 9 or
     exists (select 1 from jsonb_each(resource_row.resources->'sections') s
       where s.key in ('bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity')
         and (jsonb_typeof(s.value->'blocks') <> 'array' or jsonb_array_length(s.value->'blocks') = 0)) then
    raise exception 'all nine substantive canonical Resource Map sections are required' using errcode = '22023';
  end if;

  mission_manifest := current_manifest->'missions';
  if jsonb_array_length(mission_manifest) <> 20
    or (select count(*) from jsonb_array_elements(mission_manifest) m where m->>'mission_type'='daily') <> 10
    or (select count(*) from jsonb_array_elements(mission_manifest) m where m->>'mission_type'='wild') <> 5
    or (select count(*) from jsonb_array_elements(mission_manifest) m where m->>'mission_type'='crisis') <> 5 then
    raise exception 'exactly 10 Daily, 5 Mystery, and 5 Crisis mission drafts are required' using errcode = '22023';
  end if;
  select jsonb_agg(d.mission order by d.slot_number) filter(where d.mission_type='daily'),
         jsonb_agg(d.mission order by d.slot_number) filter(where d.mission_type='wild'),
         jsonb_agg(d.mission order by d.slot_number) filter(where d.mission_type='crisis')
    into daily,wild,crisis
  from public.case_game_mission_draft_revisions d
  join jsonb_array_elements(mission_manifest) m on d.id=(m->>'revision_id')::uuid
  where d.case_id=target_case_id and jsonb_typeof(d.mission)='object';
  if jsonb_array_length(coalesce(daily,'[]'))<>10 or jsonb_array_length(coalesce(wild,'[]'))<>5 or jsonb_array_length(coalesce(crisis,'[]'))<>5 then
    raise exception 'every canonical mission slot must contain a JSON object' using errcode = '22023';
  end if;

  clean_config := jsonb_build_object('studentAlias',case_row.student_alias,'bipBriefing',setup_row.setup->>'bipBriefing','contentSource','supabase-protected','shuffleChoices',true);
  select coalesce(max(v.version),0)+1 into next_version from public.case_game_content_versions v where v.case_id=target_case_id;
  insert into public.case_game_content_versions(case_id,version,config,resources,daily_missions,wildcard_missions,crisis_missions,
    source_setup_revision_id,source_resource_revision_id,source_mission_revision_manifest,published_at,published_by)
  values(target_case_id,next_version,clean_config,resource_row.resources||jsonb_build_object('studentAlias',case_row.student_alias),daily,wild,crisis,
    setup_row.id,resource_row.id,mission_manifest,published_time,auth.uid()) returning id into version_id;

  insert into public.case_game_content(case_id,config,resources,daily_missions,wildcard_missions,crisis_missions,version,updated_at)
  values(target_case_id,clean_config,resource_row.resources||jsonb_build_object('studentAlias',case_row.student_alias),daily,wild,crisis,next_version,published_time)
  on conflict(case_id) do update set config=excluded.config,resources=excluded.resources,daily_missions=excluded.daily_missions,
    wildcard_missions=excluded.wildcard_missions,crisis_missions=excluded.crisis_missions,version=excluded.version,updated_at=excluded.updated_at;
  return jsonb_build_object('version',next_version,'version_id',version_id,'published_at',published_time,
    'source_setup_revision_id',setup_row.id,'source_resource_revision_id',resource_row.id,'source_mission_revision_manifest',mission_manifest);
end;
$$;

revoke all on function public.prevent_protected_game_version_mutation() from public;
revoke all on function public.research_admin_game_draft_manifest(uuid) from public;
revoke all on function public.research_admin_game_publish_status(uuid) from public;
revoke all on function public.research_admin_publish_game_draft(uuid,jsonb) from public;
grant execute on function public.research_admin_game_draft_manifest(uuid) to authenticated;
grant execute on function public.research_admin_game_publish_status(uuid) to authenticated;
grant execute on function public.research_admin_publish_game_draft(uuid,jsonb) to authenticated;

comment on table public.case_game_content_versions is 'Immutable protected game payload history. Current participant runtime remains public.case_game_content.';
comment on function public.research_admin_publish_game_draft(uuid,jsonb) is 'Atomically publishes the exact Full-Draft-validated saved revision manifest without activation, email, reminders, phase, telemetry, Qualtrics, or coach side effects.';
