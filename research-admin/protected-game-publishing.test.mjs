import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftRevisionManifest, renderGameCreation } from './game-creation-ui.mjs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20260824000000_protected_game_publishing.sql', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('./admin.js', import.meta.url), 'utf8');

test('publishing schema is immutable, private, versioned, and transaction-safe', () => {
  assert.match(sql, /create table public\.case_game_content_versions/);
  assert.match(sql, /unique \(case_id, version\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.case_game_content_versions from anon, authenticated/);
  assert.match(sql, /protected game versions are immutable[\s\S]*before update or delete/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /coalesce\(max\(v\.version\),0\)\+1/);
  assert.match(sql, /insert into public\.case_game_content_versions[\s\S]*insert into public\.case_game_content/);
});

test('publish validates canonical source and stores the exact revision manifest', () => {
  for (const text of ['saved Game Setup is required', 'saved Resource Map is required', 'all nine substantive canonical Resource Map sections are required', 'exactly 10 Daily, 5 Mystery, and 5 Crisis', 'saved drafts changed after Full Draft Check']) assert.match(sql, new RegExp(text));
  assert.match(sql, /source_setup_revision_id[\s\S]*source_resource_revision_id[\s\S]*source_mission_revision_manifest/);
  assert.match(sql, /'contentSource','supabase-protected','shuffleChoices',true/);
  for (const forbidden of ['resultEndpoint', 'missionFiles', 'resourcesFile', 'game_folder', 'weeklyTeacherReport']) assert.doesNotMatch(sql, new RegExp(forbidden));
});

test('publishing has no launch, communication, study, or telemetry side effects', () => {
  for (const forbidden of ['participants', 'teacher_reminder', 'phase_history', 'game_sessions', 'game_responses', 'qualtrics', 'coach_assign']) assert.doesNotMatch(sql, new RegExp(`(?:insert into|update|delete from) public\\.${forbidden}`, 'i'));
  assert.doesNotMatch(sql, /update public\.cases/i);
});

test('browser binds successful strict validation to the exact latest manifest', () => {
  assert.match(admin, /validateFullDraft\(data\)[\s\S]*research_admin_game_draft_manifest/);
  assert.match(admin, /validated_revision_manifest: state\.validatedRevisionManifest/);
  assert.match(admin, /research_admin_publish_game_draft/);
  const manifest = draftRevisionManifest({ setup_draft:{revision_id:'s'}, resource_draft:{revision_id:'r'}, missions:[{mission_type:'wild',slot_number:2,revision_id:'w2'},{mission_type:'daily',slot_number:1,revision_id:'d1'}] });
  assert.deepEqual(manifest, { setup_revision_id:'s', resource_revision_id:'r', missions:[{mission_type:'daily',slot_number:1,revision_id:'d1'},{mission_type:'wild',slot_number:2,revision_id:'w2'}] });
});

test('Game Creation exposes protected publish states without launch actions', () => {
  const workspace={case_id:'c',case_code:'CASE-998',student_alias:'River',missions:[]};
  const html=renderGameCreation(workspace,null,null,undefined,'',{case_code:'CASE-998',protected_content:{present:true,version:1},draft_changed:true},'',undefined,undefined,'','',{ready:true,categories:{}},null);
  assert.match(html,/PUBLISH PROTECTED VERSION/);
  assert.match(html,/Changes since v1/);
  assert.match(html,/It will NOT activate teacher access/);
  assert.doesNotMatch(html,/Send Login|Activate Teacher|Enable Reminders/);
});
