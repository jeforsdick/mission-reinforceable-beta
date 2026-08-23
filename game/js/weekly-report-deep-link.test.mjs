import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const auth = await read('./auth.js');
const weekly = await read('./weekly-checkin.js');
const app = await read('./app.js');
const index = await read('../index.html');

function authApi(search) {
  const context = {
    console, Date, Intl, URLSearchParams, FormData: class {}, setTimeout, clearTimeout,
    window: { MR: {}, supabase: { createClient() { return {}; } }, location: { search } },
    document: { addEventListener() {} }
  };
  vm.createContext(context);
  vm.runInContext(auth, context);
  return context.window.MR.auth;
}

test('only the generic weekly_report=1 flag enables email entry mode', () => {
  assert.equal(authApi('').isWeeklyReportEntry(''), false);
  assert.equal(authApi('?weekly_report=0').isWeeklyReportEntry('?weekly_report=0'), false);
  assert.equal(authApi('?weekly_report=1').isWeeklyReportEntry('?weekly_report=1'), true);
  assert.doesNotMatch(weekly, /participant[_ -]?id|case[_ -]?id|teacher[_ -]?email|week[_ -]?id|secret[_ -]?token/i);
});

test('weekly entry cannot be combined with any QA route', () => {
  for (const query of [
    '?weekly_report=1&qa_case=C',
    '?weekly_report=1&qa_draft_type=daily',
    '?weekly_report=1&qa_draft_slot=1',
    '?weekly_report=1&qa_full_draft=1'
  ]) assert.throws(() => authApi(query).isWeeklyReportEntry(query), /not available in QA preview/);
  assert.match(weekly, /assignment\.qaMode/);
  assert.match(weekly, /!assignment\?\.weeklyReportMode \|\| assignment\.qaMode/);
});

test('signed-out deep links retain the normal login and authenticated init opens the report directly', () => {
  assert.match(index, /<h1 id="login-title">Teacher Login<\/h1>/);
  assert.match(auth, /data && data\.user \? data\.user : await waitForLogin\(supabaseClient\)/);
  assert.match(auth, /activeParticipant\(supabaseClient, user\)[\s\S]*activeCase\(supabaseClient, participant\)/);
  assert.match(app, /await loadAssignedGame\(assignment\)[\s\S]*await MR\.weeklyCheckin\.init\(assignment\)[\s\S]*if \(assignment\.weeklyReportMode\) return;/);
});

test('standalone unavailable, completed, and successful-submission states do not navigate home', () => {
  assert.match(weekly, /This report is not available right now\./);
  assert.match(weekly, /This week's report is already complete\. Thank you!/);
  assert.match(weekly, /Weekly Teacher Report complete — thank you!/);
  assert.match(weekly, /You may close this page\./);
  assert.doesNotMatch(weekly, /setTimeout|setScreen\('home'\)/);
  assert.match(index, /id="weekly-checkin-sign-out"[\s\S]*>Sign Out<\/button>/);
});

test('report payload and protected Supabase RPC path remain unchanged', () => {
  for (const key of ['accessRating', 'manageabilityRating', 'bspRelevanceRating', 'implementationThinkingRating', 'feedbackUsefulnessRating', 'targetBehaviorRating', 'replacementBehaviorRating', 'barriersFacilitators', 'behaviorContextNote']) {
    assert.match(weekly, new RegExp(`${key}:`));
  }
  assert.match(auth, /rpc\('submit_weekly_teacher_report'/);
  assert.match(auth, /weekly_teacher_checkins/);
});
