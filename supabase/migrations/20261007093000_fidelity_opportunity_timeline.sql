-- Timestamped opportunity-level fidelity logging.
alter table public.research_observation_records_v2
  add column if not exists fidelity_opportunities jsonb not null default '[]'::jsonb;
alter table public.observer_training_attempts
  add column if not exists fidelity_opportunities jsonb not null default '[]'::jsonb;

create or replace function public.research_observer_get_fidelity_opportunities(target_slot_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_observer_id uuid; result jsonb;
begin
 select a.observer_id into current_observer_id
 from public.research_observer_accounts a
 where a.auth_user_id=auth.uid() and a.active=true limit 1;
 if current_observer_id is null then raise exception 'active observer account required' using errcode='42501'; end if;
 select r.fidelity_opportunities into result
 from public.research_observation_records_v2 r
 where r.slot_id=target_slot_id and r.observer_id=current_observer_id;
 if result is null then raise exception 'observation record not found' using errcode='P0002'; end if;
 return result;
end $$;

create or replace function public.research_observer_save_fidelity_opportunities(target_slot_id uuid,target_fidelity_opportunities jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_observer_id uuid; slot public.research_observation_schedule_slots%rowtype; record public.research_observation_records_v2%rowtype; item jsonb;
begin
 select a.observer_id into current_observer_id
 from public.research_observer_accounts a
 where a.auth_user_id=auth.uid() and a.active=true limit 1;
 if current_observer_id is null then raise exception 'active observer account required' using errcode='42501'; end if;
 select * into slot from public.research_observation_schedule_slots where id=target_slot_id;
 if slot.id is null then raise exception 'observation session not found' using errcode='P0002'; end if;
 if current_observer_id<>slot.primary_observer_id and current_observer_id is distinct from slot.secondary_observer_id then raise exception 'this observation session is not assigned to you' using errcode='42501'; end if;
 if slot.status not in ('scheduled','confirmed') then raise exception 'this session is no longer open for collection' using errcode='55000'; end if;
 if jsonb_typeof(target_fidelity_opportunities)<>'array' or jsonb_array_length(target_fidelity_opportunities)>300 then raise exception 'invalid fidelity opportunities' using errcode='22023'; end if;
 select * into record from public.research_observation_records_v2 r
 where r.slot_id=target_slot_id and r.observer_id=current_observer_id and r.status='draft';
 if record.id is null then raise exception 'active observation draft not found' using errcode='P0002'; end if;
 for item in select value from jsonb_array_elements(target_fidelity_opportunities) loop
   if nullif(item->>'event_id','') is null
      or nullif(item->>'target_id','') is null
      or (item->>'elapsed_seconds')::int not between 0 and 1800
      or item->>'implementation' not in ('implemented','not_implemented')
      or coalesce(item->>'desired_outcome','') not in ('','yes','no','unclear')
   then raise exception 'invalid fidelity opportunity event' using errcode='22023'; end if;
   if not exists(select 1 from jsonb_array_elements(record.fidelity_target_snapshot) t where t->>'id'=item->>'target_id')
   then raise exception 'fidelity opportunity does not match assigned checklist' using errcode='22023'; end if;
 end loop;
 update public.research_observation_records_v2
 set fidelity_opportunities=target_fidelity_opportunities,updated_at=now()
 where id=record.id returning * into record;
 return jsonb_build_object('id',record.id,'fidelity_opportunities',record.fidelity_opportunities);
end $$;

revoke all on function public.research_observer_get_fidelity_opportunities(uuid) from public,anon;
revoke all on function public.research_observer_save_fidelity_opportunities(uuid,jsonb) from public,anon;
grant execute on function public.research_observer_get_fidelity_opportunities(uuid) to authenticated,service_role;
grant execute on function public.research_observer_save_fidelity_opportunities(uuid,jsonb) to authenticated,service_role;
