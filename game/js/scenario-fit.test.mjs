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

test('shared scenario keeps readable text and scrolls while hint fitting responds to layout', () => {
  const markupIndex = engineSource.indexOf("scenarioText.innerHTML = nextScenarioHTML(step)");
  const scrollIndex = engineSource.indexOf("scenarioText.dataset.noAutoFit = 'true'", markupIndex);
  assert.ok(markupIndex >= 0 && scrollIndex > markupIndex);
  assert.match(engineSource, /watchScenarioTextFit/);
  const { api, listeners } = load();
  api.watchScenarioTextFit(elementFor(70));
  assert.equal(typeof listeners.resize, 'function');
  assert.equal(typeof listeners.orientationchange, 'function');
});

test('shared helper loads in both games and Back to Site override is demo-scoped', () => {
  assert.match(demoHTML, /js\/scenario-fit\.js/);
  assert.match(gameHTML, /js\/scenario-fit\.js/);
  assert.match(demoCSS, /body > a\.back-to-site-cottage[\s\S]*position: fixed/);
  assert.match(demoCSS, /right: max\(20px, env\(safe-area-inset-right\)\)/);
  assert.match(demoCSS, /bottom: max\(20px, env\(safe-area-inset-bottom\)\)/);
  assert.match(demoCSS, /transform: none/);
  assert.match(demoCSS, /width: min\(1300px, 89vw\)/);
  assert.match(demoCSS, /\.demo-app \.home-panel[\s\S]*margin-top: -95px/);
  assert.doesNotMatch(demoCSS, /\.account-stack/);
});


function wizardHintFor(heightAt17, widthAt17 = 220) {
  const classes = new Set();
  const element = {
    style: {},
    clientWidth: 446,
    clientHeight: 188,
    classList: {
      remove(value) { classes.delete(value); },
      toggle(value, on) { if (on) classes.add(value); else classes.delete(value); },
      contains(value) { return classes.has(value); }
    }
  };
  Object.defineProperties(element, {
    scrollHeight: {
      configurable: true,
      get() { return heightAt17 * (parseFloat(element.style.fontSize || '17') / 17); }
    },
    scrollWidth: {
      get() { return widthAt17 * (parseFloat(element.style.fontSize || '17') / 17); }
    }
  });
  return element;
}

test('wizard hint fitting preserves readable short hints and shrinks longer hints only as needed', () => {
  const { api } = load();
  const getComputedStyle = el => ({ fontSize: el.style.fontSize || '17px' });
  const short = wizardHintFor(120);
  const untouched = api.fitWizardHintText(short, { getComputedStyle, mobile: false });
  assert.equal(untouched.fontSize, 17);
  assert.equal(short.style.fontSize, '');
  assert.equal(untouched.fits, true);

  const longer = wizardHintFor(232);
  const fitted = api.fitWizardHintText(longer, { getComputedStyle, mobile: false });
  assert.ok(fitted.fontSize < 17);
  assert.ok(fitted.fontSize >= 13.5);
  assert.equal(fitted.fits, true);
  assert.equal(longer.classList.contains('is-overflowing'), false);
});

test('extremely long hint stays inside a scrollable bubble rather than spilling', () => {
  const { api } = load();
  const getComputedStyle = el => ({ fontSize: el.style.fontSize || '17px' });
  const hint = wizardHintFor(700);
  const result = api.fitWizardHintText(hint, { getComputedStyle, mobile: false });
  assert.equal(result.fits, false);
  assert.equal(result.fontSize, 13.5);
  assert.equal(hint.classList.contains('is-overflowing'), true);

  // A later short hint must reset both the font size and overflow state.
  Object.defineProperty(hint, 'scrollHeight', { get() { return 100; } });
  const again = api.fitWizardHintText(hint, { getComputedStyle, mobile: false });
  assert.equal(again.fontSize, 17);
  assert.equal(hint.classList.contains('is-overflowing'), false);
});

test('mobile hints keep natural font size and bubble height after desktop fitting', () => {
  const { api, listeners } = load();
  const getComputedStyle = el => ({ fontSize: el.style.fontSize || '15px' });
  const hint = wizardHintFor(500);
  hint.style.fontSize = '13.5px';
  hint.classList.toggle('is-overflowing', true);
  const result = api.fitWizardHintText(hint, { getComputedStyle, mobile: true });
  assert.equal(result.mobile, true);
  assert.equal(hint.style.fontSize, '');
  assert.equal(hint.classList.contains('is-overflowing'), false);

  const stop = api.watchWizardHintFit(hint, { getComputedStyle, mobile: true });
  assert.equal(typeof listeners.resize, 'function');
  assert.equal(typeof listeners.orientationchange, 'function');
  stop();
  assert.equal(listeners.resize, undefined);
});

test('every hint is refitted after the content changes and shared CSS bounds long hints', () => {
  const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(engineSource, /hint\.textContent = wizardHintForCurrentStep\(\);[\s\S]*MR\.scenarioFit\.fitWizardHintText\(hint\)/);
  assert.match(engineSource, /MR\.scenarioFit\.watchWizardHintFit/);
  assert.match(css, /\.wizard-hint-wrap \.scenario-hint\.is-overflowing[\s\S]*overflow-y: auto/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.wizard-hint-wrap \.scenario-hint[\s\S]*height: auto/);
});

