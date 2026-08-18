-- Version-bound, append-only human review evidence for prepared cases.
-- This migration does not activate cases, participants, or reminders.

create table public.case_protected_content_signoffs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  protected_content_version integer not null check (protected_content_version > 0),
  review_type text not null check (review_type in (
    'resource_behavior_review',
    'resource_privacy_review',
    'resource_qa_preview',
    'mission_bank_comparability'
  )),
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid not null references public.profiles(id) on delete restrict
);

create index case_protected_content_signoffs_lookup
on public.case_protected_content_signoffs(case_id, protected_content_version, review_type);

alter table public.case_protected_content_signoffs enable row level security;
revoke all on table public.case_protected_content_signoffs from anon, authenticated;
grant select on table public.case_protected_content_signoffs to authenticated;
create policy "Research admins read protected content signoffs"
on public.case_protected_content_signoffs for select to authenticated
using ((select public.is_research_admin()));

-- Append-only RPC. The explicit version prevents a researcher from accidentally
-- approving content that changed while the readiness screen was open.
create function public.research_admin_record_case_signoff(
  target_case_id uuid,
  target_protected_content_version integer,
  target_review_type text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  current_version integer;
  new_signoff_id uuid;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;
  if target_review_type not in (
    'resource_behavior_review', 'resource_privacy_review',
    'resource_qa_preview', 'mission_bank_comparability'
  ) then raise exception 'invalid review type' using errcode = '22023'; end if;

  select gc.version into current_version
  from public.case_game_content gc
  where gc.case_id = target_case_id
  for share;
  if not found then raise exception 'protected content not found' using errcode = 'P0002'; end if;
  if target_protected_content_version is distinct from current_version then
    raise exception 'protected content version changed; reload readiness before signing'
      using errcode = '22023';
  end if;

  insert into public.case_protected_content_signoffs(
    case_id, protected_content_version, review_type, reviewed_by
  ) values (
    target_case_id, current_version, target_review_type, auth.uid()
  ) returning id into new_signoff_id;
  return new_signoff_id;
end;
$$;

create or replace function public.research_admin_case_readiness(target_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'case', jsonb_build_object('id', c.id, 'case_code', c.case_code, 'student_alias', c.student_alias, 'active', c.active),
    'participant', case when p.id is null then null else jsonb_build_object('id', p.id, 'auth_user_id', p.auth_user_id, 'participant_code', p.participant_code, 'active', p.active) end,
    'intake_snapshot', exists(select 1 from public.case_intake ci where ci.case_id = c.id),
    'fidelity_target_count', (select count(*) from public.fidelity_targets ft where ft.case_id = c.id and ft.active),
    'coach', (select jsonb_build_object('coach_user_id', cc.coach_user_id, 'active', cc.active, 'primary_coach', cc.primary_coach) from public.case_coaches cc where cc.case_id = c.id and cc.active and cc.primary_coach limit 1),
    'protected_content', (select jsonb_build_object('present', true, 'version', gc.version, 'updated_at', gc.updated_at) from public.case_game_content gc where gc.case_id = c.id),
    'resource_map', case when gc.case_id is null then jsonb_build_object('status', 'Needs content') else jsonb_build_object(
      'status', case
        when coalesce(gc.resources->'schemaVersion' = '1'::jsonb, false) is not true
          or coalesce(gc.resources->'sections' ?& array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'], false) is not true then 'Needs content'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review') then 'Needs behavioral review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review') then 'Needs privacy review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview') then 'Needs QA'
        else 'Ready' end,
      'behavior_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review'),
      'privacy_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review'),
      'qa_previewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview')
    ) end,
    'mission_bank_comparability', jsonb_build_object(
      'status', case when exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'mission_bank_comparability') then 'Ready' else 'Needs review' end,
      'reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'mission_bank_comparability')
    ),
    'reminders', (select jsonb_build_object('enabled', rs.enabled) from public.teacher_reminder_settings rs where rs.participant_id = p.id)
  ) into result
  from public.intake_requests i join public.cases c on c.id = i.converted_case_id
  left join public.participants p on p.case_id = c.id
  left join public.case_game_content gc on gc.case_id = c.id
  where i.request_id = target_request_id and i.status = 'converted';
  if result is null then raise exception 'converted intake readiness not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.research_admin_record_case_signoff(uuid, integer, text) from public;
grant execute on function public.research_admin_record_case_signoff(uuid, integer, text) to authenticated;

comment on table public.case_protected_content_signoffs is
'Append-only admin review evidence. Versions ensure later protected content invalidates earlier signoffs.';
comment on function public.research_admin_record_case_signoff(uuid, integer, text) is
'Records an explicit human signoff only when the supplied protected content version is still current.';
