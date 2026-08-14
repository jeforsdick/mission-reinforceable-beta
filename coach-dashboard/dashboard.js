import { DOMAIN_LABELS, analyzeCase, coachingCopy, sessionPercent, statusFor, targetPerformance } from './dashboard-metrics.mjs';

const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
const state = { client: null, cases: [] };
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function show(id) {
  ['loading-view', 'login-view', 'unauthorized-view', 'error-view', 'home-view', 'detail-view'].forEach(name => { $(`#${name}`).hidden = name !== id; });
  $('#sign-out').hidden = !['home-view', 'detail-view'].includes(id);
}
function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'No practice yet'; }
function duration(seconds) { if (!seconds) return '—'; const minutes = Math.floor(seconds / 60); return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, '0')}`; }
function metric(label, value, note = '') { return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</article>`; }
function empty(message) { return `<div class="empty-state"><strong>No data to show yet</strong><p>${escapeHtml(message)}</p></div>`; }

async function loadCases(userId) {
  // Query assignments first. All later reads are both ID-filtered and protected by case-aware RLS.
  const { data: assignments, error: assignmentError } = await state.client.from('case_coaches').select('case_id').eq('coach_user_id', userId).eq('active', true);
  if (assignmentError) throw assignmentError;
  const caseIds = (assignments || []).map(row => row.case_id);
  if (!caseIds.length) return [];
  const queries = await Promise.all([
    state.client.from('cases').select('id, active').in('id', caseIds).eq('active', true),
    state.client.from('case_intake').select('case_id, teacher_name, student_initials, grade_level, has_crisis_plan').in('case_id', caseIds),
    state.client.from('fidelity_targets').select('id, case_id, domain, description, sort_order').in('case_id', caseIds).eq('active', true).order('sort_order'),
    state.client.from('game_sessions').select('id, case_id, mission_id, mission_title, started_at, ended_at, status, duration_seconds, active_duration_seconds, plan_aligned_count, refine_count, missed_count, total_hints_opened').in('case_id', caseIds).order('started_at', { ascending: false }),
    state.client.from('game_responses').select('id, session_id, case_id, fidelity_target_id, fidelity_domain, alignment, hint_opened, hint_open_count, created_at').in('case_id', caseIds)
  ]);
  const failed = queries.find(result => result.error); if (failed) throw failed.error;
  const [cases, intakes, targets, sessions, responses] = queries.map(result => result.data || []);
  return cases.map(row => ({ id: row.id, intake: intakes.find(item => item.case_id === row.id) || null, targets: targets.filter(item => item.case_id === row.id), sessions: sessions.filter(item => item.case_id === row.id), responses: responses.filter(item => item.case_id === row.id) }));
}

function renderHome() {
  const analyzed = state.cases.map(item => ({ item, analysis: analyzeCase(item) }));
  const week = analyzed.reduce((sum, row) => sum + row.analysis.thisWeek, 0);
  const followUp = analyzed.filter(row => statusFor(row.analysis) !== 'strong').length;
  const recent = analyzed.reduce((sum, row) => sum + row.analysis.sessions.length, 0);
  $('#home-metrics').innerHTML = metric('Teachers Assigned', state.cases.length) + metric('Practice This Week', week, 'sessions in the last 7 days') + metric('Teachers Needing Follow-Up', followUp, 'gentle priority status') + metric('Recent Activity', recent, 'sessions reviewed');
  $('#teacher-list').innerHTML = analyzed.length ? analyzed.map(({ item, analysis }) => {
    const intake = item.intake || {}; const status = statusFor(analysis); const last = analysis.sessions[0];
    return `<article class="teacher-card status-${status}"><div class="card-top"><span class="status-pill ${status}">${status}</span><span class="student-chip">Student ${escapeHtml(intake.student_initials || '—')}</span></div><h3>${escapeHtml(intake.teacher_name || 'Teacher name unavailable')}</h3><p class="grade">Grade ${escapeHtml(intake.grade_level || '—')}</p><dl><div><dt>Last practice</dt><dd>${formatDate(last?.started_at)}</dd></div><div><dt>Sessions this week</dt><dd>${analysis.thisWeek}</dd></div><div><dt>Recent plan-aligned</dt><dd>${analysis.planAlignedPercent === null ? 'Not enough data' : `${analysis.planAlignedPercent}%`}</dd></div><div><dt>Current coaching focus</dt><dd>${escapeHtml(analysis.focus)}</dd></div></dl><button class="primary-button view-teacher" data-case-id="${escapeHtml(item.id)}" type="button">View Coaching Summary</button></article>`;
  }).join('') : empty('No active cases are currently assigned to you.');
  document.querySelectorAll('.view-teacher').forEach(button => button.addEventListener('click', () => renderDetail(button.dataset.caseId)));
  show('home-view');
}

function lineChart(sessions, responses) {
  const points = [...sessions].reverse().map((session, index) => ({ session, percent: sessionPercent(session, responses), x: 40 + index * (sessions.length > 1 ? 440 / (sessions.length - 1) : 0) })).filter(row => row.percent !== null);
  if (!points.length) return empty('No practice sessions with response opportunities have been recorded yet.');
  const polyline = points.map(row => `${row.x},${170 - row.percent * 1.3}`).join(' ');
  return `<svg viewBox="0 0 520 220" role="img" aria-label="Plan-aligned response percentage by session"><g class="grid"><line x1="40" y1="40" x2="480" y2="40"/><line x1="40" y1="105" x2="480" y2="105"/><line x1="40" y1="170" x2="480" y2="170"/><text x="5" y="44">100%</text><text x="12" y="109">50%</text><text x="25" y="174">0%</text></g><polyline class="trend-line" points="${polyline}"/>${points.map((row, index) => `<g><circle cx="${row.x}" cy="${170 - row.percent * 1.3}" r="5"/><text class="point-label" x="${row.x}" y="205">${escapeHtml(row.session.mission_id || `S${index + 1}`)}</text></g>`).join('')}</svg>`;
}

