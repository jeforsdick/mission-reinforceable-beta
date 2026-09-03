import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('../server/teacher-reminder-service.js');
const sharedEmail = require('../server/mission-reminder-email.js');
const migration = fs.readFileSync(new URL('../supabase/migrations/20260814010000_teacher_reminders.sql', import.meta.url), 'utf8');
const recoveryMigration = fs.readFileSync(new URL('../supabase/migrations/20260820000000_teacher_reminder_stale_pending_recovery.sql', import.meta.url), 'utf8');
const safetyMigration = fs.readFileSync(new URL('../supabase/migrations/20260902000000_teacher_reminder_daily_safety.sql', import.meta.url), 'utf8');
const completionCorrection = fs.readFileSync(new URL('../supabase/migrations/20260903010000_correct_reminder_any_valid_mission.sql', import.meta.url), 'utf8');
const scheduleDocumentation = fs.readFileSync(new URL('../docs/teacher-reminder-schedule.md', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const dailyRoute = fs.readFileSync(new URL('./teacher-daily-prompt.js', import.meta.url), 'utf8');
const retryRoute = fs.readFileSync(new URL('./teacher-daily-prompt-retry.js', import.meta.url), 'utf8');
const apiDirectory = new URL('./', import.meta.url);

Object.assign(process.env, {
  CRON_SECRET: 'cron-secret', SUPABASE_URL: 'https://database.example',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret', RESEND_API_KEY: 'resend-secret',
  TEACHER_REMINDER_FROM_EMAIL: 'Mission <mission@example.org>',
  TEACHER_GAME_URL: 'https://mission.example.org/game/', TEACHER_REMINDER_TIMEZONE: 'America/Denver',
  TEACHER_REMINDER_TEST_EMAIL: 'smoke@example.org', TEACHER_REMINDER_SYSTEM_ENABLED: 'true',
  TEST_EMAIL_RECIPIENT: 'path-test@example.org'
});

const participant = { participant_id: '11111111-1111-4111-8111-111111111111', case_id: '22222222-2222-4222-8222-222222222222', teacher_name: 'Jordan <Rivera>', teacher_email: 'teacher@example.org' };
const now = () => new Date('2026-08-15T01:30:00.000Z'); // August 14 in study timezone.
const makeResponse = () => ({ statusCode: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const invoke = async (handler, authorization = 'Bearer cron-secret', overrides = {}) => { const response = makeResponse(); await handler({ method: 'GET', headers: { authorization }, ...overrides }, response); return response; };

function mockFetch({ candidates = [participant], completed = false, eventStatus = null, resendOutcomes = [true], sentPatchOk = true } = {}) {
  const calls = [];
  let status = eventStatus;
  let resendAttempt = 0;
  const fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/eligible_teacher_reminders')) return { ok: true, status: 200, json: async () => candidates };
    if (String(url).includes('/rpc/has_completed_mission_on_study_date')) return { ok: true, status: 200, json: async () => completed };
    if (String(url).includes('/rpc/claim_teacher_reminder_event')) {
      const retry = JSON.parse(options.body).retry_reclamation;
      const claimed = retry ? status === 'failed' || status === 'stale_pending' : status === null;
      if (claimed) status = 'pending';
      return { ok: true, status: 200, json: async () => [{ event_id: 'event-1', claimed }] };
    }
    if (String(url) === 'https://api.resend.com/emails') {
      const ok = resendOutcomes[Math.min(resendAttempt++, resendOutcomes.length - 1)];
      return { ok, status: ok ? 200 : 503, json: async () => ({ id: 'resend-1' }) };
    }
    if (String(url).includes('/teacher_reminder_events?id=eq.')) {
      const nextStatus = JSON.parse(options.body).status;
      if (nextStatus === 'sent' && !sentPatchOk) return { ok: false, status: 503 };
      status = nextStatus;
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
assert.match(recoveryMigration, /existing\.status = 'failed'/);
assert.match(recoveryMigration, /existing\.status = 'pending'[\s\S]*interval '30 minutes'/);
assert.match(recoveryMigration, /attempt_count = existing\.attempt_count \+ 1/);
assert.doesNotMatch(recoveryMigration, /cascade/i);
assert.deepEqual(vercel.crons, [
  { path: '/api/teacher-daily-prompt', schedule: '0 14 * * 1-5' },
  { path: '/api/teacher-daily-prompt-retry', schedule: '0 16 * * 1-5' }
]);
assert.ok(vercel.crons.every(cron => !cron.schedule.includes('* * * 1-5')), 'reminder jobs must not run hourly');
assert.match(scheduleDocumentation, /approximately 8 AM during Mountain Daylight Time and 7 AM during Mountain Standard Time/);
assert.match(scheduleDocumentation, /closest year-round compromise to approximately 7:30 AM Mountain Time/);
assert.equal(new Set(vercel.crons.map(cron => cron.path)).size, vercel.crons.length);
assert.equal(JSON.stringify(vercel).includes('followup'), false);
for (const route of [dailyRoute, retryRoute]) {
  assert.match(route, /module\.exports = createHandler\(TYPES\.DAILY/);
  assert.doesNotMatch(route, /TYPES\.FOLLOWUP|followup_reminder/);
}
assert.match(retryRoute, /createHandler\(TYPES\.DAILY, \{ retry: true \}\)/);
assert.doesNotMatch(dailyRoute, /retry: true/);
assert.equal(service.TYPES.DAILY, 'daily_prompt');
for (const helper of ['teacher-reminder-service.js', 'granite-study-calendar.js', 'teacher-followup-reminder.js']) {
  assert.equal(fs.existsSync(new URL(helper, apiDirectory)), false, `${helper} must not consume an API function slot`);
}
for (const route of ['teacher-daily-prompt.js', 'teacher-daily-prompt-retry.js', 'teacher-reminder-smoke-test.js']) {
  assert.equal(fs.existsSync(new URL(route, apiDirectory)), true, `${route} must remain deployed`);
}
const deployedApiRoutes = fs.readdirSync(apiDirectory).filter(file => file.endsWith('.js'));
assert.ok(deployedApiRoutes.length <= 12, `expected at most 12 API routes, found ${deployedApiRoutes.length}`);

// Approved text, greeting personalization, and privacy boundaries.
const daily = service.emailFor(service.TYPES.DAILY, participant.teacher_name, process.env.TEACHER_GAME_URL);
const followup = service.emailFor(service.TYPES.FOLLOWUP, participant.teacher_name, process.env.TEACHER_GAME_URL);
assert.equal(daily.subject, 'Mission: Reinforceable — Today’s Mission Is Ready');
assert.match(daily.text, /Good morning, Jordan!/);
assert.match(daily.html, /Good morning, Jordan!/);
assert.doesNotMatch(daily.html, /&lt;Rivera&gt;/);
assert.match(followup.text, /^Hello Jordan <Rivera>,/);
assert.match(followup.html, /^.*Hello Jordan &lt;Rivera&gt;,/);
for (const forbidden of ['Student Alias X', 'Case-99', 'Study-88', 'escape behavior', 'fidelity score', 'Coach Smith']) {
  assert.doesNotMatch(daily.text + daily.html + followup.text + followup.html, new RegExp(forbidden, 'i'));
}
assert.match(daily.text, /jess\.olson@utah\.edu/);
const fallbackDaily = service.emailFor(service.TYPES.DAILY, null, process.env.TEACHER_GAME_URL);
assert.match(fallbackDaily.text, /Good morning, Hero!/);
assert.match(fallbackDaily.html, /Good morning, Hero!/);
assert.equal(daily.from, sharedEmail.SENDER);

// Scheduling is study-wide; no schema, runtime, or documentation contract
// retains participant-specific reminder-time configuration.
assert.doesNotMatch(safetyMigration + scheduleDocumentation + JSON.stringify(vercel), /preferred_reminder_time/i);

// The corrective migration accepts each study-valid mode, validates its mission
// against the matching current published pool, and retains every isolation gate.
for (const condition of [
  /create or replace function public\.has_completed_mission_on_study_date/,
  /gs\.participant_id = target_participant_id/, /gs\.case_id = target_case_id/,
  /gs\.status = 'completed'/, /gs\.qa_mode = false/,
  /gs\.mode in \('daily', 'mystery', 'crisis'\)/,
  /gs\.game_content_version = content\.version/,
  /when 'daily' then content\.daily_missions/,
  /when 'mystery' then content\.wildcard_missions/,
  /when 'crisis' then content\.crisis_missions/,
  /published_mission ->> 'id' = gs\.mission_id/,
  /gs\.ended_at at time zone 'America\/Denver'/
]) assert.match(completionCorrection, condition);
for (const forbidden of [/YYYYMMDD/i, /replace\(target_study_date/, /gs\.mode = 'daily'/])
  assert.doesNotMatch(completionCorrection, forbidden);
assert.match(safetyMigration, /where not retry_reclamation/);
assert.match(safetyMigration, /where retry_reclamation[\s\S]*existing\.status = 'failed'[\s\S]*existing\.status = 'pending'/);

assert.equal(service.studyDate(now(), 'America/Denver'), '2026-08-14');
assert.equal(service.studyDate(new Date('2027-01-15T06:30:00Z'), 'America/Denver'), '2027-01-14'); // MST
assert.equal(service.studyDate(new Date('2026-07-15T05:30:00Z'), 'America/Denver'), '2026-07-14'); // MDT
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

// The production kill switch returns quietly before configuration validation or external work.
delete process.env.TEACHER_REMINDER_SYSTEM_ENABLED;
const supabaseUrl = process.env.SUPABASE_URL;
delete process.env.SUPABASE_URL;
response = await invoke(handler);
assert.equal(response.statusCode, 200);
assert.deepEqual(response.body, { enabled: false, sent: 0, skipped: 0, failed: 0 });
assert.equal(mock.calls.length, 0);
process.env.SUPABASE_URL = supabaseUrl;
process.env.TEACHER_REMINDER_SYSTEM_ENABLED = 'false';
response = await invoke(handler);
assert.equal(response.statusCode, 200);
assert.deepEqual(response.body, { enabled: false, sent: 0, skipped: 0, failed: 0 });
assert.equal(mock.calls.length, 0);
process.env.TEACHER_REMINDER_SYSTEM_ENABLED = 'true';

// Eligible daily prompt sends only server-selected fields and stable idempotency metadata.
response = await invoke(handler);
assert.equal(response.statusCode, 200);
assert.equal(response.body.sent, 1);
assert.deepEqual(JSON.parse(mock.calls.find(call => call.url.includes('/rpc/eligible_teacher_reminders')).options.body), { require_followup: false });
const resend = mock.calls.find(call => call.url.includes('resend.com'));
assert.equal(resend.options.headers['Idempotency-Key'], `teacher-reminder/${participant.participant_id}/2026-08-14/daily_prompt`);
const payload = JSON.parse(resend.options.body);
assert.deepEqual(payload.to, [participant.teacher_email]);
assert.equal(payload.subject, daily.subject);
assert.equal(payload.from, 'Mission: Reinforceable <missions@mail.missionreinforceable.com>');
assert.equal(payload.html, daily.html);
assert.equal(payload.text, daily.text);
assert.equal(payload.html, sharedEmail.buildMissionReminderEmail(process.env.TEACHER_GAME_URL, participant.teacher_name, daily.subject).html);
assert.ok(!JSON.stringify(payload).includes(participant.case_id));
for (const secret of [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.RESEND_API_KEY]) {
  assert.doesNotMatch(JSON.stringify(payload) + JSON.stringify(response.body), new RegExp(secret));
}

// Sent and pending claims cannot produce duplicate or concurrent sends.
mock = mockFetch({ eventStatus: 'sent' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped }, { sent: 0, skipped: 1 });
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
mock = mockFetch({ eventStatus: 'pending' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped }, { sent: 0, skipped: 1 });
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
mock = mockFetch({ eventStatus: 'failed' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped }, { sent: 0, skipped: 1 });
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
mock = mockFetch({ eventStatus: 'stale_pending' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now, retry: true }));
assert.equal(response.body.sent, 1);
assert.equal(mock.calls.filter(call => call.url.includes('resend.com')).length, 1);

// Daily completion is checked in relational game_sessions through the exact RPC.
mock = mockFetch({ completed: true });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.equal(response.body.skipped, 1);
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);
const completionCall = mock.calls.find(call => call.url.includes('/rpc/has_completed_mission_on_study_date'));
assert.deepEqual(JSON.parse(completionCall.options.body), { target_participant_id: participant.participant_id, target_case_id: participant.case_id, target_study_date: '2026-08-14', study_timezone: 'America/Denver' });

// Retry uses the same completion RPC and suppresses before reclaiming or sending.
mock = mockFetch({ completed: true, eventStatus: 'failed' });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now, retry: true }));
assert.equal(response.body.skipped, 1);
assert.equal(mock.calls.some(call => call.url.includes('/rpc/claim_teacher_reminder_event')), false);
assert.equal(mock.calls.some(call => call.url.includes('resend.com')), false);

mock = mockFetch({ completed: false });
response = await invoke(service.createHandler(service.TYPES.FOLLOWUP, { fetch: mock.fetch, now }));
assert.equal(response.body.sent, 1);
assert.match(JSON.parse(mock.calls.find(call => call.url.includes('resend.com')).options.body).text, /^Hello Jordan <Rivera>,/);

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

// Dissertation production fails closed unless timezone and clean authenticated game URL are exact.
process.env.TEACHER_REMINDER_TIMEZONE = 'UTC';
mock = mockFetch();
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.equal(response.statusCode, 500);
assert.equal(mock.calls.length, 0);
process.env.TEACHER_REMINDER_TIMEZONE = timezone;
const gameUrl = process.env.TEACHER_GAME_URL;
process.env.TEACHER_GAME_URL = 'https://mission.example.org/game/?teacher=someone@example.org';
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.equal(response.statusCode, 500);
assert.equal(mock.calls.length, 0);
process.env.TEACHER_GAME_URL = gameUrl;

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
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now, retry: true }));
assert.equal(response.statusCode, 200);
assert.equal(response.body.sent, 1);
const resendCalls = mock.calls.filter(call => call.url.includes('resend.com'));
assert.equal(resendCalls.length, 2);
assert.equal(resendCalls[0].options.headers['Idempotency-Key'], resendCalls[1].options.headers['Idempotency-Key']);
assert.equal(resendCalls[1].options.headers['Idempotency-Key'], `teacher-reminder/${participant.participant_id}/2026-08-14/daily_prompt`);

