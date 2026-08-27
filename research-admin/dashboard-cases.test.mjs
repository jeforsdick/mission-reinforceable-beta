import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { attentionForCase } from './operations-model.mjs';
import { isActiveStudyCase, partitionStudyCases, visibleStudyCases } from './dashboard-cases.mjs';

const fixture = (overrides = {}) => ({
  id: 'active', case_code: 'CASE-DEMO-2', study_id: 'MR-DEMO-2',
  case_active: true, participant_active: true, current_phase: 'intervention',
  protocol: { planned_baseline_observations: 1 }, tasks: [], measures: [],
  study_events: [], checklist: [], observation_data: { observations: [] }, ...overrides
});

test('active cases are visible and inactive cases are hidden by default', () => {
  const active = fixture();
  const archived = fixture({ id: 'archived', case_code: 'CASE-999', study_id: 'MR-999', case_active: false });
  const cases = [archived, active];
  assert.deepEqual(visibleStudyCases(cases), [active]);
  assert.deepEqual(visibleStudyCases(cases, true), [active, archived]);
  assert.deepEqual(cases, [archived, active], 'visibility filtering does not mutate case records');
});

test('both real active flags determine current study activity without code conventions', () => {
  assert.equal(isActiveStudyCase(fixture({ case_code: 'CASE-999', study_id: 'MR-999' })), true);
  assert.equal(isActiveStudyCase(fixture({ case_code: 'CURRENT', participant_active: false })), false);
  assert.equal(isActiveStudyCase(fixture({ case_code: 'CASE-DEMO-2' })), true);
});

test('archived cases do not contribute case-level attention by default', () => {
  const active = fixture();
  const archived = fixture({ id: 'archived', case_active: false, current_phase: 'prebaseline', protocol: { planned_baseline_observations: 5 } });
  const attention = partitionStudyCases([active, archived]).active.flatMap(attentionForCase);
  assert.deepEqual(attention, attentionForCase(active));
  assert.ok(attentionForCase(archived).some(reason => reason.includes('baseline requirement')), 'fixture would add a historical warning if included');
});

test('dashboard retains opening and active demo tools while labeling revealed archives', () => {
  const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
  assert.match(js, /archived-pill\">Archived/);
  assert.match(js, /document\.querySelectorAll\('\.open-case'\)/);
  assert.match(js, /\^CASE-DEMO-/);
  assert.match(js, /visibleStudyCases\(allCases,state\.showArchivedCases\)/);
  assert.doesNotMatch(js, /case_code[^\n]*(?:CASE-999|CASE-DEMO\b)/);
  assert.doesNotMatch(fs.readFileSync(new URL('dashboard-cases.mjs', import.meta.url), 'utf8'), /\b(?:delete|update|rpc|supabase)\b/i);
});
