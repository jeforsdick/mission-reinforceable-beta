import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const demoHTML = read('../../demo-game/index.html');
const demoApp = read('./demo-app.js');
const gameHTML = read('../index.html');
const gameApp = read('./app.js');
const auth = read('./auth.js');
const qaTest = read('./research-admin-qa-preview.test.mjs');
const configSource = read('../../demo-game/content/config.js');
const fixtureFiles = [
  '../../demo-game/content/daily-mission.js',
  '../../demo-game/content/wildcard-mission.js',
  '../../demo-game/content/crisis-mission.js',
  '../../demo-game/content/resources.js'
];

test('public demo directly loads its dedicated fixture without the legacy teacher loader', () => {
  assert.doesNotMatch(demoApp, /MR\.loadTeacher|teachers\/|['"]olson['"]/);
  assert.doesNotMatch(demoHTML, /teacher-loader\.js|auth\.js|supabase|study-calendar\.js/i);
  for (const path of ['config.js', 'daily-mission.js', 'wildcard-mission.js', 'crisis-mission.js', 'resources.js']) {
    assert.match(demoApp, new RegExp(`demo-game/content/${path.replace('.', '\\.')}`));
  }
  assert.match(demoHTML, /js\/engine\.js/);
});

test('public demo fixture is explicitly fictional and has no remote result endpoint', () => {
  const context = { window: {} };
  vm.runInNewContext(configSource, context);
  const config = context.window.MR_PUBLIC_DEMO_CONFIG;
  assert.equal(config.fixtureId, 'fictional-public-demo');
  assert.equal(config.fictional, true);
  assert.equal(config.resultEndpoint, '');
  assert.doesNotMatch(configSource, /script\.google\.com|supabase|@|participant|caseId|coachId/i);
});

test('public demo fixture provides every current mission mode and Resource Map section', () => {
  const context = { window: {}, POOL: { daily: [], wild: [], crisis: [] } };
  context.window.POOL = context.POOL;
  for (const file of fixtureFiles) vm.runInNewContext(read(file), context);
  assert.deepEqual(Object.fromEntries(Object.entries(context.POOL).map(([mode, missions]) => [mode, missions.length])), {
    daily: 1,
    wild: 1,
    crisis: 1
  });
  assert.ok(context.window.MR_RESOURCES);
  assert.deepEqual(Object.keys(context.window.MR_RESOURCES.sections).sort(), [
    'bip', 'coaching', 'errorCorrection', 'fidelity', 'functionForest', 'library',
    'prevention', 'reinforcement', 'replacement'
  ]);
});

test('authenticated game, participant telemetry, and QA Preview entry contracts remain present', () => {
  assert.match(gameHTML, /js\/auth\.js/);
  assert.match(gameHTML, /js\/teacher-loader\.js/);
  assert.match(gameApp, /loadProtectedGameContent/);
  assert.match(auth, /supabase/i);
  assert.match(qaTest, /qaMode/);
});
