import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { blankMission } from './game-creation-ui.mjs';
import { canUseExampleMissionImporter, importSummary, reviewExampleMissionImport, saveExampleMissionImport, validateExampleMission } from './example-mission-importer.mjs';

const targets = [{ target_key: 'proactive_01', domain: 'proactive' }];
const workspace = { case_id: 'case-uuid', case_code: 'CASE-998', study_id: 'MR-998', active_fidelity_targets: targets, mission_drafts: [{ mission_type: 'daily', slot_number: 1, mission: { title: 'Manual Daily 1' } }] };

function canonicalMission(type = 'daily', slot = 2) {
  const mission = blankMission('CASE-998', type, slot);
  mission.title = `Mission ${type} ${slot}`; mission.routine = 'Classroom'; mission.focus = 'Practice'; mission.bipTargets = ['proactive_01'];
  mission.authoringMeta.centralTension = 'A routine changes'; mission.authoringMeta.activeBipComponents = ['Prevent'];
  for (const ending of Object.keys(mission.endings)) mission.endings[ending] = { text: `${ending} narrative`, wizard: `${ending} Wizard ending` };
  for (const [id, scene] of Object.entries(mission.steps)) {
    scene.text = `${id} scene`; scene.hint = `${id} hint`; scene.meta = { fidelityTargetKey: 'proactive_01' };
    for (const [key, choice] of Object.entries(scene.choices)) {
      choice.text = `${key} action`; choice.consequence = `${key} consequence`; choice.wizard = `${key} wizard`; choice.feedback = `${key} explanation`;
      choice.meta = { bipComponent: 'Prevent', mechanism: 'Antecedent support', errorType: key === 'A' ? 'none' : 'missed_prevention_opportunity', function: 'escape' };
    }
  }
  return mission;
}
const payload = mission => ({ schemaVersion: 1, importKind: 'mr998_example_mission_drafts', caseCode: 'CASE-998', participantCode: 'MR-998', missions: [{ missionType: 'daily', slotNumber: 2, mission }] });

test('eligibility is exact to the converted CASE-998 / MR-998 workspace', () => {
  assert.equal(canUseExampleMissionImporter(workspace), true);
  assert.equal(canUseExampleMissionImporter({ ...workspace, case_code: 'CASE-001', study_id: 'MR-001' }), false);
  assert.equal(canUseExampleMissionImporter({ ...workspace, case_code: 'CASE-DEMO-2', study_id: 'MR-DEMO-2' }), false);
  assert.equal(canUseExampleMissionImporter({ ...workspace, study_id: 'MR-997' }), false);
  assert.equal(canUseExampleMissionImporter({ case_code: 'CASE-998', study_id: 'MR-998' }), false);
});

test('valid schema and canonical mission are accepted and normalized', () => {
  const review = reviewExampleMissionImport(payload(canonicalMission()), workspace);
  assert.equal(review.valid, true); assert.equal(review.entries.length, 1); assert.equal(review.entries[0].mission.expectedSteps, 5);
  assert.deepEqual(importSummary(review, workspace), { count: 1, ranges: ['Daily: 2'], existing: [] });
});

for (const [name, change, expected] of [
  ['wrong caseCode', value => { value.caseCode = 'CASE-001'; }, /caseCode/],
  ['wrong participantCode', value => { value.participantCode = 'MR-001'; }, /participantCode/],
  ['wrong importKind', value => { value.importKind = 'other'; }, /importKind/],
  ['duplicate slots', value => { value.missions.push(structuredClone(value.missions[0])); }, /duplicate/],
  ['invalid mission type', value => { value.missions[0].missionType = 'mystery'; }, /unsupported mission type/],
  ['invalid slot', value => { value.missions[0].slotNumber = 11; }, /invalid slot/],
  ['malformed mission', value => { value.missions[0].mission = []; }, /mission must be a JSON object/],
  ['protected Daily 1', value => { value.missions[0].slotNumber = 1; }, /Daily 1 is protected/],
]) test(`${name} blocks the whole file`, () => { const value = payload(canonicalMission()); change(value); const review = reviewExampleMissionImport(value, workspace); assert.equal(review.valid, false); assert.match(review.errors.join(' '), expected); });

