import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('./intake-notification.js');

const row = {
  request_id: '123e4567-e89b-42d3-a456-426614174000',
  teacher_name: 'Ms. <Teacher>', teacher_email: 'teacher@example.org',
  coach_name: 'Coach & Co', coach_email: 'coach@example.org',
  student_initials: 'A&B', grade_level: '4',
  target_behavior: 'Leaves <area>', behavior_topography: 'Walks away', primary_function: 'Escape',
  replacement_behavior: 'Requests break', desired_behavior: 'Stays nearby',
  prevention_strategies: 'Preview', teaching_strategies: 'Model', reinforcement_system: 'Praise',
  response_strategy: 'Prompt', typical_settings: 'Math', common_triggers: 'Hard tasks',
  typical_antecedents: 'Worksheet', typical_consequences: 'Break', current_staff_responses: 'Redirect',
  requested_scenarios: null, additional_context: '', has_crisis_plan: false,
  crisis_plan: 'MUST NOT APPEAR',
  fidelity_targets: [
    { domain: 'response', sort_order: 1, description: 'Respond safely' },
    { domain: 'proactive', sort_order: 2, description: 'Second proactive' },
    { domain: 'proactive', sort_order: 1, description: 'First <proactive>' },
    { domain: 'crisis', sort_order: 1, description: 'MUST NOT APPEAR' },
    { domain: 'teaching', sort_order: 1, description: 'Teach request' }
  ]
};

const formatted = handler.formatEmail(row);
assert.equal(formatted.subject, 'New Mission: Reinforceable Intake — Ms. <Teacher> / A&B');
assert.match(formatted.html, /Ms\. &lt;Teacher&gt;/);
assert.match(formatted.html, /Coach &amp; Co/);
assert.match(formatted.html, /First &lt;proactive&gt;/);
assert.doesNotMatch(formatted.html, /First <proactive>/);
assert.match(formatted.html, /123e4567-e89b-42d3-a456-426614174000/);
assert.match(formatted.text, /Request ID: 123e4567-e89b-42d3-a456-426614174000/);
const fidelityHtml = formatted.html.slice(formatted.html.indexOf('<h2>Fidelity targets</h2>'));
assert.ok(fidelityHtml.indexOf('Proactive / Prevention') < fidelityHtml.indexOf('Teaching'));
assert.ok(fidelityHtml.indexOf('Teaching') < fidelityHtml.indexOf('Response'));
assert.ok(fidelityHtml.indexOf('First &lt;proactive&gt;') < fidelityHtml.indexOf('Second proactive'));
assert.doesNotMatch(formatted.html, /MUST NOT APPEAR/);
assert.doesNotMatch(formatted.text, /MUST NOT APPEAR/);
const crisisFormatted = handler.formatEmail({ ...row, has_crisis_plan: true });
assert.match(crisisFormatted.html, /Crisis plan/);
assert.match(crisisFormatted.html, /MUST NOT APPEAR/);

Object.assign(process.env, {
  SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  RESEND_API_KEY: 'resend-key', INTAKE_NOTIFICATION_EMAIL: 'fixed@example.org',
  INTAKE_NOTIFICATION_FROM_EMAIL: 'sender@example.org'
});
const calls = [];
global.fetch = async (url, options) => {
  calls.push({ url, options });
  if (String(url).startsWith('https://database.example')) return { ok: true, json: async () => [row] };
  return { ok: true };
};
const response = {
  statusCode: 0, body: null, headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
};
await handler({ method: 'POST', body: { request_id: row.request_id } }, response);
assert.equal(response.statusCode, 200);
assert.equal(calls.length, 2);
const resendCall = calls[1];
assert.equal(resendCall.options.headers['Idempotency-Key'], `intake-request/${row.request_id}`);
const resendBody = JSON.parse(resendCall.options.body);
assert.deepEqual(resendBody.to, ['fixed@example.org']);
assert.equal(resendBody.from, 'sender@example.org');
assert.equal(resendBody.subject, formatted.subject);
assert.equal(resendBody.html, formatted.html);
assert.equal(resendBody.text, formatted.text);

const rejectedResponse = { ...response, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
await handler({ method: 'POST', body: { request_id: row.request_id, to: 'attacker@example.org' } }, rejectedResponse);
assert.equal(rejectedResponse.statusCode, 400);
assert.equal(calls.length, 2);

console.log('Intake notification formatting, safety, ordering, crisis, recipient, subject, and idempotency checks passed.');
