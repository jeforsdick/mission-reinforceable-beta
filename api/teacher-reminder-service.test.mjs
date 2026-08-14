import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('./teacher-reminder-service.js');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260814010000_teacher_reminders.sql', import.meta.url), 'utf8');

Object.assign(process.env, {
  CRON_SECRET: 'cron-secret', SUPABASE_URL: 'https://database.example',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret', RESEND_API_KEY: 'resend-secret',
  TEACHER_REMINDER_FROM_EMAIL: 'Mission <mission@example.org>',
  TEACHER_GAME_URL: 'https://mission.example.org/game', TEACHER_REMINDER_TIMEZONE: 'America/Denver'
});

const participant = { participant_id: '11111111-1111-4111-8111-111111111111', case_id: '22222222-2222-4222-8222-222222222222', teacher_name: 'Ms. <Rivera>', teacher_email: 'teacher@example.org' };
const now = () => new Date('2026-08-15T01:30:00.000Z'); // August 14 in study timezone.
const makeResponse = () => ({ statusCode: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const invoke = async (handler, authorization = 'Bearer cron-secret') => { const response = makeResponse(); await handler({ method: 'GET', headers: { authorization } }, response); return response; };

function mockFetch({ candidates = [participant], completed = false, eventStatus = null, resendOutcomes = [true] } = {}) {
  const calls = [];
  let status = eventStatus;
  let resendAttempt = 0;
  const fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/eligible_teacher_reminders')) return { ok: true, status: 200, json: async () => candidates };
    if (String(url).includes('/rpc/has_completed_mission_on_study_date')) return { ok: true, status: 200, json: async () => completed };
    if (String(url).includes('/rpc/claim_teacher_reminder_event')) {
      const claimed = status === null || status === 'failed';
      if (claimed) status = 'pending';
      return { ok: true, status: 200, json: async () => [{ event_id: 'event-1', claimed }] };
    }
    if (String(url) === 'https://api.resend.com/emails') {
      const ok = resendOutcomes[Math.min(resendAttempt++, resendOutcomes.length - 1)];
      return { ok, status: ok ? 200 : 503, json: async () => ({ id: 'resend-1' }) };
    }
    if (String(url).includes('/teacher_reminder_events?id=eq.')) {
      status = JSON.parse(options.body).status;
      return { ok: true, status: 204 };
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return { fetch, calls };
}

// Schema defaults and all eligibility gates are explicit; intake/case creation has no activation trigger.
assert.match(migration, /enabled boolean not null default false/);
assert.match(migration, /followup_enabled boolean not null default false/);
assert.match(migration, /and p\.active and c\.active and pr\.active and pr\.role = 'teacher'/);
assert.match(migration, /trs\.activated_at is not null and trs\.activated_at <= now\(\)/);
assert.match(migration, /trs\.deactivated_at is null or trs\.deactivated_at > now\(\)/);
assert.match(migration, /unique\s*\(participant_id, study_date, reminder_type\)/s);
assert.match(migration, /where existing\.status = 'failed'/);
assert.match(migration, /attempt_count = existing\.attempt_count \+ 1/);
for (const signature of ['eligible_teacher_reminders\\(boolean\\)', 'has_completed_mission_on_study_date\\(uuid, date, text\\)', 'claim_teacher_reminder_event\\(uuid, uuid, text, date\\)']) {
  assert.match(migration, new RegExp(`revoke execute on function public\\.${signature} from anon, authenticated`));
  assert.match(migration, new RegExp(`grant execute on function public\\.${signature} to service_role`));
}
assert.doesNotMatch(migration, /create trigger[^;]*(participants|cases|case_intake)/is);

// Approved text, greeting personalization, and privacy boundaries.
const daily = service.emailFor(service.TYPES.DAILY, participant.teacher_name, process.env.TEACHER_GAME_URL);
const followup = service.emailFor(service.TYPES.FOLLOWUP, participant.teacher_name, process.env.TEACHER_GAME_URL);
assert.equal(daily.subject, 'Mission: Reinforceable — Today’s Mission Is Ready');
assert.doesNotMatch(daily.text, /Rivera/);
assert.match(followup.text, /^Hello Ms\. <Rivera>,/);
assert.match(followup.html, /^.*Hello Ms\. &lt;Rivera&gt;,/);
for (const forbidden of ['Student Alias X', 'Case-99', 'Study-88', 'escape behavior', 'fidelity score', 'Coach Smith']) {
  assert.doesNotMatch(daily.text + daily.html + followup.text + followup.html, new RegExp(forbidden, 'i'));
}
assert.match(daily.text, /approximately 5 minutes/);
assert.match(daily.text, /jess\.olson@utah\.edu/);

assert.equal(service.studyDate(now(), 'America/Denver'), '2026-08-14');
assert.throws(() => service.studyDate(now(), ''), /required/);
assert.throws(() => service.studyDate(now(), 'Not\/A_Timezone'), /invalid/);
assert.equal(service.idempotencyKey(participant.participant_id, '2026-08-14', service.TYPES.DAILY), `teacher-reminder/${participant.participant_id}/2026-08-14/daily_prompt`);
assert.notEqual(service.idempotencyKey(participant.participant_id, '2026-08-14', service.TYPES.DAILY), service.idempotencyKey(participant.participant_id, '2026-08-14', service.TYPES.FOLLOWUP));

// Public callers cannot trigger the job.
let mock = mockFetch();
let handler = service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now });
let response = await invoke(handler, 'Bearer wrong');
assert.equal(response.statusCode, 401);
assert.equal(mock.calls.length, 0);

// Eligible daily prompt sends only server-selected fields and stable idempotency metadata.
response = await invoke(handler);
assert.equal(response.statusCode, 200);
assert.equal(response.body.sent, 1);
const resend = mock.calls.find(call => call.url.includes('resend.com'));
assert.equal(resend.options.headers['Idempotency-Key'], `teacher-reminder/${participant.participant_id}/2026-08-14/daily_prompt`);
const payload = JSON.parse(resend.options.body);
assert.deepEqual(payload.to, [participant.teacher_email]);
assert.equal(payload.subject, daily.subject);
assert.ok(!JSON.stringify(payload).includes(participant.case_id));

// Sent and pending claims cannot produce duplicate or concurrent sends.
mock = mockFetch({ eventStatus: 'sent' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped }, { sent: 0, skipped: 1 });
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
mock = mockFetch({ eventStatus: 'pending' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped }, { sent: 0, skipped: 1 });
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);

