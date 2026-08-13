import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeCase, coachingCopy, sessionPercent, statusFor } from './dashboard-metrics.mjs';

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

test('dashboard source gates data behind coach auth and assigned case IDs', async () => {
  const source = await readFile(new URL('./dashboard.js', import.meta.url), 'utf8');
  assert.match(source, /profile\.role !== 'coach' \|\| !profile\.active/);
  assert.match(source, /from\('case_coaches'\).*eq\('coach_user_id', userId\).*eq\('active', true\)/s);
  assert.match(source, /\.in\('case_id', caseIds\)/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});
