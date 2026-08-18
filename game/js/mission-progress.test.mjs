import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const dashboardSource = fs.readFileSync(new URL('./dashboard.js', import.meta.url), 'utf8');
const authSource = fs.readFileSync(new URL('./auth.js', import.meta.url), 'utf8');
const protectedHTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const demoHTML = fs.readFileSync(new URL('../../demo-game/index.html', import.meta.url), 'utf8');
const demoApp = fs.readFileSync(new URL('./demo-app.js', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const progressSummaryCss = fs.readFileSync(new URL('../css/progress-summary-v2.css', import.meta.url), 'utf8');

function loadDashboard() {
  const elements = new Map();
  const MR = {
    $(selector) {
      if (!elements.has(selector)) elements.set(selector, { textContent: '', innerHTML: '' });
      return elements.get(selector);
    },
    $$() { return []; },
    escapeHTML(value) {
      return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    },
    asset(name) { return `${name}.png`; },
    teacherConfig: { defaultHearts: 5, xpMax: 1000 }
  };
  const context = { window: { MR }, console, Intl, Date, document: {} };
  vm.runInNewContext(dashboardSource, context);
  return { dashboard: MR.dashboard, MR, elements };
}

test('mission metrics use weighted completed-session scores and newest completed mission', () => {
  const { dashboard } = loadDashboard();
  const metrics = dashboard.metrics([
    { score: 8, max_score: 10, ended_at: '2026-08-17T20:00:00Z' },
    { score: 10, max_score: 20, ended_at: '2026-08-18T20:00:00Z' },
    { score: 9, max_score: 10, ended_at: null, started_at: '2026-08-16T20:00:00Z' }
  ]);
  assert.deepEqual({ ...metrics }, { average: 68, completed: 3, recent: 50, best: 90 });
});

test('protected progress loads only from Supabase and never falls back to stale local history', async () => {
  const { dashboard, MR, elements } = loadDashboard();
  let storageReads = 0;
  MR.telemetryContext = { participantId: 'p1', caseId: 'c1', qaMode: false };
  MR.storage = { getRuns() { storageReads += 1; return [{ score: 10, maxScore: 10 }]; } };
  MR.auth = { async getProgressSessions() { throw new Error('offline'); } };
  await dashboard.render();
  assert.equal(storageReads, 0);
  assert.match(elements.get('#progress-list').innerHTML, /Mission progress could not be loaded/);
  assert.doesNotMatch(elements.get('#progress-list').innerHTML, /Mission Score:/);
});

test('public fictional demo progress uses localStorage history', async () => {
  const { dashboard, MR, elements } = loadDashboard();
  let storageReads = 0;
  MR.storage = { getRuns() { storageReads += 1; return []; } };
  await dashboard.render();
  assert.equal(storageReads, 1);
  assert.match(elements.get('#progress-list').innerHTML, /Complete a mission and your game-practice progress will appear here/);
  assert.doesNotMatch(demoApp, /MR\.storage\.getRuns\s*=/);
});

test('history cards stay short and teacher-facing', () => {
  const { dashboard } = loadDashboard();
  const card = dashboard.runCard({
    mode: 'crisis', mission_title: 'Calm Return', score: 20, max_score: 25,
    plan_aligned_count: 2, refine_count: 1, missed_count: 1, ended_at: '2026-08-18T02:00:00Z'
  }, 0);
  assert.match(card, /Crisis Mission/);
  assert.match(card, /Mission Score: 80%/);
  assert.doesNotMatch(card, /Calm Return/);
  assert.doesNotMatch(card, /Plan-Aligned Choices|Workable, but Refine|Missed Opportunities/);
  assert.equal(dashboard.DENVER_TIME_ZONE, 'America/Denver');
});

test('protected historical responses rebuild the full run history required by the exact Results debrief', () => {
  const { dashboard } = loadDashboard();
  const rebuilt = dashboard.historicalRun({
    id: 'session-1', mode: 'crisis', mission_title: 'The Room Goes Quiet', score: 35, max_score: 50
  }, [
    {
      step_index: 2,
      scenario_title: 'Moment 2',
      scenario_text: 'Anna holds up the talk card.',
      selected_answer_text: 'Whisper a reminder.',
      selected_score: 0,
      best_answer_text: 'Prompt the replacement response.',
      feedback_text: 'This moved away from the plan.'
    },
    {
      step_index: 4,
      scenario_title: 'Moment 4',
      scenario_text: 'Anna returns to her spot.',
      selected_answer_text: 'Give a thumbs-up.',
      selected_score: 5,
      best_answer_text: 'Use behavior-specific praise.',
      feedback_text: 'Supportive, but praise could be more specific.'
    }
  ]);

  assert.equal(rebuilt.accuracy, 70);
  assert.equal(rebuilt.maxScore, 50);
  assert.equal(rebuilt.history.length, 2);
  assert.equal(rebuilt.history[0].score, 0);
  assert.equal(rebuilt.history[0].context, 'Anna holds up the talk card.');
  assert.equal(rebuilt.history[0].choiceText, 'Whisper a reminder.');
  assert.equal(rebuilt.history[0].bestChoiceText, 'Prompt the replacement response.');
  assert.equal(rebuilt.history[1].score, 5);
  assert.equal(rebuilt.history[1].feedback, 'Supportive, but praise could be more specific.');
});

test('Progress Details uses saved responses and the same end-of-game Results renderer', () => {
  assert.match(dashboardSource, /getProgressResponses\(run\.id, MR\.telemetryContext\)/);
  assert.match(dashboardSource, /MR\.engine\.showStoredRunDetails\(historicalRun\(run, responses\)\)/);
  assert.doesNotMatch(dashboardSource, /detailsHTML\(|progress-summary-debrief/);
  assert.match(engineSource, /function coachingDebriefHTML\(run, summary\)/);
  assert.match(engineSource, /<h2>Review<\/h2>/);
  assert.match(engineSource, /Workable, but Refine/);
  assert.match(engineSource, /Missed Opportunities/);
  assert.match(engineSource, /Moment \$\{MR\.escapeHTML/);
  assert.match(engineSource, /showStoredRunDetails\(run\)\s*\{\s*renderResults\(run, \{ playCompletion: false \}\)/s);
});

test('Mission History renders the classroom-fidelity disclaimer directly under its heading', async () => {
  const { dashboard, MR, elements } = loadDashboard();
  MR.telemetryContext = null;
  MR.storage = { getRuns() { return [{ mode: 'daily', score: 40, maxScore: 50, dateKey: '2026-08-18' }]; } };
  await dashboard.render();
  const html = elements.get('#progress-list').innerHTML;
  assert.match(html, /<h2 class="history-heading">Mission History<\/h2><p class="history-disclaimer">These scores summarize your choices/);
  assert.match(progressSummaryCss, /\.score-disclaimer\s*\{[\s\S]*display:\s*none/);
  assert.match(progressSummaryCss, /\.history-disclaimer/);
  assert.match(progressSummaryCss, /font:\s*700 12px/);
});

test('participant page contains the approved four badges, disclaimer, and no removed teacher metrics', () => {
  for (const html of [protectedHTML, demoHTML]) {
    assert.match(html, /Average Mission Score/);
    assert.match(html, /Missions Completed/);
    assert.match(html, /Most Recent Score/);
    assert.match(html, /Best Mission Score/);
    assert.match(html, /They are not classroom fidelity scores/);
    assert.doesNotMatch(html, /Overall Accuracy|Day Streak|Time Played/);
  }
  assert.doesNotMatch(dashboardSource, /fidelity_target_id|fidelity_domain|domain score|Plan Practice/);
});

test('progress presentation uses a helpful wizard and smaller badge row', () => {
  assert.match(dashboardSource, /wizardGuide/);
  assert.doesNotMatch(dashboardSource, /wizardDead/);
  assert.match(progressSummaryCss, /\.badge-row/);
  assert.match(progressSummaryCss, /background-size:\s*195px 195px/);
  assert.match(progressSummaryCss, /\.compact-run-card/);
});

test('progress queries scope participant, case, completion, and QA mode without internal response fields', async () => {
  const calls = [];
  const terminal = Promise.resolve({ data: [], error: null });
  function builder(table) {
    const chain = {
      select(fields) { calls.push([table, 'select', fields]); return chain; },
      eq(field, value) { calls.push([table, 'eq', field, value]); return chain; },
      order(field, options) {
        calls.push([table, 'order', field, options]);
        return field === 'started_at' || field === 'step_index' ? terminal : chain;
      }
    };
    return chain;
  }
  const client = { from: table => builder(table) };
  const context = {
    window: { MR: {}, supabase: { createClient: () => client }, location: { search: '' } },
    URLSearchParams, console
  };
  vm.runInNewContext(authSource, context);
  const auth = context.window.MR.auth;
  await auth.getProgressSessions({ participantId: 'participant', caseId: 'case', qaMode: false });
  await auth.getProgressSessions({ participantId: 'qa-participant', caseId: 'qa-case', qaMode: true });
  await auth.getProgressResponses('session', { participantId: 'participant', caseId: 'case', qaMode: false });

  assert.ok(calls.some(call => call[0] === 'game_sessions' && call[1] === 'eq' && call[2] === 'status' && call[3] === 'completed'));
  assert.ok(calls.some(call => call[0] === 'game_sessions' && call[1] === 'eq' && call[2] === 'qa_mode' && call[3] === false));
  assert.ok(calls.some(call => call[0] === 'game_sessions' && call[1] === 'eq' && call[2] === 'qa_mode' && call[3] === true));
  assert.ok(calls.some(call => call[0] === 'game_responses' && call[1] === 'eq' && call[2] === 'session_id' && call[3] === 'session'));
  const responseSelect = calls.find(call => call[0] === 'game_responses' && call[1] === 'select')[2];
  assert.doesNotMatch(responseSelect, /fidelity|mechanism|error_type|\bid\b/);
});

test('timing and hint telemetry collection remains intact', () => {
  assert.match(engineSource, /durationSeconds/);
  assert.match(engineSource, /activeDurationSeconds/);
  assert.match(engineSource, /totalHintsOpened/);
  assert.match(engineSource, /responseTimeMs/);
});
