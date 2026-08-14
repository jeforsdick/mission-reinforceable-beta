import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeCase, coachingCopy, sessionPercent, statusFor, targetPerformance } from './dashboard-metrics.mjs';
import { canAccessCoachDashboard, loadDashboardCases } from './dashboard-access.mjs';

const now = new Date('2026-08-13T12:00:00Z');
const sessions = [1, 2, 3].map(day => ({ id: `s${day}`, started_at: `2026-08-${10 + day}T12:00:00Z`, duration_seconds: 60 }));

test('zero telemetry produces honest empty metrics', () => {
  const result = analyzeCase({ sessions: [], responses: [], intake: { has_crisis_plan: false } }, now);
  assert.equal(result.planAlignedPercent, null);
  assert.equal(result.focus, 'More practice needed');
  assert.equal(coachingCopy(result).summary, 'More practice data is needed before a coaching pattern can be identified.');
});

test('missing domains are not counted as failures and crisis is hidden when irrelevant', () => {
  const result = analyzeCase({ sessions, intake: { has_crisis_plan: false }, responses: [
    { session_id: 's3', fidelity_domain: 'proactive', alignment: 'plan_aligned' },
    { session_id: 's3', fidelity_domain: 'proactive', alignment: 'plan_aligned' }
  ] }, now);
  assert.equal(result.domains.some(row => row.domain === 'crisis'), false);
  assert.equal(result.domains.find(row => row.domain === 'teaching').percent, null);
  assert.equal(result.focus, 'More practice needed');
});

test('lowest eligible domain is selected without teacher comparison', () => {
  const responses = [];
  for (const domain of ['proactive', 'teaching', 'reinforcement', 'response']) {
    responses.push({ session_id: 's3', fidelity_domain: domain, alignment: 'plan_aligned' });
    responses.push({ session_id: 's3', fidelity_domain: domain, alignment: domain === 'reinforcement' ? 'missed_opportunity' : 'plan_aligned' });
  }
  const result = analyzeCase({ sessions, responses, intake: { has_crisis_plan: false } }, now);
  assert.equal(result.focus, 'Reinforcement');
  assert.equal(statusFor(result), 'priority');
  assert.equal(result.planAlignedPercent, 88);
});

test('crisis appears only for a case with a crisis plan', () => {
  const result = analyzeCase({ sessions, responses: [], intake: { has_crisis_plan: true } }, now);
  assert.equal(result.domains.at(-1).domain, 'crisis');
});

test('session calculation falls back to counts and preserves no-opportunity null', () => {
  assert.equal(sessionPercent({ id: 'x', plan_aligned_count: 2, refine_count: 1, missed_count: 1 }), 50);
  assert.equal(sessionPercent({ id: 'x' }), null);
});

test('target performance uses the three alignment levels', () => {
  assert.deepEqual(targetPerformance([{ alignment: 'plan_aligned' }]), { percent: 100, emptyLabel: null });
  assert.deepEqual(targetPerformance([{ alignment: 'workable_refine' }]), { percent: 50, emptyLabel: null });
  assert.deepEqual(targetPerformance([{ alignment: 'missed_opportunity' }]), { percent: 0, emptyLabel: null });
  assert.deepEqual(targetPerformance([
    { alignment: 'plan_aligned' },
    { alignment: 'workable_refine' },
    { alignment: 'missed_opportunity' }
  ]), { percent: 50, emptyLabel: null });
});

test('target performance distinguishes unlinked and unscored opportunities', () => {
  assert.deepEqual(targetPerformance([]), { percent: null, emptyLabel: 'No linked opportunities' });
  assert.deepEqual(targetPerformance([
    { alignment: 'plan_aligned' },
    { alignment: 'unknown' },
    {},
    { alignment: null }
  ]), { percent: 100, emptyLabel: null });
  assert.deepEqual(targetPerformance([
    { alignment: 'unknown' },
    {},
    { alignment: null }
  ]), { percent: null, emptyLabel: 'No scored opportunities' });
});

function mockClient(dataByTable) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      const query = {
        select(columns) { call.operations.push(['select', columns]); return query; },
        eq(column, value) { call.operations.push(['eq', column, value]); return query; },
        in(column, value) { call.operations.push(['in', column, value]); return query; },
        order(column, options) { call.operations.push(['order', column, options]); return query; },
        then(resolve) { return Promise.resolve({ data: dataByTable[table] || [], error: null }).then(resolve); }
      };
      return query;
    }
  };
}

test('dashboard authorization allows only active coaches and research admins', () => {
  assert.equal(canAccessCoachDashboard({ role: 'coach', active: true }), true);
  assert.equal(canAccessCoachDashboard({ role: 'research_admin', active: true }), true);
  assert.equal(canAccessCoachDashboard({ role: 'teacher', active: true }), false);
  assert.equal(canAccessCoachDashboard({ role: 'research_admin', active: false }), false);
  assert.equal(canAccessCoachDashboard(null), false);
});

test('coach still loads only active assigned cases', async () => {
  const client = mockClient({ case_coaches: [{ case_id: 'assigned-case' }], cases: [{ id: 'assigned-case', active: true }] });
  const cases = await loadDashboardCases(client, 'coach-user', 'coach');
  assert.deepEqual(cases.map(row => row.id), ['assigned-case']);
  assert.deepEqual(client.calls.find(call => call.table === 'case_coaches').operations, [
    ['select', 'case_id'], ['eq', 'coach_user_id', 'coach-user'], ['eq', 'active', true]
  ]);
  assert.ok(client.calls.find(call => call.table === 'cases').operations.some(operation => operation[0] === 'in' && operation[1] === 'id' && operation[2][0] === 'assigned-case'));
});

test('research admin loads all active cases and their dashboard data without coach assignments', async () => {
  const client = mockClient({ cases: [{ id: 'case-a', active: true }, { id: 'case-b', active: true }] });
  const cases = await loadDashboardCases(client, 'admin-user', 'research_admin');
  assert.deepEqual(cases.map(row => row.id), ['case-a', 'case-b']);
  assert.deepEqual(client.calls.map(call => call.table), ['cases', 'case_intake', 'fidelity_targets', 'game_sessions', 'game_responses']);
  assert.equal(client.calls.some(call => call.table === 'case_coaches'), false);
  assert.equal(client.calls.some(call => call.operations.some(operation => ['insert', 'upsert', 'update'].includes(operation[0]))), false);
  assert.deepEqual(client.calls[0].operations, [['select', 'id, active'], ['eq', 'active', true]]);
  for (const call of client.calls.slice(1)) {
    assert.ok(call.operations.some(operation => operation[0] === 'in' && operation[1] === 'case_id' && operation[2].join(',') === 'case-a,case-b'));
  }
});

test('dashboard source uses shared authorization and displays the admin-view label', async () => {
  const source = await readFile(new URL('./dashboard.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(source, /canAccessCoachDashboard\(profile\)/);
  assert.match(source, /loadDashboardCases\(state\.client, session\.user\.id, profile\.role\)/);
  assert.match(html, /<a id="research-admin-label"[^>]*href="\.\.\/research-admin\/"[^>]*hidden>Research Admin View<\/a>/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});