// A provider success followed by an event PATCH failure stays pending for stale recovery.
mock = mockFetch({ sentPatchOk: false });
response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now }));
assert.equal(response.statusCode, 502);
assert.deepEqual({ sent: response.body.sent, failed: response.body.failed }, { sent: 0, failed: 1 });
assert.equal(mock.calls.filter(call => call.options.method === 'PATCH').length, 1);

// Ineligible dates return before candidate lookup or event claim.
for (const instant of ['2026-08-16T16:00:00Z', '2026-09-07T16:00:00Z', '2026-08-11T16:00:00Z', '2027-05-27T16:00:00Z']) {
  mock = mockFetch();
  response = await invoke(service.createHandler(service.TYPES.DAILY, { fetch: mock.fetch, now: () => new Date(instant) }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.eligible_study_day, false);
  assert.deepEqual({ sent: response.body.sent, skipped: response.body.skipped, failed: response.body.failed }, { sent: 0, skipped: 0, failed: 0 });
  assert.equal(mock.calls.length, 0);
}

// Smoke test uses only the server test recipient and does not call Supabase.
mock = mockFetch();
process.env.TEACHER_REMINDER_SYSTEM_ENABLED = 'false';
response = await invoke(service.createSmokeTestHandler({ fetch: mock.fetch }));
assert.equal(response.statusCode, 200);
const smokeSend = mock.calls.at(0);
assert.equal(smokeSend.url, 'https://api.resend.com/emails');
assert.equal(smokeSend.options.headers['Idempotency-Key'], 'teacher-reminder-smoke-test/daily-prompt-production-v1');
assert.deepEqual(JSON.parse(smokeSend.options.body).to, ['smoke@example.org']);
const smokePayload = JSON.parse(smokeSend.options.body);
assert.equal(smokePayload.subject, daily.subject);
assert.equal(smokePayload.from, sharedEmail.SENDER);
assert.equal(smokePayload.html, fallbackDaily.html);
assert.equal(smokePayload.text, fallbackDaily.text);
assert.equal(mock.calls.some(call => call.url.includes('supabase') || call.url.includes('teacher_reminder_events')), false);

// The temporary path test reuses the smoke-test function and has its own narrow POST action.
mock = mockFetch();
response = await invoke(service.createSmokeTestHandler({ fetch: mock.fetch }), 'Bearer cron-secret', { method: 'POST', query: { action: 'resend-email-test' } });
assert.equal(response.statusCode, 200);
assert.deepEqual(response.body, { success: true, message_id: 'resend-1' });
const pathTestSend = JSON.parse(mock.calls.at(0).options.body);
assert.equal(pathTestSend.from, 'Mission: Reinforceable <missions@mail.missionreinforceable.com>');
assert.deepEqual(pathTestSend.to, ['path-test@example.org']);
assert.equal(pathTestSend.subject, 'Your Mission: Reinforceable mission is ready');
assert.match(pathTestSend.html, /^<!doctype html>/);
assert.match(pathTestSend.text, /Good morning, Hero!/);
for (const body of [pathTestSend.html, pathTestSend.text]) {
  assert.match(body, /START TODAY'S MISSION/);
  assert.match(body, /https:\/\/mission\.example\.org\/game\//);
  assert.match(body, /jess\.olson@utah\.edu/);
  assert.match(body, /continue implementing the student's behavior support plan as usual/);
}
assert.match(pathTestSend.html, /alt="A magical Mission: Reinforceable classroom ready for today's mission"/);
const requiredEmailAssets = [
  'mission-reinforceable-title.png', 'landing-page-classroom.png', 'heart-icon.png',
  'behavior-xp-icon.png', 'hat-icon.png', 'potion-icon.png', 'sparkle-icon.png'
];
for (const asset of requiredEmailAssets) {
  assert.ok(pathTestSend.html.includes(`https://mission.example.org/assets/game/skin-v2/${asset}`));
}
assert.doesNotMatch(pathTestSend.html, /sword[^"'<> ]*\.png/i);
for (const altText of ['Heart', 'Behavior XP encouragement', 'Support potion', 'Research scholar hat', 'Magical sparkle']) {
  assert.match(pathTestSend.html, new RegExp(`alt="${altText}"`));
}
assert.match(pathTestSend.html, /href="https:\/\/mission\.example\.org\/game\/"[^>]*>START TODAY'S MISSION<\/a>/);
assert.match(pathTestSend.html, /v:roundrect[\s\S]*START TODAY'S MISSION[\s\S]*<!\[endif\]-->/);
assert.match(pathTestSend.html, /width:100%;max-width:598px;height:auto/);
for (const supportCopy of [
  'Do not reply directly to this email.',
  'If you have difficulty accessing the mission, please contact Jess at ',
  "If the mission is unavailable or you are unable to complete it, please continue implementing the student's behavior support plan as usual."
]) {
  assert.match(pathTestSend.html, new RegExp(supportCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pathTestSend.text, new RegExp(supportCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.ok(pathTestSend.html.length > 0 && pathTestSend.text.length > 0);
assert.doesNotMatch(JSON.stringify(pathTestSend), /api-key|cron-secret|service-key/);
assert.doesNotMatch(JSON.stringify(response.body), /api-key|cron-secret|service-key/);
response = await invoke(service.createSmokeTestHandler({ fetch: mock.fetch }), 'Bearer wrong', { method: 'POST', query: { action: 'resend-email-test' } });
assert.equal(response.statusCode, 401);
process.env.TEST_EMAIL_RECIPIENT = '';
response = await invoke(service.createSmokeTestHandler({ fetch: mock.fetch }), 'Bearer cron-secret', { method: 'POST', query: { action: 'resend-email-test' } });
assert.deepEqual({ status: response.statusCode, body: response.body }, { status: 503, body: { error: 'Test email configuration is incomplete' } });
process.env.TEST_EMAIL_RECIPIENT = 'path-test@example.org';
mock = mockFetch({ resendOutcomes: [false] });
response = await invoke(service.createSmokeTestHandler({ fetch: mock.fetch }), 'Bearer cron-secret', { method: 'POST', query: { action: 'resend-email-test' } });
assert.deepEqual({ status: response.statusCode, body: response.body }, { status: 502, body: { error: 'Test email could not be sent' } });
process.env.TEACHER_REMINDER_SYSTEM_ENABLED = 'true';

console.log('Teacher reminder eligibility, privacy, authorization, completion, failure, timezone, and idempotency checks passed.');
