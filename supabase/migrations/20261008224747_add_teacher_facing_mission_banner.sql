
-- Add an explicit teacher-facing home banner to Game Setup and protected publishing.
-- Publishing remains versioned, immutable, admin-only, and side-effect free.

create or replace function public.research_admin_publish_game_draft(target_case_id uuid, validated_revision_manifest jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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

  perform pg_advisory_xact_lock(hashtextextended(target_case_id::text, 0));
  current_manifest := public.research_admin_game_draft_manifest(target_case_id);
  if validated_revision_manifest is null or validated_revision_manifest <> current_manifest then
    raise exception 'saved drafts changed after Full Draft Check; run Check Full Draft again' using errcode = '40001';
  end if;

  select * into setup_row from public.case_game_setup_draft_revisions d
  where d.id=(current_manifest->>'setup_revision_id')::uuid and d.case_id=target_case_id;
  if not found then raise exception 'saved Game Setup is required' using errcode = '22023'; end if;
  if nullif(btrim(setup_row.setup->>'bipBriefing'),'') is null then
    raise exception 'a substantive BIP Briefing is required' using errcode = '22023';
  end if;
  if nullif(btrim(setup_row.setup->>'classroomLabel'),'') is null then
    raise exception 'a teacher-facing mission banner is required' using errcode = '22023';
  end if;

  select * into resource_row from public.case_game_resource_draft_revisions d
  where d.id=(current_manifest->>'resource_revision_id')::uuid and d.case_id=target_case_id;
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

  if jsonb_array_length(coalesce(daily,'[]'))<>10
    or jsonb_array_length(coalesce(wild,'[]'))<>5
    or jsonb_array_length(coalesce(crisis,'[]'))<>5 then
    raise exception 'every canonical mission slot must contain a JSON object' using errcode = '22023';
  end if;

  clean_config := jsonb_build_object(
    'studentAlias', case_row.student_alias,
    'classroomLabel', btrim(setup_row.setup->>'classroomLabel'),
    'bipBriefing', setup_row.setup->>'bipBriefing',
    'contentSource', 'supabase-protected',
    'shuffleChoices', true
  );

  select coalesce(max(v.version),0)+1 into next_version
  from public.case_game_content_versions v where v.case_id=target_case_id;

  insert into public.case_game_content_versions(
    case_id,version,config,resources,daily_missions,wildcard_missions,crisis_missions,
    source_setup_revision_id,source_resource_revision_id,source_mission_revision_manifest,published_at,published_by
  )
  values(
    target_case_id,next_version,clean_config,
    resource_row.resources||jsonb_build_object('studentAlias',case_row.student_alias),
    daily,wild,crisis,setup_row.id,resource_row.id,mission_manifest,published_time,auth.uid()
  )
  returning id into version_id;

  insert into public.case_game_content(
    case_id,config,resources,daily_missions,wildcard_missions,crisis_missions,version,updated_at
  )
  values(
    target_case_id,clean_config,
    resource_row.resources||jsonb_build_object('studentAlias',case_row.student_alias),
    daily,wild,crisis,next_version,published_time
  )
  on conflict(case_id) do update set
    config=excluded.config,
    resources=excluded.resources,
    daily_missions=excluded.daily_missions,
    wildcard_missions=excluded.wildcard_missions,
    crisis_missions=excluded.crisis_missions,
    version=excluded.version,
    updated_at=excluded.updated_at;

  return jsonb_build_object(
    'version',next_version,'version_id',version_id,'published_at',published_time,
    'source_setup_revision_id',setup_row.id,'source_resource_revision_id',resource_row.id,
    'source_mission_revision_manifest',mission_manifest
  );
end;
$function$;

revoke all on function public.research_admin_publish_game_draft(uuid,jsonb) from public;
grant execute on function public.research_admin_publish_game_draft(uuid,jsonb) to authenticated;
