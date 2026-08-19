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
const legacyFixturePairs = [
  ['../teachers/olson/content/daily-mission-1.js', '../../demo-game/content/daily-mission.js'],
  ['../teachers/olson/content/wildcard-mission-1.js', '../../demo-game/content/wildcard-mission.js'],
  ['../teachers/olson/content/crisis-mission-1.js', '../../demo-game/content/crisis-mission.js']
];

test('public demo directly loads its dedicated fixture without the legacy teacher loader', () => {
  assert.doesNotMatch(demoApp, /MR\.loadTeacher|teachers\/|['"]olson['"]/);
  assert.doesNotMatch(demoHTML, /teacher-loader\.js|auth\.js|supabase|study-calendar\.js/i);
  for (const path of ['config.js', 'daily-mission.js', 'wildcard-mission.js', 'crisis-mission.js', 'resources.js']) {
    assert.match(demoApp, new RegExp(`demo-game/content/${path.replace('.', '\\.')}`));
  }
  assert.match(demoHTML, /js\/engine\.js/);
});

test('public demo satisfies the shared engine runtime DOM and daily-date contracts', () => {
  const studyDateIndex = demoHTML.indexOf('src="js/study-date.js"');
  const engineIndex = demoHTML.indexOf('src="js/engine.js');
  assert.ok(studyDateIndex >= 0, 'the neutral study-date utility must be loaded');
  assert.ok(engineIndex > studyDateIndex, 'study-date.js must load before engine.js');

  for (const id of [
    'wizard-modal',
    'wizard-modal-title',
    'wizard-modal-text',
    'wizard-feedback-content',
    'wizard-consequence-section',
    'wizard-consequence-heading',
    'wizard-consequence-text',
    'wizard-reaction-section',
    'wizard-reaction-text',
    'wizard-explanation-section',
    'wizard-explanation-text',
    'wizard-modal-continue',
    'wizard-modal-img'
  ]) {
    assert.match(demoHTML, new RegExp(`id=["']${id}["']`), `missing shared-engine element #${id}`);
  }

  assert.doesNotMatch(demoHTML, /PUBLIC DEMO|class=["'][^"']*demo-label/);
  assert.doesNotMatch(demoHTML, /teacher-loader\.js/);
  assert.doesNotMatch(demoApp, /MR\.loadTeacher/);
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

test('public demo fixture preserves mission semantics while intentionally improving fictional Resource Map data', () => {
  const withoutLeadingComment = source => source.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  for (const [legacyPath, demoPath] of legacyFixturePairs) {
    assert.equal(withoutLeadingComment(read(demoPath)), withoutLeadingComment(read(legacyPath)));
  }
  const resourcesSource = read('../../demo-game/content/resources.js');
  assert.notEqual(resourcesSource, read('../teachers/olson/content/resources.js'));
  assert.match(resourcesSource, /Jordan/);
  assert.doesNotMatch(resourcesSource, /resultEndpoint|script\.google\.com|supabase|participant|caseId|coachId/i);
});

test('authenticated game, participant telemetry, and QA Preview entry contracts remain present', () => {
  assert.match(gameHTML, /js\/auth\.js/);
  assert.match(gameHTML, /js\/teacher-loader\.js/);
  assert.match(gameApp, /loadProtectedGameContent/);
  assert.match(auth, /supabase/i);
  assert.match(qaTest, /qaMode/);
});
