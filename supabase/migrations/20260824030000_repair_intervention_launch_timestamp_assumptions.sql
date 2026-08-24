-- Repair intervention access updates for the deployed legacy table shape.
create or replace function public.research_admin_set_intervention_game_access(target_case_id uuid, target_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target_participant_id uuid; content_version integer; changed timestamptz:=now(); reminders_were_enabled boolean:=false; result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext(target_case_id::text));
  if target_enabled then
    select r.participant_id,r.protected_content_version into target_participant_id,content_version
    from public.research_admin_assert_intervention_launch_ready(target_case_id) r;
  else
    if not exists(select 1 from public.cases where id=target_case_id) then raise exception 'case not found' using errcode='P0002'; end if;
    if (select count(*) from public.participants where case_id=target_case_id) <> 1 then raise exception 'Exactly one study participant must be linked to the case.' using errcode='55000'; end if;
    select p.id,gc.version into target_participant_id,content_version from public.participants p left join public.case_game_content gc on gc.case_id=p.case_id where p.case_id=target_case_id for update of p;
  end if;

  -- The deployed cases table has no updated_at column. The launch event below is
  -- the authoritative timestamp for this state change.
  update public.cases set active=target_enabled where id=target_case_id;

  -- Fresh replays define participants.updated_at, while the legacy deployed
  -- shape may not. Update it only when the actual table exposes that column.
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='participants' and column_name='updated_at'
  ) then
    execute 'update public.participants set active=$1,updated_at=$2 where id=$3'
    using target_enabled,changed,target_participant_id;
  else
    update public.participants set active=target_enabled where id=target_participant_id;
  end if;

  if not target_enabled then
    select coalesce(rs.enabled,false) into reminders_were_enabled from public.teacher_reminder_settings rs where rs.participant_id=target_participant_id;
    update public.teacher_reminder_settings set enabled=false,deactivated_at=changed
    where participant_id=target_participant_id and enabled;
    if reminders_were_enabled then
      insert into public.research_intervention_launch_events(case_id,participant_id,action,actor,recorded_at,protected_content_version)
      values(target_case_id,target_participant_id,'reminders_disabled',auth.uid(),changed,content_version);
    end if;
  end if;
  insert into public.research_intervention_launch_events(case_id,participant_id,action,actor,recorded_at,protected_content_version)
  values(target_case_id,target_participant_id,case when target_enabled then 'game_access_enabled' else 'game_access_disabled' end,auth.uid(),changed,content_version);
  select jsonb_build_object('case_active',c.active,'participant_active',p.active,'changed_at',changed) into result
  from public.cases c join public.participants p on p.case_id=c.id where c.id=target_case_id;
  return result;
end $$;

revoke all on function public.research_admin_set_intervention_game_access(uuid,boolean) from public, anon;
grant execute on function public.research_admin_set_intervention_game_access(uuid,boolean) to authenticated;
