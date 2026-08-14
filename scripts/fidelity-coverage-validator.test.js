'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { loadTeacher, readManifest, validateCoverage } = require('./fidelity-coverage-validator');

const mission = (choices, meta = {}) => ({ daily: [{ id: 'mission-1', steps: { start: { meta, choices } } }], wildcard: [], crisis: [] });
const choice = bipComponent => ({ meta: { bipComponent } });

test('recognizes a valid key and warns when it is under-covered', () => {
  const report = validateCoverage(mission({ A: choice('Prevent') }, { fidelityTargetKey: 'proactive_01' }));
  assert.equal(report.targets[0].opportunities, 1);
  assert(report.warnings.some(warning => warning.rule === 'under_covered'));
});

test('rejects malformed keys and domain mismatches', () => {
  const malformed = validateCoverage(mission({ A: choice('Prevent') }, { fidelityTargetKey: 'proactive_1' }));
  const report = validateCoverage(mission({ A: choice('Prevent') }, { fidelityTargetKey: 'response_01', bipComponent: 'Teach' }));
  assert.equal(malformed.hard_errors[0].rule, 'malformed_key');
  assert.deepEqual(report.hard_errors.map(error => error.rule), ['domain_key_mismatch']);
});

test('rejects arrays and plural target-key fields as multiple targets', () => {
  const arrayReport = validateCoverage(mission({ A: choice('Prevent') }, { fidelityTargetKey: ['proactive_01', 'proactive_02'] }));
  const pluralReport = validateCoverage(mission({ A: choice('Teach') }, { fidelityTargetKeys: ['teaching_01'] }));
  assert.equal(arrayReport.hard_errors[0].rule, 'multiple_target_keys');
  assert.equal(pluralReport.hard_errors[0].rule, 'multiple_target_keys');
});

test('reports expected unused and referenced unknown targets', () => {
  const manifest = { targets: [{ target_key: 'teaching_01', domain: 'teaching' }] };
  const report = validateCoverage(mission({ A: choice('Prevent') }, { fidelityTargetKey: 'proactive_01' }), manifest);
  assert(report.warnings.some(warning => warning.rule === 'expected_unused' && warning.target_key === 'teaching_01'));
  assert(report.warnings.some(warning => warning.rule === 'unknown_target' && warning.target_key === 'proactive_01'));
});

test('warns when a target appears more than twice in one mission', () => {
  const steps = {};
  for (const id of ['one', 'two', 'three']) steps[id] = { meta: { fidelityTargetKey: 'proactive_01' }, choices: { A: choice('Prevent') } };
  const report = validateCoverage({ daily: [{ id: 'mission-1', steps }], wildcard: [], crisis: [] });
  assert(report.warnings.some(warning => warning.rule === 'over_concentrated'));
});

test('counts a decision once, ignores distractor domains, and flags legacy choice keys', () => {
  const report = validateCoverage(mission({
    A: choice('Prevent'),
    B: choice('Respond'),
    C: { meta: { bipComponent: 'Teach', fidelityTargetKey: 'proactive_01' } }
  }, { fidelityTargetKey: 'proactive_01' }));
  assert.equal(report.targets[0].opportunities, 1);
  assert.equal(report.hard_errors.length, 0);
  assert(report.warnings.some(warning => warning.rule === 'legacy_choice_level_target'));
});

test('detects the current demo-2 step-level proof annotation', () => {
  const root = path.resolve(__dirname, '..');
  const teacherDir = path.join(root, 'game/teachers/demo-2');
  const manifest = readManifest(path.join(teacherDir, 'fidelity-targets.expected.json'));
  const report = validateCoverage(loadTeacher(teacherDir), manifest, 'demo-2');
  const proactive = report.targets.find(target => target.target_key === 'proactive_01');
  assert.equal(proactive.opportunities, 1);
  assert.deepEqual(proactive.mission_ids, ['demo2-daily-long-center']);
  assert.equal(report.targets.filter(target => target.opportunities === 0).length, 4);
  assert.equal(report.hard_errors.length, 0);
});
