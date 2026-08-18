-- Structured, version-bound Mission Bank Comparability Review evidence.
-- This migration does not modify protected content or activate any study feature.

create table public.mission_bank_comparability_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  protected_content_version integer not null check (protected_content_version > 0),
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  criteria jsonb not null,
  overall_notes text check (overall_notes is null or char_length(overall_notes) <= 2000),
  all_pass boolean not null
);

create index mission_bank_comparability_reviews_lookup
on public.mission_bank_comparability_reviews(case_id, protected_content_version, reviewed_at desc);

alter table public.mission_bank_comparability_reviews enable row level security;
revoke all on table public.mission_bank_comparability_reviews from anon, authenticated;
grant select on table public.mission_bank_comparability_reviews to authenticated;
create policy "Research admins read comparability reviews"
on public.mission_bank_comparability_reviews for select to authenticated
using ((select public.is_research_admin()));

-- Keep the three Resource Map checks unchanged, but close the old comparability bypass.
create or replace function public.research_admin_record_case_signoff(
  target_case_id uuid,
  target_protected_content_version integer,
  target_review_type text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare current_version integer; new_signoff_id uuid;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode = '42501';
  end if;
  if target_review_type = 'mission_bank_comparability' then
    raise exception 'Mission bank comparability must be completed through the structured comparability review.' using errcode = '22023';
  end if;
  if target_review_type not in (
    'resource_behavior_review', 'resource_privacy_review', 'resource_qa_preview'
  ) then raise exception 'invalid review type' using errcode = '22023'; end if;

  select gc.version into current_version from public.case_game_content gc
  where gc.case_id = target_case_id for share;
  if not found then raise exception 'protected content not found' using errcode = 'P0002'; end if;
  if target_protected_content_version is distinct from current_version then
    raise exception 'protected content version changed; reload readiness before signing' using errcode = '22023';
  end if;
  insert into public.case_protected_content_signoffs(case_id, protected_content_version, review_type, reviewed_by)
  values (target_case_id, current_version, target_review_type, auth.uid()) returning id into new_signoff_id;
  return new_signoff_id;
end;
$$;

create function public.research_admin_submit_mission_bank_comparability_review(
  target_case_id uuid,
  target_protected_content_version integer,
  submitted_criteria jsonb,
  submitted_overall_notes text default null,
  final_confirmation boolean default false
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  expected_keys constant text[] := array[
    'consistent_structure', 'same_instructional_purpose',
    'comparable_decision_difficulty', 'comparable_feedback_support',
    'bip_alignment', 'target_representation', 'context_not_dose',
    'crisis_safety_boundaries', 'overall_comparability'
  ];
  current_version integer; criterion_key text; criterion jsonb;
  calculated_all_pass boolean := true; daily_count integer; mystery_count integer; crisis_count integer;
  new_review_id uuid; new_signoff_id uuid; normalized_notes text;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;

  select gc.version, coalesce(jsonb_array_length(gc.daily_missions), 0),
    coalesce(jsonb_array_length(gc.wildcard_missions), 0),
    coalesce(jsonb_array_length(gc.crisis_missions), 0)
  into current_version, daily_count, mystery_count, crisis_count
  from public.case_game_content gc where gc.case_id = target_case_id for share;
  if not found then raise exception 'protected content not found' using errcode = 'P0002'; end if;
  if target_protected_content_version is distinct from current_version then
    raise exception 'protected content version changed; reload readiness before reviewing' using errcode = '22023';
  end if;
  if jsonb_typeof(submitted_criteria) is distinct from 'object' or
     (select array_agg(key order by key) from jsonb_object_keys(submitted_criteria) key)
       is distinct from (select array_agg(key order by key) from unnest(expected_keys) key) then
    raise exception 'exactly all nine comparability criterion keys are required' using errcode = '22023';
  end if;

  foreach criterion_key in array expected_keys loop
    criterion := submitted_criteria -> criterion_key;
    if jsonb_typeof(criterion) is distinct from 'object'
       or not (criterion ? 'status')
       or criterion - array['status', 'note'] <> '{}'::jsonb
       or jsonb_typeof(criterion->'status') is distinct from 'string'
       or criterion->>'status' not in ('pass', 'revise')
       or (criterion ? 'note' and jsonb_typeof(criterion->'note') not in ('string', 'null'))
       or char_length(coalesce(criterion->>'note', '')) > 1000 then
      raise exception 'invalid comparability criterion: %', criterion_key using errcode = '22023';
    end if;
    calculated_all_pass := calculated_all_pass and criterion->>'status' = 'pass';
  end loop;
  normalized_notes := nullif(btrim(submitted_overall_notes), '');
  if char_length(coalesce(normalized_notes, '')) > 2000 then
    raise exception 'overall notes must be 2000 characters or fewer' using errcode = '22023';
  end if;
  if calculated_all_pass and (daily_count <> 10 or mystery_count <> 5 or crisis_count <> 5) then
    raise exception 'Mission bank incomplete: Daily %/10, Mystery %/5, Crisis %/5', daily_count, mystery_count, crisis_count using errcode = '22023';
  end if;
  if calculated_all_pass and final_confirmation is not true then
    raise exception 'explicit final confirmation is required for an all-Pass review' using errcode = '22023';
  end if;

  insert into public.mission_bank_comparability_reviews(
    case_id, protected_content_version, reviewed_by, criteria, overall_notes, all_pass
  ) values (target_case_id, current_version, auth.uid(), submitted_criteria, normalized_notes, calculated_all_pass)
  returning id into new_review_id;

  if calculated_all_pass then
    insert into public.case_protected_content_signoffs(case_id, protected_content_version, review_type, reviewed_by)
    values (target_case_id, current_version, 'mission_bank_comparability', auth.uid())
    returning id into new_signoff_id;
  end if;
  return jsonb_build_object('review_id', new_review_id, 'all_pass', calculated_all_pass,
    'finalized', new_signoff_id is not null, 'signoff_created', new_signoff_id is not null,
    'protected_content_version', current_version, 'daily_count', daily_count,
    'mystery_count', mystery_count, 'crisis_count', crisis_count);
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
        when coalesce(gc.resources->'schemaVersion' = '1'::jsonb, false) is not true or coalesce(gc.resources->'sections' ?& array['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity'], false) is not true then 'Needs content'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review') then 'Needs behavioral review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review') then 'Needs privacy review'
        when not exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview') then 'Needs QA' else 'Ready' end,
      'behavior_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_behavior_review'),
      'privacy_reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_privacy_review'),
      'qa_previewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'resource_qa_preview')
    ) end,
    'mission_bank_comparability', jsonb_build_object(
      'status', case
        when exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'mission_bank_comparability') then 'Ready'
        when exists (select 1 from public.mission_bank_comparability_reviews r where r.case_id = c.id and r.protected_content_version = gc.version and not r.all_pass) then 'Revisions identified'
        else 'Needs review' end,
      'reviewed', exists (select 1 from public.case_protected_content_signoffs s where s.case_id = c.id and s.protected_content_version = gc.version and s.review_type = 'mission_bank_comparability'),
      'daily_count', coalesce(jsonb_array_length(gc.daily_missions), 0), 'mystery_count', coalesce(jsonb_array_length(gc.wildcard_missions), 0),
      'crisis_count', coalesce(jsonb_array_length(gc.crisis_missions), 0),
      'complete_bank', gc.case_id is not null and jsonb_array_length(gc.daily_missions) = 10 and jsonb_array_length(gc.wildcard_missions) = 5 and jsonb_array_length(gc.crisis_missions) = 5,
      'history', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'protected_content_version', h.protected_content_version,
        'reviewed_at', h.reviewed_at, 'reviewer', coalesce(pr.display_name, 'Research admin'), 'criteria', h.criteria, 'all_pass', h.all_pass)
        order by h.reviewed_at desc) from public.mission_bank_comparability_reviews h left join public.profiles pr on pr.id = h.reviewed_by where h.case_id = c.id), '[]'::jsonb)
    ),
    'reminders', (select jsonb_build_object('enabled', rs.enabled) from public.teacher_reminder_settings rs where rs.participant_id = p.id)
  ) into result
  from public.intake_requests i join public.cases c on c.id = i.converted_case_id
  left join public.participants p on p.case_id = c.id left join public.case_game_content gc on gc.case_id = c.id
  where i.request_id = target_request_id and i.status = 'converted';
  if result is null then raise exception 'converted intake readiness not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;

revoke all on function public.research_admin_submit_mission_bank_comparability_review(uuid, integer, jsonb, text, boolean) from public;
grant execute on function public.research_admin_submit_mission_bank_comparability_review(uuid, integer, jsonb, text, boolean) to authenticated;

comment on table public.mission_bank_comparability_reviews is 'Append-only, research-admin-only structured review attempts; notes must not contain protected BIP content.';
comment on function public.research_admin_submit_mission_bank_comparability_review(uuid, integer, jsonb, text, boolean) is 'Validates and records the nine human comparability judgments; only a confirmed all-Pass complete 10/5/5 bank receives the existing version-bound signoff.';
