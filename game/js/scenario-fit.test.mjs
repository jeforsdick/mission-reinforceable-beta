import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./scenario-fit.js', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const demoHTML = fs.readFileSync(new URL('../../demo-game/index.html', import.meta.url), 'utf8');
const gameHTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const demoCSS = fs.readFileSync(new URL('../../demo-game/demo.css', import.meta.url), 'utf8');

function load() {
  const listeners = {};
  const window = {
    MR: {},
    getComputedStyle(element) {
      return element.isContainer
        ? { paddingTop: '10px', paddingBottom: '10px' }
        : { fontSize: element.style.fontSize || '23px' };
    },
    requestAnimationFrame(callback) { callback(); return 1; },
    cancelAnimationFrame() {},
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; }
  };
  vm.runInNewContext(source, { window });
  return { api: window.MR.scenarioFit, listeners };
}

function elementFor(heightAt23, containerHeight = 120) {
  const parentElement = { isContainer: true, clientHeight: containerHeight };
  const element = { parentElement, style: {} };
  Object.defineProperty(element, 'scrollHeight', {
    get() { return heightAt23 * (parseFloat(element.style.fontSize || '23') / 23); }
  });
  return element;
}

test('short scenario text retains the normal CSS font size', () => {
  const { api } = load();
  const element = elementFor(70);
  const result = api.fitScenarioText(element);
  assert.equal(result.normalFontSize, 23);
  assert.equal(result.fontSize, 23);
  assert.equal(element.style.fontSize, '');
  assert.equal(result.fits, true);
});

test('long scenario text shrinks only to the readable minimum and preserves overflow', () => {
  const { api } = load();
  const fitting = api.fitScenarioText(elementFor(130));
  assert.ok(fitting.fontSize < 23);
  assert.ok(fitting.fontSize >= api.DEFAULT_MIN_FONT_SIZE);
  assert.equal(fitting.fits, true);

  const overflowing = api.fitScenarioText(elementFor(300));
  assert.equal(overflowing.fontSize, api.DEFAULT_MIN_FONT_SIZE);
  assert.equal(overflowing.fits, false);
});

test('scenario fit runs after scene markup and responds to layout changes', () => {
  const markupIndex = engineSource.indexOf("scenarioText.innerHTML = scenarioHTML(step.text || '')");
  const fitIndex = engineSource.indexOf('MR.scenarioFit.fitScenarioText(scenarioText)', markupIndex);
  assert.ok(markupIndex >= 0 && fitIndex > markupIndex);
  assert.match(engineSource, /watchScenarioTextFit/);
  const { api, listeners } = load();
  api.watchScenarioTextFit(elementFor(70));
  assert.equal(typeof listeners.resize, 'function');
  assert.equal(typeof listeners.orientationchange, 'function');
});

test('shared helper loads in both games and Back to Site override is demo-scoped', () => {
  assert.match(demoHTML, /js\/scenario-fit\.js/);
  assert.match(gameHTML, /js\/scenario-fit\.js/);
  assert.match(demoCSS, /\.demo-app \+ \.back-to-site-cottage[\s\S]*right:/);
  assert.match(demoCSS, /bottom: calc\(/);
  assert.doesNotMatch(demoCSS, /\.account-stack/);
});
