import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function expose(source, names) {
  const marker = '\n})();';
  const index = source.lastIndexOf(marker);
  assert.notEqual(index, -1);
  return `${source.slice(0, index)}\nMR.__test = { ${names.join(', ')} };${source.slice(index)}`;
}

function browserContext(MR = {}) {
  const context = { console, crypto: globalThis.crypto, document: { addEventListener() {} }, MR };
  context.window = context;
  return vm.createContext(context);
}

const choices = {
  A: { text: 'Ten-point answer', score: 10, next: 'strong' },
  B: { text: 'Five-point answer', score: 5, next: 'mixed' },
  C: { text: 'Zero-point answer', score: 0, next: 'fragile' }
};

const engineSource = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const engineContext = browserContext({
  teacherConfig: { shuffleChoices: true },
  shuffle: entries => entries.slice().reverse()
});
vm.runInContext(expose(engineSource, ['getChoiceArray', 'responseRowsForTelemetry']), engineContext);

const displayed = engineContext.MR.__test.getChoiceArray({ choices });
assert.deepEqual(Array.from(displayed, choice => choice.key), ['C', 'B', 'A']);
assert.notDeepEqual(Array.from(displayed, choice => choice.key), Object.keys(choices));
assert.deepEqual(
  Array.from(displayed, choice => [choice.key, choice.text, choice.score, choice.next]),
  [
    ['C', 'Zero-point answer', 0, 'fragile'],
    ['B', 'Five-point answer', 5, 'mixed'],
    ['A', 'Ten-point answer', 10, 'strong']
  ]
);

const selected = displayed[2];
const telemetryContext = {
  participantId: 'participant',
  caseId: 'case',
  gameContentVersion: 2,
  fidelityTargets: { proactive_01: { id: 'target-uuid', domain: 'proactive' } }
};
const [row] = engineContext.MR.__test.responseRowsForTelemetry({
  missionId: 'mission',
  history: [{
    stepId: 'step', stepIndex: 1, stepMeta: { fidelityTargetKey: 'proactive_01' }, meta: {},
    choiceKey: selected.key, selectedAnswerText: selected.text, selectedScore: selected.score
  }]
}, 'session', telemetryContext);
assert.equal(row.choice_id, 'A');
assert.equal(row.selected_answer_text, 'Ten-point answer');
assert.equal(row.selected_score, 10);
assert.equal(row.fidelity_target_id, 'target-uuid');
assert.equal(row.fidelity_domain, 'proactive');

engineContext.MR.teacherConfig.shuffleChoices = false;
assert.deepEqual(
  Array.from(engineContext.MR.__test.getChoiceArray({ choices }), choice => choice.key),
  ['A', 'B', 'C'],
  'non-protected configs can retain existing unshuffled demo behavior'
);

const loaderSource = fs.readFileSync(new URL('./protected-content.js', import.meta.url), 'utf8');
const loaderContext = browserContext({});
vm.runInContext(loaderSource, loaderContext);
const protectedResult = await loaderContext.MR.loadProtectedGameContent({
  config: { shuffleChoices: false, missionFiles: ['bad.js'], resourcesFile: 'bad.js', resultEndpoint: 'https://example.test' },
  daily_missions: [{ id: 'protected-mission' }]
}, { case_code: 'CASE-001' });
assert.equal(protectedResult.config.shuffleChoices, true, 'protected runtime overrides legacy unsafe payloads');
assert.equal(protectedResult.config.teacherId, 'CASE-001');
assert.equal(protectedResult.config.resultEndpoint, undefined);
assert.equal(protectedResult.config.missionFiles, undefined);
assert.equal(protectedResult.config.resourcesFile, undefined);

console.log('protected choice shuffling tests passed');
