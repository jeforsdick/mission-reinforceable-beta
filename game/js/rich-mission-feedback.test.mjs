import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const marker = '\n})();';
const markerIndex = source.lastIndexOf(marker);
assert.notEqual(markerIndex, -1);
const instrumented = `${source.slice(0, markerIndex)}
  function setTestCurrent(value) { current = value; pendingNext = null; pendingEnding = null; }
  function testState() { return { current, pendingNext, pendingEnding, modalMode }; }
  MR.__test = { combinedFeedbackText, endingForChoice, showWizardFeedback, showMissionOutcome, selectChoice, responseRowsForTelemetry, setTestCurrent, testState };
${source.slice(markerIndex)}`;

function element() {
  return {
    hidden: false,
    textContent: '',
    innerHTML: 'unchanged',
    dataset: {},
    style: {},
    className: '',
    classList: { toggle() {} },
    setAttribute() {}
  };
}

const selectors = [
  '#wizard-modal', '#wizard-modal-img', '#wizard-modal-title', '#wizard-modal-text',
  '#wizard-feedback-content', '#wizard-consequence-section', '#wizard-consequence-text',
  '#wizard-consequence-heading', '#wizard-reaction-section', '#wizard-reaction-text',
  '#wizard-explanation-section', '#wizard-explanation-text', '#wizard-modal-continue',
  '#heart-row', '#mission-progress-label', '#mission-progress-count', '#mission-progress-fill',
  '#xp-label', '#xp-fill', '#score-label'
];
const elements = Object.fromEntries(selectors.map(selector => [selector, element()]));
const context = {
  console,
  crypto: globalThis.crypto,
  document: { addEventListener() {} },
  MR: {
    $: selector => elements[selector],
    $$: () => [],
    asset: name => `/assets/${name}.png`,
    teacherConfig: { shuffleChoices: false, defaultHearts: 5, xpMax: 1000 },
    escapeHTML: value => String(value),
    audio: { playSfx() {} }
  }
};
context.window = context;
vm.runInContext(instrumented, vm.createContext(context));
const api = context.MR.__test;

// Choice feedback is intentionally brief: only the Wizard's reaction is visible.
api.showWizardFeedback({ wizard: 'A theatrical reaction.', feedback: 'A behavioral explanation.' }, 10);
assert.equal(elements['#wizard-modal-text'].hidden, false);
assert.equal(elements['#wizard-modal-text'].textContent, 'A theatrical reaction.');
assert.equal(elements['#wizard-feedback-content'].hidden, true);

api.showWizardFeedback({ consequence: 'The class settles.', wizard: 'Portal sealed!', feedback: 'The prompt matched the plan.' }, 10);
assert.equal(elements['#wizard-modal-text'].textContent, 'Portal sealed!');
assert.equal(elements['#wizard-feedback-content'].hidden, true);
assert.equal(elements['#wizard-consequence-text'].textContent, '');
assert.equal(elements['#wizard-reaction-text'].textContent, '');
assert.equal(elements['#wizard-explanation-text'].textContent, '');

// Content is assigned as text, never HTML.
const unsafe = '<img src=x onerror="globalThis.compromised=true">';
api.showWizardFeedback({ consequence: unsafe, wizard: unsafe, feedback: unsafe }, 0);
assert.equal(elements['#wizard-modal-text'].textContent, unsafe);
assert.equal(elements['#wizard-modal-text'].innerHTML, 'unchanged');
assert.equal(context.compromised, undefined);

// Legacy choices without a Wizard reaction remain playable without exposing their explanation.
api.showWizardFeedback({ consequence: 'Legacy consequence.', feedback: 'Legacy explanation.' }, 5);
assert.equal(elements['#wizard-modal-text'].textContent, 'The classroom shifts in response to your decision.');
assert.equal(elements['#wizard-feedback-content'].hidden, true);

