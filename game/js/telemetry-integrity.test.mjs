import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');

function exposedEngine(names) {
  const end = source.lastIndexOf('\n})();');
  const instrumented = `${source.slice(0, end)}\nMR.__telemetryTest = { ${names.join(', ')} };${source.slice(end)}`;
  const MR = {};
  const context = { console, crypto: globalThis.crypto, document: { addEventListener() {} }, MR, alert() {} };
  context.window = context;
  vm.runInContext(instrumented, vm.createContext(context));
  return { MR, api: MR.__telemetryTest };
}

const run = {
  sessionEndedAt: '2026-08-19T12:05:00Z', durationSeconds: 300, activeDurationSeconds: 280,
  score: 30, maxScore: 30, accuracy: 100, totalQuestions: 3, bestChoiceCount: 3,
  refineChoiceCount: 0, missedOpportunityCount: 0, hintsUsed: false, totalHintsOpened: 0,
  questionsWithHints: 0, hintUseRate: 0, missionId: 'daily-1', history: []
};

test('failed authenticated session creation propagates failure without locking the dose', async () => {
  const { MR, api } = exposedEngine(['finishRelationalTelemetry']);
  MR.telemetryContext = { participantId: 'participant', caseId: 'case', qaMode: false };
  MR.dailyMissionCompleted = false;
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(false)), false);
  assert.equal(MR.dailyMissionCompleted, false);
});

test('failed participant completion propagates failure without locking the dose', async () => {
  const { MR, api } = exposedEngine(['finishRelationalTelemetry']);
  MR.telemetryContext = { participantId: 'participant', caseId: 'case', qaMode: false };
  MR.dailyMissionCompleted = false;
  MR.auth = { completeParticipantMission: async () => { throw new Error('offline'); } };
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(true)), false);
  assert.equal(MR.dailyMissionCompleted, false);
});

test('failed QA completion propagates failure and successful QA retains qa-mode telemetry', async () => {
  const { MR, api } = exposedEngine(['finishRelationalTelemetry', 'startRelationalTelemetry']);
  let sessionRow;
  MR.telemetryContext = { participantId: 'participant', caseId: 'case', qaMode: true, gameContentVersion: 2 };
  MR.auth = {
    createTelemetrySession: async row => { sessionRow = row; },
    completeTelemetrySession: async () => { throw new Error('offline'); }
  };
  assert.equal(await api.startRelationalTelemetry({ telemetrySessionId: 'session', telemetryStartedAt: 'now', mode: 'daily', mission: { id: 'daily-1' } }), true);
  assert.equal(sessionRow.qa_mode, true);
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(true)), false);

  MR.auth.completeTelemetrySession = async () => {};
  MR.auth.insertTelemetryResponses = async () => {};
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(true)), true);
});

test('failure exits before local save or successful Results and provides a safe Home path', () => {
  const failureBranch = source.match(/if \(telemetryResult === false\) \{[\s\S]*?\n    \}/)?.[0] || '';
  assert.match(failureBranch, /showTelemetrySaveFailure\(\)/);
  assert.match(failureBranch, /return/);
  assert.doesNotMatch(failureBranch, /saveRun|renderResults|dailyMissionCompleted/);
  assert.match(source, /We couldn't save this mission\. Please check your connection and try again\./);
  assert.match(source, /MR\.onTelemetrySaveFailed/);
  assert.match(source, /if \(!MR\.telemetryContext\) MR\.storage\.saveRun\(run\)/);
});

test('successful participant completion remains authoritative and locks normally', async () => {
  const { MR, api } = exposedEngine(['finishRelationalTelemetry']);
  let locked = 0;
  MR.telemetryContext = { participantId: 'participant', caseId: 'case', qaMode: false };
  MR.auth = { completeParticipantMission: async () => 'completed', insertTelemetryResponses: async () => {} };
  MR.onDailyMissionCompleted = () => { locked += 1; };
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(true)), true);
  assert.equal(MR.dailyMissionCompleted, true);
  assert.equal(locked, 1);
});

test('public demo remains the no-telemetry browser-local path', async () => {
  const { MR, api } = exposedEngine(['finishRelationalTelemetry']);
  assert.equal(await api.finishRelationalTelemetry(run, 'session', Promise.resolve(false)), undefined);
  assert.match(source, /if \(!MR\.telemetryContext\) MR\.storage\.saveRun\(run\)/);
});
