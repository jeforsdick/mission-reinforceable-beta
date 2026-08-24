-- Explicit, phase-gated intervention launch. Publishing and QA preview remain separate.
create table public.research_intervention_launch_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  action text not null check (action in ('game_access_enabled','game_access_disabled','reminders_enabled','reminders_disabled')),
  actor uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  protected_content_version integer
);

create index research_intervention_launch_events_case_idx
on public.research_intervention_launch_events(case_id, recorded_at desc);

create trigger research_intervention_launch_events_immutable
before update or delete on public.research_intervention_launch_events
for each row execute function public.prevent_research_operations_delete();

alter table public.research_intervention_launch_events enable row level security;
revoke all on table public.research_intervention_launch_events from anon, authenticated;
grant select on table public.research_intervention_launch_events to authenticated;
create policy "Research admins read intervention launch events"
on public.research_intervention_launch_events for select to authenticated
using ((select public.is_research_admin()));

create function public.research_admin_assert_intervention_launch_ready(target_case_id uuid, target_actor_id uuid default auth.uid())
returns table(participant_id uuid, protected_content_version integer)
language plpgsql stable security definer set search_path='' as $$
declare participant_count integer; current_phase text; orientation_status text; teacher_id uuid; found_participant_id uuid; current_version integer;
begin
  if not exists(select 1 from public.profiles pr where pr.id=target_actor_id and pr.role='research_admin' and pr.active) then raise exception 'research admin required' using errcode='42501'; end if;
  if not exists(select 1 from public.cases c where c.id=target_case_id) then raise exception 'case not found' using errcode='P0002'; end if;
  select count(*), min(p.id), min(p.auth_user_id) into participant_count, found_participant_id, teacher_id
  from public.participants p where p.case_id=target_case_id;
  if participant_count <> 1 then raise exception 'Exactly one study participant must be linked to the case.' using errcode='55000'; end if;
  select pe.phase into current_phase from public.research_case_phase_events pe where pe.case_id=target_case_id
  order by pe.effective_date desc, pe.recorded_at desc, pe.id desc limit 1;
  if coalesce(current_phase,'prebaseline') <> 'intervention' then raise exception 'Game access can only be enabled during Intervention.' using errcode='55000'; end if;
  select gc.version into current_version from public.case_game_content gc where gc.case_id=target_case_id;
  if current_version is null then raise exception 'Current published game content is required.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_behavior_review') then raise exception 'Current published version requires Behavior Review.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_privacy_review') then raise exception 'Current published version requires Privacy Review.' using errcode='55000'; end if;
  if not exists(select 1 from public.case_protected_content_signoffs s where s.case_id=target_case_id and s.protected_content_version=current_version and s.review_type='resource_qa_preview') then raise exception 'Current published version requires QA Preview Review.' using errcode='55000'; end if;
  select e.status into orientation_status from public.research_protocol_checklist_events e
  where e.case_id=target_case_id and e.item_key='intervention_orientation' order by e.recorded_at desc,e.id desc limit 1;
  if coalesce(orientation_status,'pending') <> 'complete' then raise exception 'Intervention orientation must be complete.' using errcode='55000'; end if;
  if teacher_id is null or not exists(select 1 from public.profiles pr where pr.id=teacher_id and pr.active and pr.role='teacher')
    then raise exception 'An active teacher account is required.' using errcode='55000'; end if;
  participant_id:=found_participant_id; protected_content_version:=current_version; return next;
end $$;
revoke all on function public.research_admin_assert_intervention_launch_ready(uuid,uuid) from public, anon, authenticated;

create function public.research_admin_set_intervention_game_access(target_case_id uuid, target_enabled boolean)
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
  update public.cases set active=target_enabled,updated_at=changed where id=target_case_id;
  update public.participants set active=target_enabled,updated_at=changed where id=target_participant_id;
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

create function public.research_admin_set_teacher_reminders(target_case_id uuid, target_enabled boolean, target_actor_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target_participant_id uuid; content_version integer; changed timestamptz:=now(); was_enabled boolean:=false;
begin
  if not exists(select 1 from public.profiles pr where pr.id=target_actor_id and pr.role='research_admin' and pr.active) then raise exception 'research admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext(target_case_id::text));
  if target_enabled then
    select r.participant_id,r.protected_content_version into target_participant_id,content_version from public.research_admin_assert_intervention_launch_ready(target_case_id,target_actor_id) r;
    if not exists(select 1 from public.cases c join public.participants p on p.case_id=c.id where c.id=target_case_id and p.id=target_participant_id and c.active and p.active)
      then raise exception 'Game access must be active before reminders can be enabled.' using errcode='55000'; end if;
  else
    if (select count(*) from public.participants where case_id=target_case_id) <> 1 then raise exception 'Exactly one study participant must be linked to the case.' using errcode='55000'; end if;
    select p.id,gc.version into target_participant_id,content_version from public.participants p left join public.case_game_content gc on gc.case_id=p.case_id where p.case_id=target_case_id;
  end if;
  select enabled into was_enabled from public.teacher_reminder_settings where participant_id=target_participant_id;
  insert into public.teacher_reminder_settings(participant_id,enabled,activated_at,deactivated_at)
  values(target_participant_id,target_enabled,case when target_enabled then changed end,case when not target_enabled then changed end)
  on conflict(participant_id) do update set enabled=excluded.enabled,
    activated_at=case when excluded.enabled and not public.teacher_reminder_settings.enabled then changed else public.teacher_reminder_settings.activated_at end,
    deactivated_at=case when excluded.enabled then null else changed end;
  insert into public.research_intervention_launch_events(case_id,participant_id,action,actor,recorded_at,protected_content_version)
  values(target_case_id,target_participant_id,case when target_enabled then 'reminders_enabled' else 'reminders_disabled' end,target_actor_id,changed,content_version);
  return jsonb_build_object('enabled',target_enabled,'changed_at',changed);
end $$;

revoke all on function public.research_admin_set_intervention_game_access(uuid,boolean) from public, anon;
grant execute on function public.research_admin_set_intervention_game_access(uuid,boolean) to authenticated;
revoke all on function public.research_admin_set_teacher_reminders(uuid,boolean,uuid) from public, anon, authenticated;
grant execute on function public.research_admin_set_teacher_reminders(uuid,boolean,uuid) to service_role;

comment on table public.research_intervention_launch_events is 'Append-only operational audit of access/reminder state changes; contains no message content.';
