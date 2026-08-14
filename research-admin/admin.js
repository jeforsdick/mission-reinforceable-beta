import { accountState, normalizeTargets, readinessForCase } from './admin-model.mjs';

const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
const state = { client: null, intakes: [], selected: null, accounts: {} };
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';

function show(id) {
  ['loading-view', 'login-view', 'unauthorized-view', 'error-view', 'home-view', 'detail-view'].forEach(name => { $(`#${name}`).hidden = name !== id; });
  const authenticatedAdminView = ['home-view', 'detail-view'].includes(id);
  $('#sign-out').hidden = !authenticatedAdminView;
  $('#coaching-dashboard-link').hidden = !authenticatedAdminView;
}

function intakeDate(row) { return row.submitted_at || row.created_at; }
function renderCounts() {
  const count = status => state.intakes.filter(row => row.status === status).length;
  const cards = [['New Intakes', count('submitted')], ['Approved / Preparing', count('approved')], ['Prepared Cases', count('converted')], ['Intervention Active', 0]];
  $('#counts').innerHTML = cards.map(([label, value]) => `<article class="count"><span>${label}</span><strong>${value}</strong></article>`).join('');
}
function renderHome() {
  renderCounts();
  $('#intake-list').innerHTML = state.intakes.length ? state.intakes.map(row => `<article class="intake-card"><div class="card-top"><span class="pill">${escapeHtml(row.status)}</span><span class="id">${escapeHtml(row.request_id)}</span></div><h3>${escapeHtml(row.teacher_name)}</h3><dl><div><dt>Teacher email</dt><dd>${escapeHtml(row.teacher_email)}</dd></div><div><dt>Coach</dt><dd>${escapeHtml(row.coach_name)}</dd></div><div><dt>Coach email</dt><dd>${escapeHtml(row.coach_email)}</dd></div><div><dt>Student / grade</dt><dd>${escapeHtml(row.student_initials)} · ${escapeHtml(row.grade_level)}</dd></div><div><dt>Submitted</dt><dd>${formatDate(intakeDate(row))}</dd></div></dl><button class="primary review" data-id="${escapeHtml(row.request_id)}">Review intake</button></article>`).join('') : '<article class="panel"><h3>No intake requests</h3><p>The operational queue is clear.</p></article>';
  document.querySelectorAll('.review').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.id)));
  show('home-view');
}

async function exactAccount(email, role) {
  const { data, error } = await state.client.rpc('research_admin_account_readiness', { target_email: email });
  if (error) throw error;
  return accountState(data, role);
}
const field = (label, value, wide = false) => value ? `<div class="${wide ? 'wide' : ''}"><dt>${label}</dt><dd><p>${escapeHtml(value)}</p></dd></div>` : '';
const section = (title, fields) => `<section class="panel"><h2>${title}</h2><dl class="fields">${fields.join('')}</dl></section>`;

