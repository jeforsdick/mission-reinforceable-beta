-- Keep live observations tied to a 30-minute wall-clock window.
-- Review/submission may occur later, but canonical observation timing must not stretch.

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
    -- A live observation is always a 30-minute wall-clock session.
    new.collection_ended_at := new.started_at + interval '30 minutes';

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
