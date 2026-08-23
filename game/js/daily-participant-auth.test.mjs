import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');

async function authHarness({ search = '', user = null, rpcResult = null, participant, caseAssignment } = {}) {
  const calls = { signOut: [], from: [], rpc: [] };
  const listeners = {};
  const documentListeners = {};
  let interval;
  const auth = {
    async getUser() { return { data: { user }, error: null }; },
    async signOut(options) { calls.signOut.push(options); return { error: null }; }
  };
  const supabase = {
    auth,
    from(table) {
      calls.from.push(table);
      const row = table === 'participants'
        ? participant || { id: 'participant', participant_code: 'P1', case_id: 'case' }
        : caseAssignment || { id: 'case', case_code: 'CASE-001' };
      return {
        select() { return this; }, eq() { return this; },
        async maybeSingle() { return { data: row, error: null }; }
      };
    },
    async rpc(name, args) { calls.rpc.push(name); calls.rpcArgs = calls.rpcArgs || []; calls.rpcArgs.push(args); return { data: rpcResult, error: null }; }
  };
  const context = {
    console, Date, Intl, URLSearchParams, FormData: class {},
    setTimeout, clearTimeout,
    window: {
      MR: { $: () => null, setScreen() {} }, supabase: { createClient: () => supabase },
      location: { search, reload() { calls.reload = (calls.reload || 0) + 1; } },
      setInterval(fn) { interval = fn; return 1; },
      addEventListener(name, fn) { listeners[name] = fn; }
    },
    document: {
      visibilityState: 'visible',
      addEventListener(name, fn) { documentListeners[name] = fn; }
    }
  };
  vm.createContext(context);
  vm.runInContext(await read('./study-date.js'), context);
  vm.runInContext(await read('./auth.js'), context);
  return { MR: context.window.MR, calls, listeners, documentListeners, runInterval: () => interval() };
}

const today = new Date();