function renderDetail(caseId) {
  const item = state.cases.find(row => row.id === caseId); if (!item) return;
  const analysis = analyzeCase(item); const intake = item.intake || {}; const copy = coachingCopy(analysis); const last = analysis.sessions[0];
  $('#teacher-heading').innerHTML = `<div><p class="eyebrow">Teacher coaching summary</p><h1>${escapeHtml(intake.teacher_name || 'Teacher name unavailable')}</h1><p>Student ${escapeHtml(intake.student_initials || '—')} · Grade ${escapeHtml(intake.grade_level || '—')}</p></div><dl><div><dt>Last practice</dt><dd>${formatDate(last?.started_at)}</dd></div><div><dt>Sessions this week</dt><dd>${analysis.thisWeek}</dd></div><div><dt>Total recent practice time</dt><dd>${duration(analysis.totalSeconds)}</dd></div></dl>`;
  $('#detail-metrics').innerHTML = metric('Plan-Aligned Decisions', analysis.planAlignedPercent === null ? 'Not available' : `${analysis.planAlignedPercent}%`, analysis.planAlignedPercent === null ? 'More practice data is needed to calculate this metric.' : 'of recent response opportunities') + metric('Practice Completed', analysis.thisWeek, 'sessions this week') + metric('Hint Use', analysis.totalDecisions ? `${analysis.hintCount} / ${analysis.totalDecisions}` : 'Not available', 'hints / recent decisions') + metric('Current Coaching Focus', analysis.focus);
  $('#summary-text').textContent = copy.summary; $('#move-text').textContent = copy.move;
  $('#domain-chart').innerHTML = analysis.domains.some(row => row.percent !== null) ? analysis.domains.map(row => `<div class="bar-row"><span>${DOMAIN_LABELS[row.domain]}</span><div class="bar-track"><span style="width:${row.percent ?? 0}%"></span></div><strong>${row.percent === null ? 'No opportunities' : `${row.percent}%`}</strong></div>`).join('') : empty('More practice data is needed to calculate fidelity-area performance.');
  $('#session-chart').innerHTML = lineChart(analysis.sessions, analysis.responses);
  const targetGroups = analysis.domains.map(domain => ({ ...domain, targets: item.targets.filter(target => target.domain === domain.domain) })).filter(group => group.targets.length);
  $('#targets-list').innerHTML = targetGroups.length ? targetGroups.map(group => `<section class="target-group"><h3>${DOMAIN_LABELS[group.domain]}</h3>${group.targets.map(target => { const rows = analysis.responses.filter(row => row.fidelity_target_id === target.id); const performance = targetPerformance(rows); return `<div class="target-item"><span>${escapeHtml(target.description)}</span><strong>${performance.percent === null ? performance.emptyLabel : `${performance.percent}%`}</strong></div>`; }).join('')}</section>`).join('') : empty('No active fidelity targets are available for this case.');
  $('#recent-practice').innerHTML = analysis.sessions.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Mission / session</th><th>Plan-aligned</th><th>Hints</th><th>Duration</th></tr></thead><tbody>${analysis.sessions.map(session => { const rows = analysis.responses.filter(row => row.session_id === session.id); const pct = sessionPercent(session, analysis.responses); return `<tr><td>${formatDate(session.started_at)}</td><td>${escapeHtml(session.mission_title || session.mission_id || session.id.slice(0, 8))}</td><td>${pct === null ? 'No opportunities' : `${pct}%`}</td><td>${rows.length ? rows.reduce((sum, row) => sum + Number(row.hint_open_count || (row.hint_opened ? 1 : 0)), 0) : Number(session.total_hints_opened || 0)}</td><td>${duration(session.active_duration_seconds ?? session.duration_seconds)}</td></tr>`; }).join('')}</tbody></table></div>` : empty('No practice sessions have been recorded yet.');
  show('detail-view'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function start() {
  show('loading-view');
  try {
    if (!window.supabase) throw new Error('The secure sign-in service did not load.');
    state.client ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: { session }, error } = await state.client.auth.getSession(); if (error) throw error;
    if (!session) { show('login-view'); return; }
    const { data: profile, error: profileError } = await state.client.from('profiles').select('id, display_name, role, active').eq('id', session.user.id).maybeSingle(); if (profileError) throw profileError;
    if (!profile || profile.role !== 'coach' || !profile.active) { show('unauthorized-view'); return; }
    state.cases = await loadCases(session.user.id); renderHome();
  } catch (error) { $('#error-message').textContent = error.message || 'Please try again.'; show('error-view'); }
}

$('#login-form').addEventListener('submit', async event => { event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; $('#login-error').textContent = ''; const form = new FormData(event.currentTarget); const { error } = await state.client.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) }); button.disabled = false; if (error) $('#login-error').textContent = 'Sign-in failed. Check your email and password.'; else start(); });
async function signOut() { await state.client?.auth.signOut(); state.cases = []; show('login-view'); }
$('#sign-out').addEventListener('click', signOut); $('.sign-out-action').addEventListener('click', signOut); $('#retry').addEventListener('click', start); $('#back-home').addEventListener('click', renderHome);
start();