async function openDetail(id) {
  const row = state.intakes.find(item => item.request_id === id); if (!row) return;
  show('loading-view'); state.selected = row;
  try {
    const [teacher, coach, converted] = await Promise.all([
      exactAccount(row.teacher_email, 'teacher'), exactAccount(row.coach_email, 'coach'),
      row.status === 'converted' && row.converted_case_id ? loadReadiness(row.request_id) : Promise.resolve(null)
    ]);
    state.accounts = { teacher, coach };
    const targets = normalizeTargets(row.fidelity_targets, row.has_crisis_plan === true);
    $('#detail').innerHTML = `<div class="hero"><div><p class="eyebrow">Practitioner-submitted intake/context</p><h1>${escapeHtml(row.teacher_name)} · ${escapeHtml(row.student_initials)}</h1><p>Request ${escapeHtml(row.request_id)} · <span class="pill">${escapeHtml(row.status)}</span></p></div><div class="safeguard"><strong>Review, not approved BIP content</strong><span>The BIP/BSP remains the source of truth for individualized game content and final fidelity targets.</span></div></div>
      <div class="detail-grid"><div>
      ${section('Practitioner information', [field('Teacher', row.teacher_name), field('Teacher email', row.teacher_email), field('Coach', row.coach_name), field('Coach email', row.coach_email)])}
      ${section('Student and behavior context', [field('Student initials', row.student_initials), field('Grade', row.grade_level), field('Behavior description', row.target_behavior, true), field('Topography', row.behavior_topography, true), field('Function', row.primary_function), field('Replacement behavior', row.replacement_behavior, true), field('Desired behavior', row.desired_behavior, true)])}
      ${section('Practitioner-submitted strategies', [field('Prevention', row.prevention_strategies, true), field('Teaching', row.teaching_strategies, true), field('Reinforcement', row.reinforcement_system, true), field('Response', row.response_strategy, true)])}
      ${row.has_crisis_plan ? section('Crisis plan', [field('Practitioner-submitted crisis/safety plan', row.crisis_plan, true)]) : ''}
      ${section('Classroom and additional context', [field('Typical settings', row.typical_settings, true), field('Common triggers', row.common_triggers, true), field('Typical antecedents', row.typical_antecedents, true), field('Typical consequences', row.typical_consequences, true), field('Current staff responses', row.current_staff_responses, true), field('Requested scenarios', row.requested_scenarios, true), field('Additional context', row.additional_context, true)])}
      <section class="panel notice"><p class="eyebrow">Proposed fidelity targets</p><h2>Review and edit</h2><strong>Confirm final fidelity targets against the student’s BIP/BSP before provisioning.</strong><p>Each target must be one atomic, observable teacher behavior. Keys derive only from final domain/order.</p><div id="targets">${targets.map(target => `<label class="target-row"><span>${escapeHtml(target.target_key)}</span><input data-domain="${target.domain}" data-order="${target.sort_order}" value="${escapeHtml(target.description)}" aria-label="${target.target_key}"></label>`).join('')}</div></section>
      </div><aside><section class="panel"><p class="eyebrow">Account readiness</p><h2>Verified exact-email matches</h2>${accountBox('Teacher Auth account', teacher)}${accountBox('Coach Auth account', coach)}<p>No invitation or password-reset email will be sent.</p></section>${converted ? readinessPanel(converted) : provisionPanel(row, teacher, coach)}${reviewActions(row)}</aside></div>`;
    bindDetail(); show('detail-view'); window.scrollTo(0, 0);
  } catch (error) { $('#error-message').textContent = error.message || 'Readiness checks failed.'; show('error-view'); }
}
function accountBox(label, result) { return `<div class="account"><strong>${label}</strong><br><span class="${result.ready ? 'ready' : 'needs'}">${result.label}</span></div>`; }
function reviewActions(row) { return row.status === 'submitted' ? `<section class="panel"><h2>Intake decision</h2><p>Approval does not provision a case, activate gameplay, enable reminders, or send email.</p><div class="actions"><button id="approve" class="primary">Approve intake</button><button id="decline" class="primary decline">Decline intake</button></div><p id="action-message" class="message" aria-live="polite"></p></section>` : `<section class="panel"><h2>Intake decision</h2><p>Current status: <strong>${escapeHtml(row.status)}</strong></p></section>`; }
function bindDetail() {
  $('#approve')?.addEventListener('click', () => setStatus('approved'));
  $('#decline')?.addEventListener('click', () => { if (window.confirm('Decline this intake? This does not delete the submitted context.')) setStatus('declined'); });
  $('#study-id')?.addEventListener('input', event => {
    const match = event.target.value.trim().match(/^MR-(\d{3})$/);
    if (match && !$('#case-code').value) $('#case-code').value = `CASE-${match[1]}`;
  });
  $('#provision-form')?.addEventListener('submit', provisionCase);
}

