-- Capture desired-outcome ratings for live teacher-fidelity observations.
-- These ratings are stored separately from fidelity scoring and do not affect
-- the session-level fidelity percentage.

alter table public.research_observation_records_v2
  add column if not exists fidelity_outcomes jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='research_observation_records_v2_fidelity_outcomes_object'
      and conrelid='public.research_observation_records_v2'::regclass
  ) then
    alter table public.research_observation_records_v2
      add constraint research_observation_records_v2_fidelity_outcomes_object
      check (jsonb_typeof(fidelity_outcomes)='object');
  end if;
end $$;

create or replace function public.research_observer_get_fidelity_outcomes(target_slot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  result jsonb;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id=auth.uid() and a.active=true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  select * into slot
  from public.research_observation_schedule_slots
  where id=target_slot_id;

  if slot.id is null then
    raise exception 'observation session not found' using errcode='P0002';
  end if;

  if current_observer_id<>slot.primary_observer_id
     and current_observer_id is distinct from slot.secondary_observer_id then
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  select coalesce(r.fidelity_outcomes,'{}'::jsonb) into result
  from public.research_observation_records_v2 r
  where r.slot_id=target_slot_id and r.observer_id=current_observer_id;

  return coalesce(result,'{}'::jsonb);
end
$$;

create or replace function public.research_observer_save_fidelity_outcomes(
  target_slot_id uuid,
  target_fidelity_outcomes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_observer_id uuid;
  slot public.research_observation_schedule_slots%rowtype;
  record public.research_observation_records_v2%rowtype;
begin
  select a.observer_id into current_observer_id
  from public.research_observer_accounts a
  where a.auth_user_id=auth.uid() and a.active=true
  limit 1;

  if current_observer_id is null then
    raise exception 'active observer account required' using errcode='42501';
  end if;

  select * into slot
  from public.research_observation_schedule_slots
  where id=target_slot_id;

  if slot.id is null then
    raise exception 'observation session not found' using errcode='P0002';
  end if;

  if current_observer_id<>slot.primary_observer_id
     and current_observer_id is distinct from slot.secondary_observer_id then
    raise exception 'this observation session is not assigned to you' using errcode='42501';
  end if;

  if slot.status not in ('scheduled','confirmed') then
    raise exception 'this session is no longer open for collection' using errcode='55000';
  end if;

  if slot.observation_date<>(now() at time zone 'America/Denver')::date then
    raise exception 'live observation can only be collected on its scheduled date' using errcode='55000';
  end if;

  if jsonb_typeof(target_fidelity_outcomes)<>'object' then
    raise exception 'fidelity outcomes must be an object' using errcode='22023';
  end if;

  select * into record
  from public.research_observation_records_v2 r
  where r.slot_id=target_slot_id
    and r.observer_id=current_observer_id
    and r.status='draft';

  if record.id is null then
    raise exception 'active observation draft not found' using errcode='P0002';
  end if;

  if exists (
    select 1
    from jsonb_each_text(target_fidelity_outcomes) o
    where o.value not in ('yes','no','unclear')
  ) then
    raise exception 'invalid fidelity outcome' using errcode='22023';
  end if;

  if exists (
    select 1
    from jsonb_each_text(target_fidelity_outcomes) o
    where not exists (
      select 1
      from jsonb_array_elements(record.fidelity_target_snapshot) t
      where t->>'id'=o.key
    )
  ) then
    raise exception 'fidelity outcome does not match assigned checklist' using errcode='22023';
  end if;

  update public.research_observation_records_v2 r
  set fidelity_outcomes=target_fidelity_outcomes,
      updated_at=now()
  where r.id=record.id
  returning * into record;

  return jsonb_build_object(
    'id',record.id,
    'status',record.status,
    'fidelity_outcomes',record.fidelity_outcomes,
    'updated_at',record.updated_at
  );
end
$$;

create or replace function public.validate_research_observation_outcomes_on_submit()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  target_item jsonb;
  target_id text;
  score_value text;
  outcome_value text;
begin
  if new.status='submitted' and old.status is distinct from 'submitted' then
    if jsonb_typeof(new.fidelity_outcomes)<>'object' then
      raise exception 'fidelity outcomes must be an object' using errcode='22023';
    end if;

    for target_item in
      select value from jsonb_array_elements(new.fidelity_target_snapshot)
    loop
      target_id:=target_item->>'id';
      score_value:=new.fidelity_scores->>target_id;
      outcome_value:=new.fidelity_outcomes->>target_id;

      if score_value='implemented' then
        if outcome_value is null or outcome_value not in ('yes','no','unclear') then
          raise exception 'every implemented fidelity item must include a desired-outcome rating' using errcode='22023';
        end if;
      elsif outcome_value is not null then
        raise exception 'desired-outcome ratings may only be recorded for implemented fidelity items' using errcode='22023';
      end if;
    end loop;

    if exists (
      select 1
      from jsonb_each_text(new.fidelity_outcomes) o
      where not exists (
        select 1
        from jsonb_array_elements(new.fidelity_target_snapshot) t
        where t->>'id'=o.key
      )
    ) then
      raise exception 'fidelity outcome payload does not match the assigned checklist' using errcode='22023';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists validate_research_observation_outcomes_submission
on public.research_observation_records_v2;

create trigger validate_research_observation_outcomes_submission
before update of status,fidelity_scores,fidelity_outcomes
on public.research_observation_records_v2
for each row
execute function public.validate_research_observation_outcomes_on_submit();

revoke execute on function public.research_observer_get_fidelity_outcomes(uuid) from public, anon;
revoke execute on function public.research_observer_save_fidelity_outcomes(uuid,jsonb) from public, anon;
grant execute on function public.research_observer_get_fidelity_outcomes(uuid) to authenticated, service_role;
grant execute on function public.research_observer_save_fidelity_outcomes(uuid,jsonb) to authenticated, service_role;