test('logout is bound before assignment loading and only by session wiring', async () => {
  const app = await read('./app.js');
  const init = app.slice(app.indexOf('async function init()'));
  assert.ok(init.indexOf('wireSessionEvents();') < init.indexOf('MR.auth.getAssignment()'));
  assert.equal((app.match(/logoutButton\.addEventListener\('click'/g) || []).length, 1);
});

test('assignment failure path retains the independently wired logout control', async () => {
  const app = await read('./app.js');
  assert.match(app, /wireSessionEvents\(\);[\s\S]*?try \{[\s\S]*?getAssignment\(\)[\s\S]*?catch \(error\)/);
  assert.match(app, /await MR\.auth\.signOut\(\);[\s\S]*?window\.location\.reload\(\)/);
});

test('current Denver-day sign-in is accepted and same-day refresh does not sign out', async () => {
  const { MR, calls } = await authHarness({ user: { id: 'u', last_sign_in_at: today.toISOString() } });
  assert.equal(MR.auth.hasCurrentStudyDaySignIn({ last_sign_in_at: today.toISOString() }, today), true);
  await MR.auth.getAssignment();
  assert.deepEqual(calls.signOut, []);
});

test('only the exact active Kai assignment and test email receive the calendar bypass', async () => {
  const base = {
    user: { id: 'u', email: 'kai@testemail.com', last_sign_in_at: today.toISOString() },
    participant: { id: 'p', participant_code: 'MR-DEMO-2', case_id: 'c', active: true },
    caseAssignment: { id: 'c', case_code: 'CASE-DEMO-2', active: true }
  };
  assert.equal((await (await authHarness(base)).MR.auth.getAssignment()).demoCalendarBypass, true);

  for (const overrides of [
    { participant: { ...base.participant, participant_code: 'MR-DEMO-3' } },
    { caseAssignment: { ...base.caseAssignment, case_code: 'CASE-DEMO-3' } },
    { user: { ...base.user, email: 'kai@example.com' } }
  ]) {
    const assignment = await (await authHarness({ ...base, ...overrides })).MR.auth.getAssignment();
    assert.equal(assignment.demoCalendarBypass, false);
    assert.equal(assignment.qaMode, false);
  }
});

test('URL parameters cannot request a demo calendar bypass', async () => {
  const { MR } = await authHarness({
    search: '?demo=1&calendar_bypass=1',
    user: { id: 'u', email: 'teacher@testemail.com', last_sign_in_at: today.toISOString() },
    participant: { id: 'p', participant_code: 'MR-001', case_id: 'c' },
    caseAssignment: { id: 'c', case_code: 'CASE-001' }
  });
  const assignment = await MR.auth.getAssignment();
  assert.equal(assignment.demoCalendarBypass, false);
  assert.equal(assignment.qaMode, false);
});

test('previous Denver-day sign-in is rejected with local sign-out before assignment lookup', async () => {
  const old = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  const { MR, calls } = await authHarness({ user: { id: 'u', last_sign_in_at: old.toISOString() } });
  assert.equal(MR.auth.hasCurrentStudyDaySignIn({ last_sign_in_at: old.toISOString() }, today), false);
  // The minimal harness has no login form, but local sign-out must precede that UI handoff.
  await assert.rejects(MR.auth.getAssignment(), /addEventListener/);
  assert.equal(JSON.stringify(calls.signOut), JSON.stringify([{ scope: 'local' }]));
  assert.deepEqual(calls.from, []);
});

test('missing and invalid last_sign_in_at fail closed', async () => {
  const { MR } = await authHarness();
  assert.equal(MR.auth.hasCurrentStudyDaySignIn({}), false);
  assert.equal(MR.auth.hasCurrentStudyDaySignIn({ last_sign_in_at: 'not-a-date' }), false);
});

test('America/Denver boundary, rather than browser-local date, determines validity', async () => {
  const { MR } = await authHarness();
  const signedIn = new Date('2026-08-20T05:30:00Z'); // Aug 19 in Denver
  const now = new Date('2026-08-20T06:30:00Z'); // Aug 20 in Denver
  assert.equal(signedIn.getUTCDate(), now.getUTCDate());
  assert.equal(MR.auth.hasCurrentStudyDaySignIn({ last_sign_in_at: signedIn.toISOString() }, now), false);
  assert.equal(MR.studyDate.timeZone, 'America/Denver');
});

test('overnight watcher signs out and reloads only once', async () => {
  const yesterday = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  const { MR, calls, runInterval, listeners, documentListeners } = await authHarness();
  MR.auth.watchDailySession({ last_sign_in_at: yesterday.toISOString() });
  await runInterval();
  await listeners.focus();
  await documentListeners.visibilitychange();
  assert.equal(JSON.stringify(calls.signOut), JSON.stringify([{ scope: 'local' }]));
  assert.equal(calls.reload, 1);
});

test('QA Preview bypasses participant daily expiration and preserves authorization RPC', async () => {
  const old = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  const preview = [{ participant_id: 'p', participant_code: 'QA', case_id: 'c', case_code: 'C', student_alias: 'S' }];
  const { MR, calls } = await authHarness({ search: '?qa_case=C', user: { id: 'admin', last_sign_in_at: old.toISOString() }, rpcResult: preview });
  const assignment = await MR.auth.getAssignment();
  assert.equal(assignment.qaMode, true);
  assert.deepEqual(calls.signOut, []);
  assert.deepEqual(calls.rpc, ['research_admin_game_preview']);
});

test('saved-draft QA uses its dedicated resolver and passes validated type and slot', async () => {
  const preview = [{ participant_id: 'p', participant_code: 'QA', case_id: 'c', case_code: 'CASE-998', student_alias: 'S' }];
  const { MR, calls } = await authHarness({ search: '?qa_case=CASE-998&qa_draft_type=wild&qa_draft_slot=2', user: { id: 'admin' }, rpcResult: preview });
  const assignment = await MR.auth.getAssignment();
  assert.equal(assignment.qaMode, true);
  assert.equal(JSON.stringify(assignment.qaDraft), JSON.stringify({ type: 'wild', slot: 2 }));
  assert.deepEqual(calls.rpc, ['research_admin_draft_game_preview']);
  assert.equal(JSON.stringify(calls.rpcArgs[0]), JSON.stringify({ target_case_code: 'CASE-998', target_mission_type: 'wild', target_slot_number: 2 }));
});

test('manual logout uses local browser scope and auth checks do not write gameplay or telemetry', async () => {
  const { MR, calls } = await authHarness();
  await MR.auth.signOut();
  assert.equal(JSON.stringify(calls.signOut), JSON.stringify([{ scope: 'local' }]));
  const auth = await read('./auth.js');
  const dailyCode = auth.slice(auth.indexOf('function hasCurrentStudyDaySignIn'), auth.indexOf('async function activeParticipant'));
  assert.doesNotMatch(dailyCode, /game_sessions|game_responses|telemetry|\.insert\(|\.update\(/);
});
