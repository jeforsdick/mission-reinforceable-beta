'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const script = path.join(__dirname, 'create-private-case-starter.js');
const expected = ['README-FIRST.txt', 'config.js', 'fidelity-targets.expected.json', 'content/resources.js', 'content/daily-mission-1.js'];

test('private case starter refuses any output inside the repository', () => {
  const output = path.join(__dirname, '.should-never-exist');
  const result = childProcess.spawnSync(process.execPath, [script, '--case-code', 'CASE-998', '--output', output], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SAFETY STOP[\s\S]*outside the public repository/);
  assert.equal(fs.existsSync(output), false);
});

test('private case starter creates only generic files outside the repository', t => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-private-starter-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const output = path.join(parent, 'CASE-998');
  const result = childProcess.spawnSync(process.execPath, [script, '--case-code', 'CASE-998', '--output', output], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(expected.filter(relative => !fs.existsSync(path.join(output, relative))), []);
  const contents = expected.map(relative => fs.readFileSync(path.join(output, relative), 'utf8')).join('\n');
  assert.match(contents, /APPROVED STUDENT ALIAS/);
  assert.match(contents, /Edit in this order/);
  assert.doesNotMatch(contents, /Jane Doe|student@example|password|SUPABASE|service_role|api[_ -]?key/i);
  assert.doesNotMatch(fs.readFileSync(script, 'utf8'), /createClient|from\(['"]case_game_content|fetch\(/);
});
