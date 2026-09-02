import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { dashboardCaseCounts, visibleDashboardCases } from './operations-model.mjs';

const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./admin.css',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260902030000_research_admin_test_case_navigation.sql',import.meta.url),'utf8');
const isolation=fs.readFileSync(new URL('../supabase/migrations/20260902010000_participant_setup_readiness.sql',import.meta.url),'utf8');

const real={id:'real',study_id:'MR-101',current_phase:'intervention',case_active:true,participant_active:true,archived_at:null,is_test:false};
const archived={...real,id:'archived',study_id:'MR-102',archived_at:'2026-08-27T00:00:00Z'};
const fake={...real,id:'test',study_id:'MR-998',is_test:true};
const archivedFake={...fake,id:'archived-test',study_id:'MR-997',archived_at:'2026-08-27T00:00:00Z'};

test('default and opt-in filters keep test and archived dimensions distinct',()=>{
  assert.deepEqual(visibleDashboardCases([real,archived],[fake,archivedFake]).map(x=>x.id),['real']);
  assert.deepEqual(visibleDashboardCases([real,archived],[fake,archivedFake],{showTest:true}).map(x=>x.id),['real','test']);
  assert.deepEqual(visibleDashboardCases([real,archived],[fake,archivedFake],{showArchived:true}).map(x=>x.id),['real','archived']);
  assert.deepEqual(visibleDashboardCases([real,archived],[fake,archivedFake],{showArchived:true,showTest:true}).map(x=>x.id),['real','archived','test','archived-test']);
  assert.deepEqual(dashboardCaseCounts([real,archived]),{intervention:1});
});

test('Study Cases provides an explicit test toggle, unmistakable label, and normal case opening',()=>{
  assert.match(html,/id="archived-cases-toggle"[\s\S]*id="test-cases-toggle"[^>]*>Show test cases<\/button>/);
  assert.match(admin,/test-participant-badge">TEST PARTICIPANT/);
  assert.match(css,/\.study-card\.test-case\{[^}]*border:3px solid/);
  assert.match(admin,/class="primary open-case" data-case=/);
  assert.match(admin,/research_admin_operations_dashboard',\{target_case_id:case_id\}/);
  assert.match(admin,/research_admin_observation_dashboard',\{target_case_id:case_id\}/);
});

test('navigation RPC is researcher-only and aggregate/reminder isolation remains intact',()=>{
  assert.match(migration,/if not public\.is_research_admin\(\)/);
  assert.match(migration,/where p\.is_test/);
  assert.match(migration,/revoke all on function public\.research_admin_test_case_ids\(\) from public, anon/);
  assert.doesNotMatch(migration,/research_admin_operations_dashboard|research_admin_observation_dashboard|eligible_teacher_reminders/);
  assert.match(isolation,/target_case_id is null and not p\.is_test/);
  assert.match(isolation,/target_case_id is null and not participant\.is_test/);
  assert.match(isolation,/where trs\.enabled and not p\.is_test/);
});
