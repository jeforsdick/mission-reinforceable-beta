'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { loadExecutableContent, missionGroups } = require('./protected-content-loader');
const { validateStructure } = require('./structural-content-validator');

const root = path.resolve(__dirname, '..');
const builder = path.join(__dirname, 'build-protected-seed.js');
const fidelity = path.join(__dirname, 'fidelity-coverage-validator.js');

function validMission() {
  const choices = next => ({
    A: { text: 'fictional A', score: 10, ...(next ? { next } : { ending: 'STRONG' }) },
    B: { text: 'fictional B', score: 5, ...(next ? { next } : { ending: 'MIXED' }) },
    C: { text: 'fictional C', score: 0, ...(next ? { next } : { ending: 'FRAGILE' }) }
  });
  return {
    id: 'fictional-mission', expectedSteps: 2, start: 'start',
    endings: { STRONG: { text: 'Strong.' }, MIXED: { text: 'Mixed.' }, FRAGILE: { text: 'Fragile.' } },
    steps: {
      start: { meta: { fidelityTargetKey: 'proactive_01' }, choices: choices('finish') },
      finish: { choices: choices(null) }
    }
  };
}

function writeFixture(base = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-private-case-'))) {
  fs.mkdirSync(path.join(base, 'content'), { recursive: true });
  fs.writeFileSync(path.join(base, 'config.js'), "window.MR_TEACHER_CONFIG = { missionFiles: ['content/mission.js'], resourcesFile: 'content/resources.js', studentAlias: 'Fictional' };\n");
  fs.writeFileSync(path.join(base, 'content/resources.js'), "window.MR_RESOURCES = { briefing: 'fictional' };\n");
  fs.writeFileSync(path.join(base, 'content/mission.js'), `POOL.daily.push(${JSON.stringify(validMission())});\n`);
  fs.writeFileSync(path.join(base, 'fidelity-targets.expected.json'), JSON.stringify({ targets: [{ target_key: 'proactive_01', domain: 'proactive' }] }));
  return base;
}

function runBuilder(source, ...outputArgs) {
  return spawnSync(process.execPath, [builder, '--source-dir', source, '--case-code', 'CASE-FICTIONAL-001', '--version', '2', ...outputArgs], { cwd: root, encoding: 'utf8' });
}

test('loads an external executable directory in protected runtime shape', () => {
  const payload = loadExecutableContent(writeFixture());
  assert.deepEqual(Object.keys(payload), ['config', 'resources', 'daily_missions', 'wildcard_missions', 'crisis_missions']);
  assert.equal(payload.config.contentSource, 'supabase-protected');
  assert.equal(payload.config.missionFiles, undefined);
  assert.equal(payload.config.resourcesFile, undefined);
  assert.equal(payload.config.game_folder, undefined);
  assert.equal(payload.daily_missions.length, 1);
});

test('writes protected JSON and does not warn for an outside source', () => {
  const source = writeFixture();
  const output = path.join(source, 'protected-content.json');
  const result = runBuilder(source, '--json-output', output);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /inside the repository/);
  assert.equal(JSON.parse(fs.readFileSync(output)).daily_missions.length, 1);
});

test('--version 2 writes version 2 to SQL', () => {
  const source = writeFixture();
  const output = path.join(source, 'protected-seed.sql');
  const result = runBuilder(source, '--output', output);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(output, 'utf8'), /insert into public\.case_game_content/);
  assert.match(fs.readFileSync(output, 'utf8'), /CASE-FICTIONAL-001/);
  assert.match(fs.readFileSync(output, 'utf8'), /\n  2, now\(\)/);
  assert.match(fs.readFileSync(output, 'utf8'), /version = excluded\.version/);
});

test('accepts another positive integer version', () => {
  const source = writeFixture();
  const output = path.join(source, 'protected-seed.sql');
  const result = spawnSync(process.execPath, [builder, '--source-dir', source, '--case-code', 'CASE-FICTIONAL-001', '--version', '37', '--output', output], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(output, 'utf8'), /\n  37, now\(\)/);
});

test('requires a version for the modern CLI', () => {
  const source = writeFixture();
  const result = spawnSync(process.execPath, [builder, '--source-dir', source, '--case-code', 'CASE-FICTIONAL-001', '--json-output', path.join(source, 'output.json')], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--version INTEGER/);
});

for (const version of ['0', '-1', '1.5', 'not-a-number']) {
  test(`rejects invalid version ${version}`, () => {
    const source = writeFixture();
    const result = spawnSync(process.execPath, [builder, '--source-dir', source, '--case-code', 'CASE-FICTIONAL-001', '--version', version, '--json-output', path.join(source, 'output.json')], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--version must be a positive integer/);
  });
}

test('warns without blocking when the source is inside the repository', t => {
  const source = path.join(root, '.tmp', `fictional-${process.pid}-${Date.now()}`);
  t.after(() => fs.rmSync(source, { recursive: true, force: true }));
  writeFixture(source);
  const result = runBuilder(source, '--json-output', path.join(source, 'output.json'));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /WARNING: source directory is inside the repository/);
  assert.match(result.stderr, /Real participant content must remain outside Git/);
});

test('supports the legacy positional Demo-2 invocation', () => {
  const output = path.join(os.tmpdir(), `demo-2-${process.pid}-${Date.now()}.sql`);
  const result = spawnSync(process.execPath, [builder, 'demo-2', 'CASE-DEMO-2', output], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(output, 'utf8'), /CASE-DEMO-2/);
  assert.match(fs.readFileSync(output, 'utf8'), /\n  1, now\(\)/);
});

test('external fixture passes structure then fidelity coverage', () => {
  const source = writeFixture();
  assert.equal(validateStructure(missionGroups(loadExecutableContent(source))).valid, true);
  const result = spawnSync(process.execPath, [fidelity, source, path.join(source, 'fidelity-targets.expected.json'), '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).hard_errors.length, 0);
});

function rulesFor(mutate) {
  const mission = validMission();
  mutate(mission);
  return validateStructure({ daily: [mission], wildcard: [], crisis: [] }).errors.map(error => error.rule);
}

test('rejects a malformed branch reference', () => {
  assert(rulesFor(mission => { mission.steps.start.choices.A.next = 'missing'; }).includes('unresolved_next'));
});

test('rejects an invalid score set', () => {
  assert(rulesFor(mission => { mission.steps.start.choices.B.score = 10; }).includes('invalid_score_set'));
});

test('rejects an incorrect decision count', () => {
  assert(rulesFor(mission => { delete mission.steps.start.choices.C; }).includes('incorrect_decision_count'));
});

test('rejects an invalid fidelity key', () => {
  assert(rulesFor(mission => { mission.steps.start.meta.fidelityTargetKey = 'proactive_1'; }).includes('invalid_fidelity_key'));
});

test('accepts valid narrative endings and rejects invalid or missing endings', () => {
  assert.equal(validateStructure({ daily: [validMission()], wildcard: [], crisis: [] }).valid, true);
  assert(rulesFor(mission => { mission.steps.finish.choices.A.ending = 'success'; }).includes('invalid_ending_key'));
  assert(rulesFor(mission => { delete mission.endings.STRONG; }).includes('missing_referenced_ending'));
});
