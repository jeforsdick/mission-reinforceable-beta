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

test('public demo navigation icons have working static image sources', () => {
  for (const [asset, filename] of [
    ['startOverIcon', 'bottom-bar-start-over-icon.png'],
    ['progressIcon', 'bottom-bar-my-progress-icon.png'],
    ['resourcesIcon', 'bottom-bar-resources-icon.png']
  ]) {
    assert.ok(demoHTML.includes(`<img data-asset="${asset}" src="../assets/game/skin-v2/${filename}" alt="" />`),
      `${asset} must render without waiting for asynchronous fixture loading`);
  }
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

test('public demo fixture remains a self-contained fictional Resource Map source', () => {
  const resourcesSource = read('../../demo-game/content/resources.js');
  assert.match(resourcesSource, /Jordan/);
  assert.doesNotMatch(resourcesSource, /resultEndpoint|script\.google\.com|supabase|participant|caseId|coachId/i);
});

test('authenticated game, participant telemetry, and QA Preview entry contracts remain present', () => {
  assert.match(gameHTML, /js\/auth\.js/);
  assert.match(gameHTML, /js\/protected-content\.js/);
  assert.doesNotMatch(gameHTML, /js\/teacher-loader\.js/);
  assert.match(gameApp, /loadProtectedGameContent/);
  assert.match(auth, /supabase/i);
  assert.match(qaTest, /qaMode/);
});


test('all three fictional showcase missions offer 13 scenes, 39 rich choices and 243 valid five-decision routes', () => {
  const context = { window: {}, POOL: { daily: [], wild: [], crisis: [] } };
  context.window.POOL = context.POOL;
  for (const file of fixtureFiles) vm.runInNewContext(read(file), context);

  for (const [mode, missions] of Object.entries(context.POOL)) {
    assert.equal(missions.length, 1, mode + ' must contain exactly one public showcase mission');
    const mission = missions[0];
    assert.equal(Object.keys(mission.steps).length, 13, mode + ' should contain one opening and three states for each subsequent beat');
    assert.deepEqual(Object.keys(mission.endings).sort(), ['FRAGILE', 'MIXED', 'STRONG']);
    let choiceCount = 0;
    for (const [stepId, scene] of Object.entries(mission.steps)) {
      assert.ok(scene.text && scene.text.trim().length >= 90, mode + ':' + stepId + ' needs a substantive scene');
      assert.ok(scene.hint && scene.hint.trim().length >= 30, mode + ':' + stepId + ' needs a useful hint');
      assert.ok(scene.hint.trim().length <= 140, mode + ':' + stepId + ' hint should fit the Wizard bubble');
      assert.equal(Object.keys(scene.choices).length, 3, mode + ':' + stepId);
      assert.deepEqual(Object.values(scene.choices).map(c => c.score).sort((a,b)=>a-b), [0,5,10]);
      for (const choice of Object.values(scene.choices)) {
        choiceCount++;
        for (const key of ['text', 'consequence', 'wizard', 'feedback']) {
          assert.ok(typeof choice[key] === 'string' && choice[key].trim().length >= 20, mode + ':' + stepId + ' choice lacks ' + key);
        }
        assert.ok(choice.meta && choice.meta.bipComponent && choice.meta.mechanism, mode + ':' + stepId + ' needs mechanism metadata');
      }
    }
    assert.equal(choiceCount, 39);
    let routeCount = 0;
    function traverse(stepId, depth, visited) {
      assert.ok(mission.steps[stepId], 'missing branch target ' + mode + ':' + stepId);
      assert.ok(!visited.has(stepId), 'loop in ' + mode + ':' + stepId);
      assert.ok(depth <= 5, 'too many decisions');
      const scene = mission.steps[stepId];
      const nextVisited = new Set([...visited, stepId]);
      for (const choice of Object.values(scene.choices)) {
        if (depth === 5) {
          assert.ok(!choice.next, 'terminal choice unexpectedly has next');
          assert.ok(mission.endings[choice.ending], 'terminal choice needs a configured ending');
          routeCount++;
        } else {
          assert.ok(choice.next, 'nonterminal choice missing next');
          traverse(choice.next, depth + 1, nextVisited);
        }
      }
    }
    traverse(mission.start, 1, new Set());
    assert.equal(routeCount, 243, mode + ' should offer all 3^5 branching paths');
  }
});

test('public demo has a single in-game Mission Menu in the bottom navigation', () => {
  assert.doesNotMatch(demoHTML, /id="play-menu-btn"/);
  assert.match(demoHTML, /id="nav-home"[^>]*>[\s\S]*?Mission Menu/);
  assert.match(demoHTML, /class="back-to-site-cottage"[^>]*aria-label="Visit the Mission: Reinforceable website"/);
  assert.match(demoHTML, /src="..\/assets\/game\/back-to-site-icon.png"/);
  assert.doesNotMatch(demoHTML, /class="back-to-site-label"/);
  assert.doesNotMatch(gameHTML, /class="back-to-site-label"/);
  assert.doesNotMatch(demoApp, /#play-menu-btn/);
});



test('public demo keeps feedback and Sound controls together without fixed overlap', () => {
  const css = read('../../demo-game/demo.css');
  const groupedControls = demoHTML.split('<div class="demo-utility-controls"')[1]?.split('</div>')[0] || '';
  assert.ok(groupedControls.includes('id="demo-feedback-open"'), 'feedback button must be in utility stack');
  assert.ok(groupedControls.includes('id="sound-toggle"'), 'sound button must be in utility stack');
  assert.ok(css.includes('.demo-utility-controls {'));
  assert.ok(css.includes('flex-direction: column;'), 'desktop utility stack must keep controls on separate rows');
  assert.ok(css.includes('.demo-utility-controls > .sound-toggle {'));
  assert.ok(css.includes('z-index: auto;'), 'shared fixed sound control must be reset inside the stack');
  assert.ok(css.includes('body:has(#play-screen.is-active) .demo-utility-controls > .sound-toggle'));
  assert.ok(css.includes('@media (max-width: 700px)'));
  assert.ok(demoHTML.includes('demo.css?v=20261016-demo-controls-v1'));
});