// Follow-up completion is checked in relational game_sessions through the RPC.
mock = mockFetch({ completed: true });
response = await invoke(service.createHandler(service.TYPES.FOLLOWUP, { fetch: mock.fetch, now }));
assert.equal(response.body.skipped, 1);
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
assert.match(migration, /from public\.game_sessions gs[\s\S]*gs\.status = 'completed'/);

mock = mockFetch({ completed: false });
response = await invoke(service.createHandler(service.TYPES.FOLLOWUP, { fetch: mock.fetch, now }));
assert.equal(response.body.sent, 1);
assert.match(JSON.parse(mock.calls.find(call => call.url.includes('resend.com')).options.body).text, /^Hello Ms\. <Rivera>,/);

// followup_enabled=false is excluded by the service-only candidate RPC (empty result).
mock = mockFetch({ candidates: [] });
response = await invoke(service.createHandler(service.TYPES.FOLLOWUP, { fetch: mock.fetch, now }));
assert.equal(response.body.sent, 0);
assert.match(migration, /not require_followup or trs\.followup_enabled/);

// Missing timezone fails before database/email work.
const timezone = process.env.TEACHER_REMINDER_TIMEZONE;
delete process.env.TEACHER_REMINDER_TIMEZONE;
mock = mockFetch();
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.equal(response.statusCode, 500);
assert.equal(mock.calls.length, 0);
process.env.TEACHER_REMINDER_TIMEZONE = timezone;

// Resend failure marks only the operational event failed and never touches game/study rows.
mock = mockFetch({ resendOutcomes: [false, true] });
handler = service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now });
response = await invoke(handler);
assert.equal(response.statusCode, 502);
assert.equal(response.body.failed, 1);
const patch = mock.calls.find(call => call.options.method === 'PATCH');
assert.deepEqual(JSON.parse(patch.options.body), { status: 'failed' });
assert.equal(mock.calls.some(call => /game_sessions|participants|cases/.test(call.url) && call.options.method === 'PATCH'), false);

// A failed row is reclaimed; the retry retains the exact provider key.
response = await invoke(handler);
assert.equal(response.statusCode, 200);
assert.equal(response.body.sent, 1);
const resendCalls = mock.calls.filter(call => call.url.includes('resend.com'));
assert.equal(resendCalls.length, 2);
assert.equal(resendCalls[0].options.headers['Idempotency-Key'], resendCalls[1].options.headers['Idempotency-Key']);
assert.equal(resendCalls[1].options.headers['Idempotency-Key'], `teacher-reminder/${participant.participant_id}/2026-08-14/daily_prompt`);

console.log('Teacher reminder eligibility, privacy, authorization, completion, failure, timezone, and idempotency checks passed.');
