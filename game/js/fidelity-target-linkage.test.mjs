import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function expose(source, names) {
  const marker = '\n})();';
  const index = source.lastIndexOf(marker);
  assert.notEqual(index, -1);
  return `${source.slice(0, index)}\nMR.__test = { ${names.join(', ')} };${source.slice(index)}`;
}

function browserContext(extra = {}) {
  const context = {
    console,
    crypto: globalThis.crypto,
    document: { addEventListener() {} },
    ...extra
  };
  context.window = context;
  context.MR = context.MR || {};
  return vm.createContext(context);
}

const authSource = fs.readFileSync(new URL('./auth.js', import.meta.url), 'utf8');
const requestedFilters = [];
const query = {
  select(columns) {
    assert.equal(columns, 'id, case_id, domain, target_key');
    return this;
  },
  eq(column, value) {
    requestedFilters.push([column, value]);
    return this;
  },
  then(resolve) {
    resolve({ data: [], error: null });
  }
};
const authContext = browserContext({
  supabase: { createClient: () => ({ from: table => (assert.equal(table, 'fidelity_targets'), query) }) }
});
vm.runInContext(expose(authSource, ['activeFidelityTargets']), authContext);
await authContext.MR.__test.activeFidelityTargets({ from: () => query }, 'case-current');
assert.deepEqual(requestedFilters, [['case_id', 'case-current'], ['active', true]]);

const appSource = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const appContext = browserContext({
  MR: { auth: { getFidelityTargets: async () => { throw new Error('offline'); } } }
});
vm.runInContext(expose(appSource, ['loadFidelityTargetLookup']), appContext);
assert.equal(Object.keys(await appContext.MR.__test.loadFidelityTargetLookup('case-current')).length, 0);

const engineSource = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const engineContext = browserContext();
vm.runInContext(expose(engineSource, ['responseRowsForTelemetry']), engineContext);
const context = {
  participantId: 'participant',
  caseId: 'case-current',
  gameContentVersion: 1,
  fidelityTargets: {
    proactive_01: { id: 'target-uuid', domain: 'proactive' }
  }
};
const row = (meta, stepMeta = {}) => engineContext.MR.__test.responseRowsForTelemetry({
  missionId: 'mission',
  history: [{ stepId: 'step', stepIndex: 0, meta, stepMeta }]
}, 'session', context)[0];

assert.equal(row({ bipComponent: 'Respond' }, { fidelityTargetKey: 'proactive_01' }).fidelity_target_id, 'target-uuid');
assert.equal(row({ bipComponent: 'Respond' }, { fidelityTargetKey: 'proactive_01' }).fidelity_domain, 'proactive');
assert.equal(row({ bipComponent: 'Teach', fidelityTargetKey: 'unknown_01' }, { fidelityTargetKey: 'proactive_01' }).fidelity_target_id, 'target-uuid');
assert.equal(row({ bipComponent: 'Teach', fidelityTargetKey: 'unknown_01' }).fidelity_target_id, null);
assert.equal(row({ bipComponent: 'Teach', fidelityTargetKey: 'unknown_01' }).fidelity_domain, 'teaching');
assert.equal(row({ bipComponent: 'Respond' }, { fidelityTargetKey: 'proactive_02' }).fidelity_domain, 'proactive');
assert.equal(row({ bipComponent: 'Reinforce' }).fidelity_domain, 'reinforcement');

const missionSource = fs.readFileSync(new URL('../teachers/demo-2/content/daily-mission-1.js', import.meta.url), 'utf8');
const missionContext = browserContext({ POOL: { daily: [] } });
vm.runInContext(missionSource, missionContext);
const annotated = [];
for (const mission of missionContext.POOL.daily) {
  for (const step of Object.values(mission.steps)) {
    if (step.meta?.fidelityTargetKey) annotated.push([mission.id, step.meta.fidelityTargetKey]);
    for (const choice of Object.values(step.choices)) assert.equal(choice.meta.fidelityTargetKey, undefined);
  }
}
assert.equal(annotated.length, 1);
assert.equal(annotated.every(([missionId, key]) => missionId === 'demo2-daily-long-center' && key === 'proactive_01'), true);
assert.doesNotMatch(missionSource, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

console.log('fidelity target linkage tests passed');