function reviewedTargets() {
  return Array.from(document.querySelectorAll('#targets input')).map(input => ({ domain: input.dataset.domain, description: input.value.trim() })).filter(item => item.description);
}
function provisionPanel(row, teacher, coach) {
  if (row.status !== 'approved') return '<section class="panel"><h2>Provision Study Case</h2><p class="needs">Approve this intake before provisioning.</p></section>';
  const disabled = !teacher.ready || !coach.ready;
  return `<section class="panel notice"><p class="eyebrow">Prepared state only</p><h2>Provision Study Case</h2><form id="provision-form"><label>Study ID<input id="study-id" name="study_id" required pattern="MR-[0-9]{3}" placeholder="MR-001"></label><label>Case code<input id="case-code" name="case_code" required pattern="CASE-[0-9]{3}" placeholder="CASE-001"></label><label>Student game alias<input id="student-alias" name="student_alias" required autocomplete="off" placeholder="Kai"></label><small>Use a non-identifying game name or pseudonym. Do not enter the student's full name.</small><button class="primary" ${disabled ? 'disabled' : ''}>Provision inactive case</button><p id="provision-message" class="message" aria-live="polite"></p></form><p class="off">This creates a prepared case. Gameplay and reminders remain OFF.</p></section>`;
}
async function provisionCase(event) {
  event.preventDefault();
  if (!window.confirm('Provision this case in the prepared state? Gameplay and reminders will remain OFF.')) return;
  const form = new FormData(event.currentTarget); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const args = { target_request_id: state.selected.request_id, study_id: String(form.get('study_id')).trim(), new_case_code: String(form.get('case_code')).trim(), student_game_alias: String(form.get('student_alias')).trim(), reviewed_targets: reviewedTargets() };
  const { data, error } = await state.client.rpc('provision_intake_case', args);
  if (error) { $('#provision-message').textContent = error.message; button.disabled = false; return; }
  state.selected.status = 'converted'; state.selected.converted_case_id = data?.[0]?.case_id; await openDetail(state.selected.request_id);
}
async function loadReadiness(requestId) {
  const { data, error } = await state.client.rpc('research_admin_case_readiness', { target_request_id: requestId });
  if (error) throw error; return data;
}
function readinessPanel(data) {
  const states = readinessForCase(data);
  const rows = [['Intake reviewed', 'Ready'], ['Teacher account linked', states.teacher], ['Coach account linked', states.coach], ['Case created', states.case], ['Case intake snapshot', states.snapshot], ['Fidelity targets finalized', states.targets], ['Coach assigned', states.assignment], ['Protected game content', states.content === 'Ready' ? `Ready — version ${escapeHtml(data.protected_content.version)}, updated ${formatDate(data.protected_content.updated_at)}` : 'Needs action — Not loaded'], ['Game access', states.game === 'Ready' ? 'Ready — intervention active' : 'OFF intentionally — intervention not activated'], ['Daily reminders', states.reminders === 'Ready' ? 'Ready — enabled' : 'OFF intentionally']];
  return `<section class="panel"><p class="eyebrow">Prepared case readiness</p><h2>${escapeHtml(data.case.case_code)}</h2><p><strong>Study ID:</strong> ${escapeHtml(data.participant?.participant_code || '—')}<br><strong>Game alias:</strong> ${escapeHtml(data.case.student_alias)}</p><div class="checklist">${rows.map(([label, value]) => `<div><span>${label}</span><strong class="${value.startsWith('Ready') ? 'ready' : value.startsWith('OFF') ? 'off' : 'needs'}">${value}</strong></div>`).join('')}</div><p><strong>Prepared does not mean intervention active.</strong></p></section>`;
}
async function setStatus(status) {
  const { error } = await state.client.rpc('research_admin_set_intake_status', { target_request_id: state.selected.request_id, target_status: status });
  if (error) { $('#action-message').textContent = error.message; return; }
  state.selected.status = status; renderHome();
}
async function loadIntakes() { const { data, error } = await state.client.rpc('research_admin_intakes'); if (error) throw error; state.intakes = data || []; }
async function start() {
  show('loading-view');
  try {
    if (!window.supabase) throw new Error('The secure sign-in service did not load.');
    state.client ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: { session }, error } = await state.client.auth.getSession(); if (error) throw error;
    if (!session) { show('login-view'); return; }
    const { data: profile, error: profileError } = await state.client.from('profiles').select('role,active').eq('id', session.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== 'research_admin' || profile.active !== true) { show('unauthorized-view'); return; }
    await loadIntakes(); renderHome();
  } catch (error) { $('#error-message').textContent = error.message || 'Please try again.'; show('error-view'); }
}
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const { error } = await state.client.auth.signInWithPassword({ email: String(form.get('email')).trim(), password: String(form.get('password')) }); if (error) $('#login-error').textContent = 'Sign-in failed. Check your email and password.'; else start(); });
async function signOut() { await state.client?.auth.signOut(); state.intakes = []; show('login-view'); }
$('#sign-out').addEventListener('click', signOut); $('.sign-out-action').addEventListener('click', signOut); $('#retry').addEventListener('click', start); $('#back-home').addEventListener('click', renderHome);
start();
