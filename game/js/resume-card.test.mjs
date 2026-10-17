import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8')
  .replace("  document.addEventListener('DOMContentLoaded', init);",
    "  window.__homeTest = { renderHome, wireEvents };\n  document.addEventListener('DOMContentLoaded', init);");

function setup({ qaMode = false, saved = null, completed = false, draftOnly = false, pool = null } = {}) {
  const state = {
    saved, completed, qaMode, confirmed: true,
    starts: [], resumes: 0, confirms: 0, warnings: [], screens: []
  };
  function node() {
    const handlers = {};
    return {
      hidden: false, disabled: false, textContent: '', src: '',
      dataset: {}, handlers, className: '',
      classList: {
        classes: new Set(),
        toggle(name, on) { if (on) this.classes.add(name); else this.classes.delete(name); },
        contains(name) { return this.classes.has(name); }
      },
      addEventListener(type, cb) { handlers[type] = cb; },
      async click() { return handlers.click?.(); },
      setAttribute() {}
    };
  }
  const elements = new Map();
  const get = selector => {
    if (!elements.has(selector)) elements.set(selector, node());
    return elements.get(selector);
  };
  const modes = ['daily', 'wild', 'crisis'];
  const cards = {};
  const buttons = modes.map(mode => {
    const card = node();
    const description = node();
    const descriptions = {
      daily: 'Practice plan-aligned support decisions.',
      wild: 'Try a random classroom scenario.',
      crisis: 'Practice calm responses during higher-intensity moments.'
    };
    description.dataset.missionDescription = descriptions[mode];
    description.textContent = descriptions[mode];
    card.querySelector = selector => selector === '[data-mission-description]' ? description : null;
    cards[mode] = { card, description };
    const button = node();
    button.dataset.startMode = mode;
    button.closest = selector => selector === '.mission-card' ? card : null;
    return button;
  });
  const availablePool = pool || { daily: [{}], wild: [{}], crisis: [{}] };
  const MR = {
    teacherConfig: { classroomLabel: 'QA Classroom', displayName: 'Teacher', assets: { landingClassroom: 'landing.png', sameDayClassroom: 'same.png' } },
    telemetryContext: { qaMode, draftQa: draftOnly, fullDraftQa: false, demoCalendarBypass: true },
    pool: availablePool,
    $: get,
    $$: selector => selector === '[data-start-mode]' || selector === '.mission-menu [data-start-mode]' ? buttons : [],
    engine: {
      hasDailyRunToday: () => state.completed,
      resumableMission: () => state.saved,
      resumeSavedMission: async () => { state.resumes++; return true; },
      start: async mode => { state.starts.push(mode); }
    },
    studyCalendar: { isEligibleStudyDay: () => true },
    audio: { playSfx() {} },
    setScreen: screen => { state.screens.push(screen); },
    dashboard: { render() {} }, resources: { render() {} },
    auth: { recordResourceEvent: async () => {} }
  };
  const context = {
    MR, console, localStorage: {},
    confirm: () => { state.confirms++; return state.confirmed; },
    alert: text => state.warnings.push(text),
    matchMedia: () => ({ matches: false }),
    document: { addEventListener() {}, querySelectorAll: selector => selector === '[data-start-mode]' || selector === '.mission-menu [data-start-mode]' ? buttons : [] }
  };
  context.window = context;
  vm.runInNewContext(appSource, vm.createContext(context));
  return { state, MR, elements, buttons, cards, app: context.__homeTest };
}

test('resume appears in the saved mission card, with no separate panel', async () => {
  const view = setup({ saved: { mode: 'crisis', title: 'A Deskful of Trouble', completed: 3 } });
  view.app.renderHome();
  assert.equal(view.elements.get('#home-primary-btn').hidden, true);
  assert.deepEqual(view.buttons.map(button => button.hidden), [true, true, false]);
  assert.equal(view.buttons[2].textContent, 'Resume Mission');
  assert.match(view.cards.crisis.description.textContent, /A Deskful of Trouble · 3\/5 decisions complete/);
  assert.equal(view.cards.crisis.card.classList.contains('is-resumable'), true);
  assert.equal(view.cards.daily.card.classList.contains('is-resumable'), false);
  view.app.wireEvents();
  await view.buttons[2].click();
  assert.equal(view.state.resumes, 1);
  assert.equal(view.state.starts.length, 0);
});

test('QA can start Crisis while a Daily mission is unfinished, with a deliberate confirmation', async () => {
  const view = setup({ qaMode: true, saved: { mode: 'daily', title: 'The Attention Dial', completed: 3 } });
  view.app.renderHome();
  assert.deepEqual(view.buttons.map(button => button.hidden), [false, false, false]);
  assert.equal(view.buttons[0].textContent, 'Resume Mission');
  assert.equal(view.buttons[2].textContent, 'Start Crisis');
  view.app.wireEvents();
  view.state.confirmed = false;
  await view.buttons[2].click();
  assert.equal(view.state.starts.length, 0);
  view.state.confirmed = true;
  await view.buttons[2].click();
  assert.deepEqual(view.state.starts, ['crisis']);
  assert.equal(view.state.confirms, 2);
});

test('single Crisis draft shows only the available Crisis action', () => {
  const view = setup({ qaMode: true, draftOnly: true, pool: { daily: [], wild: [], crisis: [{}] } });
  view.app.renderHome();
  assert.equal(view.elements.get('#home-primary-btn').hidden, true);
  assert.deepEqual(view.buttons.map(button => button.hidden), [true, true, false]);
  assert.equal(view.buttons[2].textContent, 'Start Crisis');
});

test('a completed real-study mission remains locked and does not offer a replay', () => {
  const view = setup({ completed: true });
  view.app.renderHome();
  assert.equal(view.elements.get('#home-primary-btn').hidden, true);
  assert.deepEqual(view.buttons.map(button => button.hidden), [true, true, true]);
});

test('html maintains three mission cards, no standalone Resume banner and unchanged nav', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/data-mission-mode="(daily|wild|crisis)"/g) || []).length, 3);
  assert.doesNotMatch(html, /resume-mission-banner|resume-mission-btn/);
  assert.match(html, /id="nav-home"/);
  assert.match(html, /data-mission-description="Practice calm responses/);
});