test('focused mission validation covers all 13 scenes and required content', () => assert.equal(validateExampleMission(canonicalMission(), targets).valid, true));
for (const [name, mutate, expected] of [
  ['missing hint', mission => { mission.steps.d1_start.hint = ''; }, /hint is required/],
  ['wrong score', mission => { mission.steps.d1_start.choices.A.score = 5; }, /score must be 10/],
  ['bad branch target', mission => { mission.steps.d1_start.choices.A.next = 'd5_supported'; }, /canonical Decision 2 state/],
  ['invalid Decision 5 ending', mission => { mission.steps.d5_supported.choices.A.ending = 'MIXED'; }, /ending must be STRONG/],
  ['invalid fidelity target link', mission => { mission.steps.d1_start.meta.fidelityTargetKey = 'proactive_99'; }, /not active for CASE-998/],
  ['unsupported error type', mission => { mission.steps.d1_start.choices.B.meta.errorType = 'made_up'; }, /unsupported error type/],
  ['unsupported function', mission => { mission.steps.d1_start.choices.B.meta.function = 'made_up'; }, /unsupported function/],
  ['unsafe content', mission => { mission.steps.d1_start.text = '<script>alert(1)</script>'; }, /Unsafe HTML/],
]) test(`${name} blocks import`, () => { const mission = canonicalMission(); mutate(mission); const review = reviewExampleMissionImport(payload(mission), workspace); assert.equal(review.valid, false); assert.match(review.errors.join(' '), expected); });

test('writes are sequential, one per mission, and stop on the first failure', async () => {
  const entries = [2, 3, 4].map(slotNumber => ({ missionType: 'daily', slotNumber, mission: canonicalMission('daily', slotNumber), label: `Daily ${slotNumber}` }));
  const calls = [], progress = [];
  const result = await saveExampleMissionImport(entries, async entry => { calls.push(entry.slotNumber); if (entry.slotNumber === 3) throw new Error('network'); }, (current, total) => progress.push([current, total]));
  assert.deepEqual(calls, [2, 3]); assert.deepEqual(progress, [[1, 3], [2, 3]]); assert.deepEqual(result.saved.map(item => item.slotNumber), [2]); assert.equal(result.failed.slotNumber, 3);
});

test('browser integration uses only the protected draft RPC and reloads the workspace', async () => {
  const source = await readFile(new URL('./admin.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function importExampleMissionDrafts()'), end = source.indexOf('\nfunction captureSetupAndResourceForms', start), body = source.slice(start, end);
  assert.match(body, /research_admin_save_mission_draft/); assert.match(body, /target_case_id:[\s\S]*target_mission_type:[\s\S]*target_slot_number:[\s\S]*target_mission:/);
  assert.match(body, /reloadAuthoringWorkspace\(\)/); assert.match(body, /selectedTab = 'game-creation'/); assert.match(body, /mission-bank/);
  assert.doesNotMatch(body, /\.from\(|service.role|insert\(|update\(|delete\(|publish|teacher|email|telemetry/i);
  assert.match(body, /Daily 1 will remain untouched/);
});

test('Mission Bank importer is rendered only for exact eligibility and above slots', async () => {
  const { renderMissionBank } = await import('./game-creation-ui.mjs');
  const html = renderMissionBank(workspace, null, {});
  assert.ok(html.indexOf('EXAMPLE GAME IMPORT') < html.indexOf('mission-slots'));
  assert.match(html, /accept="\.json,application\/json"/); assert.doesNotMatch(html, /zip/i);
  for (const denied of [{ ...workspace, case_code: 'CASE-001' }, { ...workspace, study_id: 'MR-001' }, { ...workspace, case_code: 'CASE-DEMO-2', study_id: 'MR-DEMO-2' }]) assert.doesNotMatch(renderMissionBank(denied), /EXAMPLE GAME IMPORT/);
});

test('Daily 1 is not sent and remains represented by its existing draft', () => {
  const review = reviewExampleMissionImport(payload(canonicalMission()), workspace);
  assert.equal(review.entries.some(entry => entry.missionType === 'daily' && entry.slotNumber === 1), false);
  assert.equal(workspace.mission_drafts[0].mission.title, 'Manual Daily 1');
});
