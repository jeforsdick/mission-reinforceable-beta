import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyzeCase, coachingCopy, missionAdherence, resourceMapVisits, sessionPercent, statusFor, targetPerformance, weeklyPracticeSnapshot } from './dashboard-metrics.mjs';
import { canAccessCoachDashboard, loadDashboardCases } from './dashboard-access.mjs';

const now = new Date('2026-08-13T12:00:00Z');
const sessions = [1, 2, 3].map(day => ({ id: `s${day}`, started_at: `2026-08-${10 + day}T12:00:00Z`, duration_seconds: 60 }));

test('zero telemetry produces honest empty metrics', () => {
  const result = analyzeCase({ sessions: [], responses: [], intake: { has_crisis_plan: false } }, now);
  assert.equal(result.planAlignedPercent, null);
  assert.equal(result.focus, 'More practice needed');
  assert.equal(coachingCopy(result).summary, 'More practice data is needed before a coaching pattern can be identified.');
});

test('research QA attempts never affect coach performance summaries', () => {
  const result = analyzeCase({
    intake: { has_crisis_plan: false },
    sessions: [
      { id: 'study', started_at: '2026-08-13T10:00:00Z', qa_mode: false, duration_seconds: 60 },
      { id: 'qa', started_at: '2026-08-13T11:00:00Z', qa_mode: true, duration_seconds: 999 }
    ],
    responses: [
      { session_id: 'study', fidelity_domain: 'proactive', alignment: 'plan_aligned', qa_mode: false },
      { session_id: 'qa', fidelity_domain: 'proactive', alignment: 'missed_opportunity', qa_mode: true }
    ]
  }, now);
  assert.equal(result.sessions.length, 1);
  assert.equal(result.responses.length, 1);
  assert.equal(result.planAlignedPercent, 100);
  assert.equal(result.thisWeek, 1);
  assert.equal(result.totalSeconds, 60);
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
  assert.deepEqual(client.calls.map(call => call.table), ['cases', 'case_intake', 'fidelity_targets', 'game_sessions', 'game_responses', 'game_resource_events']);
  assert.equal(client.calls.some(call => call.table === 'case_coaches'), false);
  assert.equal(client.calls.some(call => call.operations.some(operation => ['insert', 'upsert', 'update'].includes(operation[0]))), false);
  assert.deepEqual(client.calls[0].operations, [['select', 'id, active'], ['eq', 'active', true]]);
  for (const call of client.calls.slice(1)) {
    assert.ok(call.operations.some(operation => operation[0] === 'in' && operation[1] === 'case_id' && operation[2].join(',') === 'case-a,case-b'));
  }
  for (const call of client.calls.filter(call => ['game_sessions', 'game_responses', 'game_resource_events'].includes(call.table))) {
    assert.ok(call.operations.some(operation => operation[0] === 'eq' && operation[1] === 'qa_mode' && operation[2] === false));
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

test('weekly practice snapshot uses Denver dates, weighted scores, completed non-QA sessions only', async () => {
  const { weeklyPracticeSnapshot } = await import('./dashboard-metrics.mjs');
  const snapshot = weeklyPracticeSnapshot({
    checkins: [{ week_start: '2026-09-14', week_end: '2026-09-18', scheduled_study_days: 4, submitted_at: '2026-09-18T00:00:00Z', qa_mode: false }],
    sessions: [
      { status: 'completed', ended_at: '2026-09-15T05:30:00Z', score: 4, max_score: 5, qa_mode: false },
      { status: 'completed', ended_at: '2026-09-19T05:30:00Z', score: 5, max_score: 10, qa_mode: false },
      { status: 'started', started_at: '2026-09-16T12:00:00Z', score: 10, max_score: 10, qa_mode: false },
      { status: 'completed', ended_at: '2026-09-17T12:00:00Z', score: 10, max_score: 10, qa_mode: true }
    ]
  });
  assert.equal(snapshot.missionsCompleted, 1);
  assert.equal(snapshot.averageScore, 60);
  assert.equal(snapshot.mostRecentScore, 50);
});

test('weekly snapshot copy preserves self-report and classroom-fidelity boundaries', async () => {
  const source = await readFile(new URL('./dashboard.js', import.meta.url), 'utf8');
  assert.match(source, /expected mission days/);
  assert.doesNotMatch(source, /Teacher confidence|MR helpfulness|coach_note|target_behavior_rating|replacement_behavior_rating/);
  assert.match(source, /not classroom fidelity/);
  assert.doesNotMatch(source, /weekly[^\n]*(weakest|recommendation|teacher should)/i);
});

test('mission adherence excuses only current teacher unavailable scheduled days', () => {
  const scheduledDates=['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-21'];
  const base={scheduledDates,sessions:[]};
  assert.deepEqual(missionAdherence({...base,currentStatuses:[{study_date:'2026-09-15',reason:'teacher_unavailable'}]}),{
    scheduledStudyDays:5,excusedStudyDays:1,expectedMissionDays:4,completedExpectedMissionDays:0
  });
  assert.equal(missionAdherence(base).expectedMissionDays,5);
  for(const reason of ['teacher_absent','student_absent','schedule_disruption',null]) {
    assert.equal(missionAdherence({...base,currentStatuses:[{study_date:'2026-09-15',reason}]}).expectedMissionDays,5);
  }
  assert.equal(missionAdherence({...base,currentStatuses:[{study_date:'2026-09-19',reason:'teacher_unavailable'}]}).expectedMissionDays,5);
});

test('excused completion is preserved descriptively, then counts when current excuse is cleared', () => {
  const input={scheduledDates:['2026-09-14'],sessions:[{status:'completed',ended_at:'2026-09-15T05:30:00Z',qa_mode:false}]};
  const excused=missionAdherence({...input,currentStatuses:[{study_date:'2026-09-14',reason:'teacher_unavailable'}]});
  assert.equal(input.sessions.length,1);
  assert.equal(excused.completedExpectedMissionDays,0);
  assert.equal(excused.expectedMissionDays,0);
  assert.equal(missionAdherence({...input,currentStatuses:[{study_date:'2026-09-14',reason:null}]}).completedExpectedMissionDays,1);
});

test('weekly snapshot exposes expected denominator and excused context including zero denominator', async () => {
  const source=await readFile(new URL('./dashboard.js',import.meta.url),'utf8');
  assert.match(source,/scheduled day.*excused/);
  assert.match(source,/No expected mission days/);
  const snapshot=weeklyPracticeSnapshot({missionAdherence:{scheduledStudyDays:5,excusedStudyDays:1,expectedMissionDays:4,completedExpectedMissionDays:3},sessions:[{status:'completed',ended_at:'2026-09-15T12:00:00Z',qa_mode:false}]});
  assert.equal(snapshot.missionsCompleted,3);
  assert.equal(snapshot.adherence.expectedMissionDays,4);
});


const resourceEvent = (event_name, occurred_at, section_key = null, overrides = {}) => ({
  participant_id: 'participant-a', event_name, occurred_at, section_key,
  game_content_version: 'v1', qa_mode: false, ...overrides
});

test('each Resource Map open creates a distinct newest-first visit and assigns sections to the preceding open', () => {
  const visits = resourceMapVisits([
    resourceEvent('resource_section_opened', '2026-08-24T14:00:00Z', 'library'), // orphan
    resourceEvent('resources_opened', '2026-08-24T14:01:00Z'),
    resourceEvent('resource_section_opened', '2026-08-24T14:02:00Z', 'prevention'),
    resourceEvent('resource_section_opened', '2026-08-24T14:03:00Z', 'reinforcement'),
    resourceEvent('resources_opened', '2026-08-24T15:01:00Z'),
    resourceEvent('resource_section_opened', '2026-08-24T15:02:00Z', 'prevention')
  ]);
  assert.equal(visits.length, 2);
  assert.equal(visits[0].occurredAt, '2026-08-24T15:01:00Z');
  assert.deepEqual(visits[0].sectionNames, ['Prevention Palace']);
  assert.deepEqual(visits[1].sectionNames, ['Prevention Palace', 'Reinforcement Ridge']);
});

test('Resource Map visits preserve first-open order, deduplicate within a visit, and render every canonical label', () => {
  const keys = ['bip', 'functionForest', 'prevention', 'replacement', 'reinforcement', 'errorCorrection', 'library', 'coaching', 'fidelity', 'bip'];
  const visits = resourceMapVisits([
    resourceEvent('resources_opened', '2026-08-24T14:00:00Z'),
    ...keys.map((key, index) => resourceEvent('resource_section_opened', `2026-08-24T14:${String(index + 1).padStart(2, '0')}:00Z`, key))
  ]);
  assert.deepEqual(visits[0].sectionNames, ['BIP at a Glance', 'Function Forest', 'Prevention Palace', 'Replacement Reservoir', 'Reinforcement Ridge', 'Error Correction Canyon', 'BSP Library', 'Coaching Cottage', 'Fidelity Fortress']);
});

test('Resource Map grouping excludes QA, unknown, orphan, cross-participant, and mismatched-version sections safely', () => {
  const visits = resourceMapVisits([
    resourceEvent('resource_section_opened', '2026-08-24T13:00:00Z', 'bip'),
    resourceEvent('resources_opened', '2026-08-24T14:00:00Z'),
    resourceEvent('resource_section_opened', '2026-08-24T14:01:00Z', 'futurePlace'),
    resourceEvent('resource_section_opened', '2026-08-24T14:02:00Z', 'bip', { qa_mode: true }),
    resourceEvent('resource_section_opened', '2026-08-24T14:03:00Z', 'bip', { participant_id: 'participant-b' }),
    resourceEvent('resource_section_opened', '2026-08-24T14:04:00Z', 'bip', { game_content_version: 'v2' })
  ]);
  assert.equal(visits.length, 1);
  assert.deepEqual(visits[0].sectionNames, []);
  assert.equal(visits[0].gameContentVersion, 'v1');
});

test('Resource Map UI includes history, no-section, expansion, local-time, and empty states', async () => {
  const source = await readFile(new URL('./dashboard.js', import.meta.url), 'utf8');
  assert.match(source, /Not yet visited\./);
  assert.match(source, /No sections opened during this visit\./);
  assert.match(source, /Show all Resource Map visits/);
  assert.match(source, /timeZone: 'America\/Denver'/);
});

test('Resource Map History is last in the visible case dashboard, after Recent Practice', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('Recent Practice') < html.indexOf('Resource Map History'));
  assert.match(html, /<h2>Resource Map History<\/h2>[\s\S]*<\/section>/);
});

test('Resource Map data follows the existing case-scoped secure query path', async () => {
  const client = mockClient({ cases: [{ id: 'case-a', active: true }], game_resource_events: [
    { case_id: 'case-a', event_name: 'resource_section_opened', section_key: 'coaching', qa_mode: false }
  ] });
  const [caseData] = await loadDashboardCases(client, 'admin-user', 'research_admin');
  assert.equal(caseData.resourceEvents.length, 1);
  const call = client.calls.find(row => row.table === 'game_resource_events');
  assert.deepEqual(call.operations, [
    ['select', 'id, participant_id, case_id, event_name, section_key, game_content_version, qa_mode, occurred_at'],
    ['in', 'case_id', ['case-a']],
    ['eq', 'qa_mode', false],
    ['order', 'occurred_at', { ascending: true }]
  ]);
});

test('Resource Map table keeps its exact RLS grants and role-scoped policies', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260819050000_resource_usage_telemetry.sql', import.meta.url), 'utf8');
  const sql = migration.replace(/\s+/g, ' ');

  assert.match(sql, /alter table public\.game_resource_events enable row level security;/i);
  assert.match(sql, /revoke all on table public\.game_resource_events from anon, authenticated;/i);
  assert.match(sql, /grant select, insert on table public\.game_resource_events to authenticated;/i);

  assert.match(sql, /create policy "Participants create their own resource events" on public\.game_resource_events for insert to authenticated with check \( qa_mode = false and public\.owns_active_participant_case\(participant_id, case_id\) \);/i);
  assert.match(sql, /create policy "Assigned coaches read participant resource events" on public\.game_resource_events for select to authenticated using \(qa_mode = false and public\.is_active_case_coach\(case_id\)\);/i);
  assert.match(sql, /create policy "Research admins read resource events" on public\.game_resource_events for select to authenticated using \(\(select public\.is_research_admin\(\)\)\);/i);
  assert.match(sql, /create policy "Research admins create QA resource events" on public\.game_resource_events for insert to authenticated/i);

  const selectPolicies = sql.match(/create policy [^;]+ on public\.game_resource_events for select to authenticated [^;]+;/gi) || [];
  assert.equal(selectPolicies.length, 2, 'only assigned-coach and research-admin SELECT policies may exist');
  assert.doesNotMatch(sql, /grant select[^;]*on table public\.game_resource_events to anon/i);
  assert.doesNotMatch(sql, /for select to authenticated using \((?:true|auth\.uid\(\) is not null)\)/i);
});

test('teacher heading explicitly renders white without changing authorization', async () => {
  const css = await readFile(new URL('./dashboard.css', import.meta.url), 'utf8');
  assert.match(css, /\.teacher-heading h1\{color:#fff\}/);
  assert.equal(canAccessCoachDashboard({ role: 'teacher', active: true }), false);
});