const endings = Object.fromEntries(['STRONG', 'MIXED', 'FRAGILE'].map(key => [key, { text: `${key} outcome`, wizard: `${key} wizard` }]));
for (const key of Object.keys(endings)) {
  assert.equal(api.endingForChoice({ endings }, { ending: key }, true).text, `${key} outcome`);
}
for (const [key, expected] of Object.entries({
  STRONG: ['/assets/wizardSuccess.png', 'wizard-modal-img happy'],
  MIXED: ['/assets/wizardMeh.png', 'wizard-modal-img questioning'],
  FRAGILE: ['/assets/wizardDead.png', 'wizard-modal-img dead']
})) {
  api.showMissionOutcome({ key, ...endings[key] });
  assert.equal(elements['#wizard-modal-img'].src, expected[0]);
  assert.equal(elements['#wizard-modal-img'].className, expected[1]);
}
assert.equal(api.endingForChoice({ endings }, {}, true), null);
assert.equal(api.endingForChoice({ endings }, { ending: 'UNKNOWN' }, true), null);
assert.equal(api.endingForChoice({ endings: { OTHER: { text: 'Configured but unsupported' } } }, { ending: 'OTHER' }, true), null);
assert.equal(api.endingForChoice({ endings }, { ending: 'STRONG' }, false), null);

function terminalCurrent(choice) {
  const priorHistory = Array.from({ length: 4 }, (_, index) => ({
    stepId: `d${index + 1}`,
    stepIndex: index + 1,
    score: 10,
    selectedScore: 10,
    meta: {},
    stepMeta: {}
  }));
  return {
    mode: 'daily',
    mission: { id: 'generic-test', title: 'Generic test', endings, steps: { d5: { text: 'Decision five', choices: { A: choice } } } },
    stepId: 'd5', score: 20, maxScore: 40, hearts: 5, maxHearts: 5,
    expectedSteps: 5, xpMax: 1000, history: priorHistory, hintTracking: {}
  };
}

api.setTestCurrent(terminalCurrent({ text: 'Finish', score: 10, feedback: 'Done.' }));
api.selectChoice('A');
let state = api.testState();
assert.equal(state.pendingEnding, null);
assert.equal(state.current.history.length, 5);

api.setTestCurrent(terminalCurrent({ text: 'Finish', score: 10, consequence: 'Closure.', wizard: 'Huzzah!', feedback: 'Aligned.', ending: 'STRONG' }));
api.selectChoice('A');
state = api.testState();
assert.equal(state.pendingEnding.key, 'STRONG');
assert.equal(state.current.history[4].consequence, 'Closure.', 'consequence remains available internally');
assert.equal(state.current.history[4].feedback, 'Aligned.', 'behavioral feedback remains available internally');
assert.equal(state.current.history[4].wizard, 'Huzzah!', 'Wizard reaction remains available internally');
const scoreAfterDecision = state.current.score;
const maxScoreAfterDecision = state.current.maxScore;
const heartsAfterDecision = state.current.hearts;
api.showMissionOutcome(state.pendingEnding);
state = api.testState();
assert.equal(state.current.history.length, 5, 'outcome is not a sixth decision');
assert.equal(state.current.score, scoreAfterDecision, 'outcome does not alter score');
assert.equal(state.current.maxScore, maxScoreAfterDecision, 'outcome does not alter max score');
assert.equal(state.current.hearts, heartsAfterDecision, 'outcome does not alter hearts');
const rows = api.responseRowsForTelemetry(
  { missionId: 'generic-test', history: state.current.history },
  'session',
  { participantId: 'participant', caseId: 'case', gameContentVersion: 1, fidelityTargets: {} }
);
assert.equal(rows.length, 5, 'outcome does not create a sixth telemetry response');
assert.equal(rows[4].feedback_text, 'Closure.\n\nAligned.');

api.setTestCurrent(terminalCurrent({ text: 'Finish', score: 5, ending: 'INVALID' }));
api.selectChoice('A');
assert.equal(api.testState().pendingEnding, null, 'invalid endings gracefully retain legacy completion');

console.log('rich mission feedback tests passed');
