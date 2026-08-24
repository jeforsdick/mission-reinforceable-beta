import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftRevisionManifest, renderGameCreation, sameDraftRevisionManifest } from './game-creation-ui.mjs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20260824000000_protected_game_publishing.sql', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('./game-creation-ui.mjs', import.meta.url), 'utf8');
const signoffs = fs.readFileSync(new URL('../supabase/migrations/20260819020000_research_admin_cleanup_2a.sql', import.meta.url), 'utf8');

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

test('draft revision manifests compare semantically without depending on object or mission order', () => {
  const expected = {
    setup_revision_id: 'setup-1',
    resource_revision_id: 'resource-1',
    missions: [
      { mission_type: 'daily', slot_number: 1, revision_id: 'daily-1' },
      { mission_type: 'wild', slot_number: 2, revision_id: 'wild-2' },
      { mission_type: 'crisis', slot_number: 1, revision_id: 'crisis-1' }
    ]
  };
  const reorderedKeys = {
    missions: expected.missions.map(({ mission_type, slot_number, revision_id }) => ({ revision_id, slot_number: String(slot_number), mission_type })),
    resource_revision_id: 'resource-1',
    setup_revision_id: 'setup-1'
  };
  const reorderedMissions = { ...reorderedKeys, missions: [...reorderedKeys.missions].reverse() };

  assert.equal(sameDraftRevisionManifest(expected, reorderedKeys), true);
  assert.equal(sameDraftRevisionManifest(expected, reorderedMissions), true);
});

test('draft revision manifest comparison detects every protected source change', () => {
  const manifest = {
    setup_revision_id: 'setup-1',
    resource_revision_id: 'resource-1',
    missions: [
      { mission_type: 'daily', slot_number: 1, revision_id: 'daily-1' },
      { mission_type: 'wild', slot_number: 2, revision_id: 'wild-2' }
    ]
  };
  const changed = update => structuredClone(Object.assign(structuredClone(manifest), update));

  assert.equal(sameDraftRevisionManifest(manifest, changed({ setup_revision_id: 'setup-2' })), false);
  assert.equal(sameDraftRevisionManifest(manifest, changed({ resource_revision_id: 'resource-2' })), false);
  const changedRevision = changed({}); changedRevision.missions[0].revision_id = 'daily-2';
  assert.equal(sameDraftRevisionManifest(manifest, changedRevision), false);
  const missingMission = changed({}); missingMission.missions.pop();
  assert.equal(sameDraftRevisionManifest(manifest, missingMission), false);
  const changedSlot = changed({}); changedSlot.missions[0].slot_number = 2;
  assert.equal(sameDraftRevisionManifest(manifest, changedSlot), false);
  const changedType = changed({}); changedType.missions[0].mission_type = 'crisis';
  assert.equal(sameDraftRevisionManifest(manifest, changedType), false);
});

test('Full Draft Check uses semantic manifest comparison and retains the server manifest', () => {
  assert.match(admin, /!sameDraftRevisionManifest\(manifest, expected\)/);
  assert.doesNotMatch(admin, /JSON\.stringify\(manifest\) !== JSON\.stringify\(expected\)/);
  assert.match(admin, /state\.validatedRevisionManifest = manifest/);
});

test('all publishing actions and previews use the real nested authoring workspace case', () => {
  for (const rpc of ['research_admin_game_authoring_workspace', 'research_admin_game_draft_manifest', 'research_admin_publish_game_draft']) {
    assert.match(admin, new RegExp(`rpc\\('${rpc}'[\\s\\S]{0,180}target_case_id: state\\.authoringWorkspace\\.case\\.id`));
  }
  assert.doesNotMatch(admin, /authoringWorkspace\.case_id/);
  assert.doesNotMatch(ui, /workspace\.(?:case_id|case_code|student_alias)\b/);
  const workspace={case:{id:'case-uuid',case_code:'CASE-998',student_alias:'AP'},setup_draft:{revision_id:'s'},resource_draft:{revision_id:'r'},missions:[]};
  const html=renderGameCreation(workspace,null,null,undefined,'',{protected_content:{present:true,version:1},resource_map:{},checklist:{},case_code:workspace.case.case_code},'',undefined,undefined,'','',{ready:true,categories:{}},{version:2,published_at:'2026-08-24T12:00:00Z'});
  assert.match(html, /id="preview-full-draft"[^>]*data-case-code="CASE-998"/);
  assert.match(html, /id="preview-published-version"[^>]*data-case-code="CASE-998"[^>]*data-content-version="2"/);
});

test('published reviews are append-only and independently bound to the exact current version', () => {
  const recordReview = signoffs.slice(signoffs.indexOf('create or replace function public.research_admin_record_case_signoff'), signoffs.indexOf('-- Replace JSON-producing functions'));
  assert.match(recordReview, /insert into public\.case_protected_content_signoffs\(case_id, protected_content_version, review_type, reviewed_by\)/);
  assert.doesNotMatch(recordReview, /(?:update|delete from) public\.case_protected_content_signoffs/i);
  assert.match(recordReview, /target_protected_content_version is distinct from current_version[\s\S]*protected content version changed/);
  for (const type of ['resource_behavior_review','resource_privacy_review','resource_qa_preview']) assert.match(signoffs, new RegExp(`protected_content_version = gc\\.version and s\\.review_type = '${type}'`));
  assert.match(signoffs, /count\(distinct s\.review_type\)=3[\s\S]*s\.protected_content_version=gc\.version/);
  assert.match(admin, /target_protected_content_version: version/);
});

test('Game Creation exposes protected publish states without launch actions', () => {
  const workspace={case:{id:'case-uuid',case_code:'CASE-998',student_alias:'AP'},missions:[]};
  const html=renderGameCreation(workspace,null,null,undefined,'',{case_code:'CASE-998',protected_content:{present:true,version:1},draft_changed:true},'',undefined,undefined,'','',{ready:true,categories:{}},null);
  assert.match(html,/PUBLISH PROTECTED VERSION/);
  assert.match(html,/Changes since v1/);
  assert.match(html,/It will NOT activate teacher access/);
  assert.doesNotMatch(html,/Send Login|Activate Teacher|Enable Reminders/);
  assert.match(html,/Reviewing protected version v1/);
  assert.equal((html.match(/data-content-version="1"/g) || []).length, 4);
});
