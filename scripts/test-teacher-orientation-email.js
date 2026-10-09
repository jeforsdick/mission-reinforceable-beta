'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { formatOrientationEmail } = require('../server/game-login-email');

test('orientation message follows meeting-day onboarding with two working site buttons', () => {
  const email = formatOrientationEmail({ teacherName: 'Sample Teacher', gameUrl: 'https://missionreinforceable.com/game/' });
  assert.equal(email.subject, 'Mission: Reinforceable — Your Adventure Starts Today!');
  assert.match(email.text, /Before we meet today/);
  assert.match(email.text, /missions@mail\.missionreinforceable\.com/);
  assert.match(email.text, /Create Your Password/);
  assert.match(email.text, /WATCH THE ORIENTATION \(OPTIONAL\)/);
  assert.match(email.text, /https:\/\/missionreinforceable\.com\/orientation/);
  assert.match(email.text, /After our meeting/);
  assert.match(email.text, /once your game is activated!/);
  assert.match(email.text, /https:\/\/missionreinforceable\.com\/game\//);

  assert.match(email.html, /YOUR ADVENTURE STARTS TODAY!/);
  assert.match(email.html, /missions@mail\.missionreinforceable\.com/);
  assert.match(email.html, /href="https:\/\/missionreinforceable\.com\/orientation"/);
  assert.match(email.html, /WATCH YOUR GAME ORIENTATION/);
  assert.match(email.html, /href="https:\/\/missionreinforceable\.com\/game\/"/);
  assert.match(email.html, /TEACHER LOGIN/);
  assert.match(email.html, /once your game is activated!/);
  assert.doesNotMatch(email.text, /\/auth\/v1\/verify/);
  assert.doesNotMatch(email.html, /href="[^"]*set-password/);
});

test('orientation content escapes display names in email HTML', () => {
  const email = formatOrientationEmail({ teacherName: '<script> Test', gameUrl: 'https://missionreinforceable.com/game/' });
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});

const caseId = '11111111-1111-4111-8111-111111111111';
const teacherId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const source = readFileSync(path.join(__dirname, '..', 'server', 'research-admin-send-orientation.js'), 'utf8');

async function invoke({ linked = true, testParticipant = true, phase = 'prebaseline', signed = true, verified = true } = {}) {
  let emails = 0;
  const datasets = [
    ['/rest/v1/cases', [{ id: caseId, archived_at: null }]],
    ['/rest/v1/participants', [{ id: '44444444-4444-4444-8444-444444444444', is_test: testParticipant, auth_user_id: linked ? teacherId : null }]],
    ['/rest/v1/research_case_phase_events', [{ phase }]],
    ['/rest/v1/case_game_content', [{ version: 2 }]],
    ['/rest/v1/case_protected_content_signoffs', signed ? [
      { review_type: 'resource_behavior_review' },
      { review_type: 'resource_privacy_review' },
      { review_type: 'resource_qa_preview' }
    ] : []],
    ['/rest/v1/profiles', [{ id: teacherId, email: 'teacher@example.org', display_name: 'Sample Teacher', role: 'teacher', active: true }]],
    ['/auth/v1/admin/users/', { id: teacherId, email: verified ? 'teacher@example.org' : 'different@example.org' }]
  ];
  const server = {
    authorize: async () => ({ id: teacherId }),
    json: (_res, status, body) => ({ status, ...body }),
    methodGuard: () => false,
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    UUID_PATTERN: /^[0-9a-f-]{36}$/,
    supabaseFetch: async query => {
      const selected = datasets.find(([prefix]) => query.startsWith(prefix));
      return { ok: true, json: async () => selected?.[1] ?? [] };
    }
  };
  const mod = { exports: {} };
  vm.runInNewContext(source, {
    module: mod,
    require: modulePath => modulePath.includes('research-admin-server') ? server : {
      configuration: () => ({
        enabled: true,
        gameUrl: 'https://missionreinforceable.com/game/',
        from: 'missions@mail.missionreinforceable.com'
      }),
      formatOrientationEmail: () => ({ subject: 'Test orientation', text: 'Test message', html: '<p>Test</p>' })
    },
    fetch: async () => {
      emails += 1;
      return { ok: true, json: async () => ({ id: 'mock-resend-id' }) };
    },
    process: { env: { RESEND_API_KEY: 'test-only' } }
  }, { filename: 'research-admin-send-orientation.js' });
  const result = await mod.exports({ body: { action: 'send_orientation', case_id: caseId, request_id: attemptId } }, {});
  return { result, emails };
}

test('QA teacher can receive orientation without activating game', async () => {
  const { result, emails } = await invoke();
  assert.equal(result.status, 200);
  assert.equal(result.delivered, true);
  assert.equal(emails, 1);
});

test('a linked teacher account is mandatory', async () => {
  const { result, emails } = await invoke({ linked: false });
  assert.equal(result.status, 409);
  assert.equal(emails, 0);
});

test('current protected-version signoffs are mandatory', async () => {
  const { result, emails } = await invoke({ signed: false });
  assert.equal(result.status, 409);
  assert.equal(emails, 0);
});

test('real participants cannot receive game orientation during baseline', async () => {
  const { result, emails } = await invoke({ testParticipant: false, phase: 'baseline' });
  assert.equal(result.status, 409);
  assert.equal(emails, 0);
});

test('real participants can receive game orientation during intervention', async () => {
  const { result, emails } = await invoke({ testParticipant: false, phase: 'intervention' });
  assert.equal(result.status, 200);
  assert.equal(emails, 1);
});

test('teacher identity mismatch prevents sending', async () => {
  const { result, emails } = await invoke({ verified: false });
  assert.equal(result.status, 409);
  assert.equal(emails, 0);
});
