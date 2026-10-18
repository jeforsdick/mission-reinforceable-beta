import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const engine = readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const end = engine.lastIndexOf('\n})();');
assert.ok(end > 0);
const instrumented = engine.slice(0, end)
  + '\n MR.__heartPulseTest = { animateHeartChange };'
  + engine.slice(end);

function harness() {
  const hearts = Array.from({ length: 5 }, () => {
    const applied = new Set();
    return { applied, classList: { add: value => applied.add(value) } };
  });
  const row = { children: hearts };
  const MR = { $: selector => selector === '#heart-row' ? row : null };
  const context = { MR, console, document: { addEventListener() {} } };
  context.window = context;
  vm.runInNewContext(instrumented, vm.createContext(context));
  const changed = effect => hearts.flatMap((sprite, i) => sprite.applied.has(effect) ? [i + 1] : []);
  return { MR, hearts, changed };
}

test('half-point scoring animates only one partially emptied heart', () => {
  const view = harness();
  view.MR.__heartPulseTest.animateHeartChange(5, 4.5);
  assert.deepEqual(view.changed('heart-pulse-half'), [5]);
  assert.deepEqual(view.changed('heart-pulse-full'), []);
});

test('remaining half-heart empties on next half-point without triggering other hearts', () => {
  const view = harness();
  view.MR.__heartPulseTest.animateHeartChange(4.5, 4);
  assert.deepEqual(view.changed('heart-pulse-half'), [5]);
});

test('full-point deduction pulses only hearts whose actual fill changes', () => {
  const full = harness();
  full.MR.__heartPulseTest.animateHeartChange(5, 4);
  assert.deepEqual(full.changed('heart-pulse-full'), [5]);
  const partial = harness();
  partial.MR.__heartPulseTest.animateHeartChange(4.5, 3.5);
  assert.deepEqual(partial.changed('heart-pulse-full'), [4, 5]);
});

test('correct choices and empty hearts do not animate', () => {
  for (const [before, after] of [[5, 5], [0, 0], [0, -1], [3, 4]]) {
    const view = harness();
    view.MR.__heartPulseTest.animateHeartChange(before, after);
    assert.equal(view.hearts.some(h => h.applied.size > 0), false);
  }
});

test('animation occurs after scored HUD render and never during checkpoint restoration', () => {
  assert.match(engine, /if \(restoredAnswer\) return;[\s\S]*?renderHUD\(\);\s*showWizardFeedback/);
  assert.match(engine, /if \(MR\.heartFlight\)/);
  assert.match(engine, /MR\.heartFlight\.play\(heartChange\.before, heartChange\.after\)/);
  assert.match(engine, /animateHeartChange\(heartChange\.before, heartChange\.after\)/);
  assert.match(engine, /heartsBefore: heartChange\.before/);
  assert.match(engine, /heartsAfter: heartChange\.after/);
});

test('effects last less than half a second and honor reduced-motion accessibility', () => {
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#heart-row > \.heart-pulse-half\s*\{\s*animation: mr-heart-pulse-half 400ms/);
  assert.match(css, /#heart-row > \.heart-pulse-full\s*\{\s*animation: mr-heart-pulse-full 420ms/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*#heart-row > \.heart-pulse-half,[\s\S]*#heart-row > \.heart-pulse-full[\s\S]*animation: none/);
});
