import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { attentionForCase, dashboardCaseCounts, partitionDashboardCases } from './operations-model.mjs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260827000000_research_admin_case_archival.sql', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const fixture = (overrides={}) => ({
  id: overrides.study_id || 'current', case_code: 'CASE-001', study_id: 'MR-001',
  student_alias: 'Kai', archived_at: null, archive_reason: null,
  current_phase: 'baseline', case_active: false, participant_active: false,
  checklist: [], measures: [], tasks: [], study_events: [], phase_history: [],
  prepared_content: {}, observation_data: {observations: [], coverage: {}}, ...overrides
});

test('only archived_at determines current and archived dashboard groups', () => {
  const baselineGameOff=fixture({study_id:'MR-001',case_active:false});
  const participantOff=fixture({study_id:'MR-002',participant_active:false});
  const gameReadyHold=fixture({study_id:'MR-003',current_phase:'baseline'});
  const archived=fixture({study_id:'MR-OLD',case_active:true,participant_active:true,archived_at:'2026-08-27T00:00:00Z'});
  const groups=partitionDashboardCases([baselineGameOff,participantOff,gameReadyHold,archived]);
  assert.deepEqual(groups.current.map(x=>x.study_id),['MR-001','MR-002','MR-003']);
  assert.deepEqual(groups.archived.map(x=>x.study_id),['MR-OLD']);
});

test('archived records are omitted from attention while current baseline still warns', () => {
  const current=fixture({study_id:'MR-001'});
  const archived=fixture({study_id:'MR-OLD',archived_at:'2026-08-27T00:00:00Z'});
  assert.ok(attentionForCase(current).length>0,'inactive baseline remains legitimate attention');
  const {current:attentionCases}=partitionDashboardCases([current,archived]);
  assert.deepEqual(attentionCases.flatMap(attentionForCase),attentionForCase(current));
  assert.doesNotMatch(admin,/const all=(?:state\.operations\.cases|cases)\.flatMap/);
  assert.match(admin,/const all=current\.flatMap/);
});

test('counts exclude archived cases and preserve activation and intervention meanings', () => {
  const cases=[
    fixture({study_id:'MR-001',case_active:false,participant_active:false}),
    fixture({study_id:'MR-002',current_phase:'intervention',case_active:true,participant_active:true}),
    fixture({study_id:'MR-003',current_phase:'intervention',case_active:false,participant_active:true}),
    fixture({study_id:'MR-OLD',current_phase:'intervention',case_active:true,participant_active:true,archived_at:'2026-08-27T00:00:00Z'})
  ];
  assert.deepEqual(dashboardCaseCounts(cases),{prepared:3,intervention:1});
});

test('home offers a display-only archived toggle and labels revealed records', () => {
  assert.match(html,/id="archived-cases-toggle"[^>]*>Show archived cases<\/button>/);
  assert.match(admin,/visibleCases=state\.showArchivedCases\?\[\.\.\.current,\.\.\.archived\]:current/);
  assert.match(admin,/Hide archived cases':'Show archived cases/);
  assert.match(admin,/archivedCase\?'Archived'/);
  assert.doesNotMatch(admin,/archiveCase|unarchive|\.delete\(/i);
});

test('migration is additive, deterministic, pair-scoped, and exposes archival metadata', () => {
  assert.match(migration,/add column if not exists archived_at timestamptz null/);
  assert.match(migration,/add column if not exists archive_reason text null/);
  assert.doesNotMatch(migration,/archived_by/);
  assert.match(migration,/coalesce\(c\.archived_at, timestamptz '2026-08-27 00:00:00\+00'\)/);
  for(const [caseCode,studyId] of [['CASE-999','MR-999'],['CASE-DEMO','MR-DEMO']]) {
    assert.match(migration,new RegExp(caseCode)); assert.match(migration,new RegExp(studyId));
  }
  assert.match(migration,/c\.archived_at,c\.archive_reason/);
  assert.doesNotMatch(migration,/\bdelete\s+from\b|\btruncate\b/i);
  assert.doesNotMatch(migration,/like\s+'|~\s+'|substring|left\s*\(/i);
  assert.match(migration,/CASE-998 and CASE-DEMO-2/);
  assert.doesNotMatch(migration,/set\s+(?:active|current_phase)|participant[s]?\s+set/i);
});
