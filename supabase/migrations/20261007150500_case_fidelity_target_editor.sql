-- Final case-level fidelity target review before mission authoring.
-- Existing target keys remain stable; mission-linked targets cannot be deactivated.

create unique index if not exists fidelity_targets_case_target_key_uidx
  on public.fidelity_targets(case_id,target_key)
  where target_key is not null;

create or replace function public.research_admin_save_case_fidelity_targets(
  target_case_id uuid,
  target_targets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  item jsonb;
  item_domain text;
  item_description text;
  item_key text;
  item_sort integer;
  next_number integer;
  desired_keys text[] := array[]::text[];
  current_key text;
  has_crisis boolean := false;
  result jsonb;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  if target_case_id is null or not exists (
    select 1 from public.cases c where c.id=target_case_id
  ) then
    raise exception 'case not found' using errcode='P0002';
  end if;

  if target_targets is null or jsonb_typeof(target_targets) <> 'array' then
    raise exception 'targets must be a JSON array' using errcode='22023';
  end if;

  select coalesce(ci.has_crisis_plan,false)
  into has_crisis
  from public.case_intake ci
  where ci.case_id=target_case_id
  order by ci.updated_at desc,ci.id desc
  limit 1;

  for item in select value from jsonb_array_elements(target_targets)
  loop
    item_domain := lower(btrim(coalesce(item->>'domain','')));
    item_description := btrim(coalesce(item->>'description',''));
    item_key := nullif(btrim(coalesce(item->>'target_key','')), '');

    if item_domain not in ('proactive','teaching','reinforcement','response','crisis') then
      raise exception 'invalid fidelity target domain: %', item_domain using errcode='22023';
    end if;
    if item_description = '' then
      raise exception 'fidelity target description is required' using errcode='22023';
    end if;
    if length(item_description) > 1500 then
      raise exception 'fidelity target description is too long' using errcode='22023';
    end if;

    select count(*) + 1
    into item_sort
    from unnest(desired_keys) as k
    where k like item_domain || '\_%' escape '\';

    if item_key is not null then
      if item_key !~ ('^' || item_domain || '_[0-9]{2,}$') then
        raise exception 'target code % does not match domain %', item_key, item_domain using errcode='22023';
      end if;
      if not exists (
        select 1 from public.fidelity_targets ft
        where ft.case_id=target_case_id and ft.target_key=item_key
      ) then
        raise exception 'fidelity target % does not belong to this case', item_key using errcode='22023';
      end if;
    else
      select coalesce(max((substring(ft.target_key from '([0-9]+)$'))::integer),0) + 1
      into next_number
      from public.fidelity_targets ft
      where ft.case_id=target_case_id
        and ft.domain=item_domain
        and ft.target_key ~ ('^' || item_domain || '_[0-9]+$');

      item_key := item_domain || '_' || lpad(next_number::text,2,'0');
    end if;

    if item_key = any(desired_keys) then
      raise exception 'duplicate fidelity target code: %', item_key using errcode='22023';
    end if;

    if exists (
      select 1 from public.fidelity_targets ft
      where ft.case_id=target_case_id and ft.target_key=item_key
    ) then
      update public.fidelity_targets
      set description=item_description,
          sort_order=item_sort,
          active=true,
          updated_at=now()
      where case_id=target_case_id and target_key=item_key;
    else
      insert into public.fidelity_targets(case_id,domain,description,sort_order,active,target_key)
      values(target_case_id,item_domain,item_description,item_sort,true,item_key);
    end if;

    desired_keys := array_append(desired_keys,item_key);
  end loop;

  if not exists (select 1 from unnest(desired_keys) k where k like 'proactive\_%' escape '\')
     or not exists (select 1 from unnest(desired_keys) k where k like 'teaching\_%' escape '\')
     or not exists (select 1 from unnest(desired_keys) k where k like 'reinforcement\_%' escape '\')
     or not exists (select 1 from unnest(desired_keys) k where k like 'response\_%' escape '\') then
    raise exception 'final targets must include proactive, teaching, reinforcement, and response actions' using errcode='22023';
  end if;

  if has_crisis and not exists (
    select 1 from unnest(desired_keys) k where k like 'crisis\_%' escape '\'
  ) then
    raise exception 'this case has a crisis plan and needs at least one crisis fidelity target' using errcode='22023';
  end if;

  for current_key in
    select ft.target_key
    from public.fidelity_targets ft
    where ft.case_id=target_case_id
      and ft.active
      and ft.target_key is not null
      and not (ft.target_key = any(desired_keys))
  loop
    if exists (
      with latest as (
        select distinct on (d.mission_type,d.slot_number) d.mission
        from public.case_game_mission_draft_revisions d
        where d.case_id=target_case_id
        order by d.mission_type,d.slot_number,d.created_at desc,d.id desc
      )
      select 1
      from latest d
      cross join lateral jsonb_each(coalesce(d.mission->'steps','{}'::jsonb)) s
      where s.value->'meta'->>'fidelityTargetKey'=current_key
      limit 1
    ) then
      raise exception 'target % is linked to a saved mission draft; relink the mission before deactivating it', current_key using errcode='23503';
    end if;
  end loop;

  update public.fidelity_targets ft
  set active=false,updated_at=now()
  where ft.case_id=target_case_id
    and ft.active
    and ft.target_key is not null
    and not (ft.target_key = any(desired_keys));

  select coalesce(jsonb_agg(jsonb_build_object(
    'target_key',ft.target_key,
    'domain',ft.domain,
    'description',ft.description,
    'sort_order',ft.sort_order
  ) order by
    case ft.domain
      when 'proactive' then 1
      when 'teaching' then 2
      when 'reinforcement' then 3
      when 'response' then 4
      when 'crisis' then 5
      else 9
    end,
    ft.sort_order,ft.target_key
  ),'[]'::jsonb)
  into result
  from public.fidelity_targets ft
  where ft.case_id=target_case_id and ft.active;

  return result;
end
$function$;

revoke all on function public.research_admin_save_case_fidelity_targets(uuid,jsonb) from public, anon;
grant execute on function public.research_admin_save_case_fidelity_targets(uuid,jsonb) to authenticated, service_role;
