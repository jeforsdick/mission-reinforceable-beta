import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const repair=await readFile(new URL('../supabase/migrations/20260824020000_repair_intervention_launch_uuid_aggregation.sql',import.meta.url),'utf8');
const launchMigration=await readFile(new URL('../supabase/migrations/20260824010000_phase_gated_intervention_launch.sql',import.meta.url),'utf8');
const activeLaunchSql=`${repair}\n${launchMigration.slice(launchMigration.indexOf('create function public.research_admin_set_intervention_game_access'))}`;

test('launch readiness resolves its single participant without UUID aggregation',()=>{
  assert.match(repair,/create or replace function public\.research_admin_assert_intervention_launch_ready\(target_case_id uuid, target_actor_id uuid default auth\.uid\(\)\)/);
  assert.doesNotMatch(repair,/\b(?:min|max)\s*\(\s*p\.(?:id|auth_user_id)\s*\)/i);
  assert.match(repair,/select count\(\*\) into participant_count[\s\S]*?from public\.participants p where p\.case_id=target_case_id;/);
  assert.match(repair,/if participant_count <> 1 then raise exception 'Exactly one study participant must be linked to the case\.'[\s\S]*?select p\.id, p\.auth_user_id into found_participant_id, teacher_id[\s\S]*?limit 1;/);
});

test('active intervention launch RPCs contain no UUID min/max aggregation',()=>{
  assert.doesNotMatch(activeLaunchSql,/\b(?:min|max)\s*\(\s*(?:p\.)?(?:id|auth_user_id|case_id|participant_id|actor)\s*\)/i);
});

test('UUID repair preserves every intervention launch readiness gate and return contract',()=>{
  assert.match(repair,/pr\.role='research_admin' and pr\.active/);
  assert.match(repair,/coalesce\(current_phase,'prebaseline'\) <> 'intervention'/);
  assert.match(repair,/Current published game content is required\./);
  for(const review of ['resource_behavior_review','resource_privacy_review','resource_qa_preview']){
    assert.match(repair,new RegExp(`protected_content_version=current_version and s.review_type='${review}'`));
  }
  assert.match(repair,/item_key='intervention_orientation'[\s\S]*coalesce\(orientation_status,'pending'\) <> 'complete'/);
  assert.match(repair,/pr\.id=teacher_id and pr\.active and pr\.role='teacher'/);
  assert.match(repair,/returns table\(participant_id uuid, protected_content_version integer\)/);
  assert.match(repair,/participant_id:=found_participant_id; protected_content_version:=current_version; return next;/);
});
