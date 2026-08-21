import { accountState, antecedentContext, normalizeTargets, readinessForCase } from './admin-model.mjs';
import { COMPONENTS, STUDY_START, STUDY_END, isStudyDay, weekHasStudyDay, percentage } from './procedural-fidelity.mjs';
import { ioaNeedsReview } from './observations-model.mjs';
import { attentionForCase, baselineReadiness, measureNeeds, studyWideAttention, COACHING_FOCUSES } from './operations-model.mjs';
import { renderOperations, renderStudyWideTasks } from './operations-ui.mjs';
import { friendlyBaselineError, renderCaseReport } from './case-report.mjs';
import { renderObserverTeam, renderStudyIoaSummary, recordPayload } from './observations-ui.mjs';
import { intakeChanges, missingRequired } from './edit-intake.mjs';

const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
const state = { client: null, intakes: [], operations: { cases: [], study_wide_tasks: [] }, selected: null, accounts: {}, qaLink: '' };
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
  renderStudyOverview();
  $('#intake-list').innerHTML = state.intakes.length ? state.intakes.map(row => `<article class="intake-card"><div class="card-top"><span class="pill">${escapeHtml(row.status)}</span><span class="id">${escapeHtml(row.request_id)}</span></div><h3>${escapeHtml(row.teacher_name)}</h3><dl><div><dt>Teacher email</dt><dd>${escapeHtml(row.teacher_email)}</dd></div><div><dt>Coach</dt><dd>${escapeHtml(row.coach_name)}</dd></div><div><dt>Coach email</dt><dd>${escapeHtml(row.coach_email)}</dd></div><div><dt>Student / grade</dt><dd>${escapeHtml(row.student_initials)} · ${escapeHtml(row.grade_level)}</dd></div><div><dt>Submitted</dt><dd>${formatDate(intakeDate(row))}</dd></div></dl><button class="primary review" data-id="${escapeHtml(row.request_id)}">Review intake</button></article>`).join('') : '<article class="panel"><h3>No intake requests</h3><p>The operational queue is clear.</p></article>';
  document.querySelectorAll('.review').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.id, 'intake')));
  show('home-view');
}

function renderStudyOverview() {
  const cases=state.operations.cases||[], studyTasks=state.operations.study_wide_tasks||[];
  const all=cases.flatMap(item=>attentionForCase(item).map(reason=>({studyId:item.study_id,reason}))).concat(studyWideAttention(studyTasks).map(reason=>({studyId:'Study-wide',reason})));
  $('#study-attention').innerHTML=all.length?`<section class="panel attention"><h3>Needs Attention</h3><ul>${all.map(({studyId,reason})=>`<li><strong>${escapeHtml(studyId)}</strong> — ${escapeHtml(reason)}</li>`).join('')}</ul></section>`:'<section class="panel"><strong>Nothing needs attention.</strong></section>';
  $('#study-case-list').innerHTML=cases.length?cases.map(item=>{const attention=attentionForCase(item), baseline=baselineReadiness(item), measureCount=measureNeeds(item).length; return `<article class="intake-card study-card"><div class="card-top"><span class="pill">${escapeHtml(item.current_phase)}</span><span class="id">${escapeHtml(item.case_code)}</span></div><h3>${escapeHtml(item.study_id)}</h3><p>Student alias: <strong>${escapeHtml(item.student_alias)}</strong></p><dl><div><dt>Baseline target</dt><dd>${item.protocol?`${item.protocol.planned_baseline_observations} observations`:'Not assigned'}</dd></div><div><dt>Baseline readiness</dt><dd>${baseline.ready?'Complete':`${baseline.remaining} left`}</dd></div><div><dt>Measures</dt><dd>${measureCount?`${measureCount} left`:'Current'}</dd></div><div><dt>Open tasks</dt><dd>${(item.tasks||[]).filter(x=>x.status==='pending').length}</dd></div><div><dt>Study events</dt><dd>${(item.study_events||[]).filter(x=>!x.resolved_at).length} unresolved</dd></div><div><dt>Observations</dt><dd>${item.observation_data?.observations?.filter(x=>x.summary_revision_id).length||0}</dd></div><div><dt>IOA</dt><dd>${item.observation_data?.coverage?.percent||0}% coverage</dd></div><div><dt>IOA Review</dt><dd>${item.observation_data?.observations?.filter(x=>ioaNeedsReview(x.ioa)).length||0}</dd></div><div><dt>Attention</dt><dd>${attention.length||'None'}</dd></div></dl><button class="primary open-case" data-case="${item.id}">Open Case</button></article>`}).join(''):'<article class="panel"><h3>No prepared study cases</h3><p>Converted cases will appear here without being activated.</p></article>';
  $('#study-wide-tasks').innerHTML=renderStudyWideTasks(studyTasks,escapeHtml);
  $('#observer-team').innerHTML=renderStudyIoaSummary(state.observationData||{},escapeHtml)+renderObserverTeam(state.observationData||{observers:[]},escapeHtml);
  if (state.observerMessage && $('#observer-message')) { $('#observer-message').textContent = state.observerMessage; state.observerMessage = ''; }
  document.querySelectorAll('.open-case').forEach(button=>button.addEventListener('click',()=>{const intake=state.intakes.find(row=>row.converted_case_id===button.dataset.case); if(intake) openDetail(intake.request_id, 'operations');}));
  bindTaskControls(null,'#study-task-form');
  bindObserverTeam();
}

async function exactAccount(email, role) {
  const { data, error } = await state.client.rpc('research_admin_account_readiness', { target_email: email });
  if (error) throw error;
  return accountState(data, role);
}
const field = (label, value, wide = false) => value ? `<div class="${wide ? 'wide' : ''}"><dt>${label}</dt><dd><p>${escapeHtml(value)}</p></dd></div>` : '';
const section = (title, fields) => `<section class="panel"><h2>${title}</h2><dl class="fields">${fields.join('')}</dl></section>`;
const input = (name, label, row, { required = false, type = 'textarea', disabled = false } = {}) => {
  const value = escapeHtml(row[name] ?? '');
  const control = type === 'select'
    ? `<select name="${name}" ${required ? 'required' : ''}><option value="">Select…</option>${['Kindergarten','1st','2nd','3rd','Other'].map(option => `<option ${row[name] === option ? 'selected' : ''}>${option}</option>`).join('')}</select>`
    : type === 'function' ? `<select name="${name}" required>${[['','Select function…'],['escape_avoidance','Escape / Avoidance'],['attention','Attention'],['tangible_access','Tangible / Access'],['automatic_sensory','Automatic / Sensory'],['multiple','Multiple'],['unclear','Unclear / Still Being Assessed']].map(([key,text]) => `<option value="${key}" ${row[name] === key ? 'selected' : ''}>${text}</option>`).join('')}</select>`
    : type === 'text' || type === 'email' ? `<input name="${name}" type="${type}" value="${value}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>`
    : `<textarea name="${name}" ${required ? 'required' : ''}>${value}</textarea>`;
  return `<label>${label}${required ? ' *' : ''}${control}${disabled ? '<small>An account already exists for this email.</small>' : ''}</label>`;
};
function editIntakeForm(row, teacher, coach) {
  const differentAntecedents = String(row.common_triggers || '').trim() !== String(row.typical_antecedents || '').trim();
  const antecedent = differentAntecedents
    ? `<div class="historical-answers"><strong>This older intake has two different answers.</strong><p><b>Common triggers:</b> ${escapeHtml(row.common_triggers || '—')}</p><p><b>Typical antecedents:</b> ${escapeHtml(row.typical_antecedents || '—')}</p><label class="check-option"><input name="consolidate_antecedents" type="checkbox"> Replace both historical answers with one answer</label></div>${input('antecedent_answer','What commonly happens before the behavior?', { antecedent_answer: row.common_triggers || row.typical_antecedents }, { required: false })}`
    : input('antecedent_answer','What commonly happens before the behavior?', { antecedent_answer: row.common_triggers || row.typical_antecedents }, { required: true });
  return `<form id="edit-intake-form" class="edit-intake-form panel" novalidate><div class="edit-heading"><div><p class="eyebrow">Intake Information</p><h2>Edit Intake</h2><p>Correct the submitted information below. Fields marked * are required.</p></div></div>
    <fieldset><legend>Teacher, Coach &amp; Student</legend><div class="edit-grid">${input('teacher_name','Teacher Name',row,{required:true,type:'text'})}${input('teacher_email','Teacher Email',row,{required:true,type:'email',disabled:teacher.ready})}${input('coach_name','Coach Name',row,{required:true,type:'text'})}${input('coach_email','Coach Email',row,{required:true,type:'email',disabled:coach.ready})}${input('grade_level','Grade',row,{required:true,type:'select'})}${input('student_initials','Student Initials',row,{required:true,type:'text'})}</div>${input('student_strengths','Student Strengths & Interests',row)}${input('preferred_items_activities','Preferences & Known Reinforcers',row)}</fieldset>
    <fieldset><legend>Behavior &amp; Student Context</legend>${input('target_behavior','Behavior(s) of Interest',row,{required:true})}${input('behavior_topography','What does the behavior typically look and sound like?',row,{required:true})}${input('primary_function','Primary Function',row,{required:true,type:'function'})}${input('replacement_behavior','Replacement Behavior(s)',row,{required:true})}${input('desired_behavior','Desired Behavior(s)',row,{required:true})}</fieldset>
    <fieldset><legend>Behavior Plan Details</legend>${input('prevention_strategies','Prevention Details',row)}${input('teaching_strategies','Teaching Details',row)}${input('reinforcement_system','Reinforcement Details',row)}${input('response_strategy','Response Details',row)}<label>Does the plan include specific crisis or safety procedures?<select name="has_crisis_plan"><option value="false" ${!row.has_crisis_plan?'selected':''}>No</option><option value="true" ${row.has_crisis_plan?'selected':''}>Yes</option></select></label>${input('crisis_plan','Crisis / Safety Details',row)}</fieldset>
    <fieldset><legend>Contextual Information</legend>${input('typical_settings','Where does the behavior typically occur?',row,{required:true})}${antecedent}${input('typical_consequences','What typically happens after the behavior?',row,{required:true})}${input('current_staff_responses','How do staff usually respond right now?',row,{required:true})}${input('requested_scenarios','Situations you would like included in the game',row)}${input('additional_context','Anything else we should know?',row)}</fieldset>
    <p id="edit-intake-message" class="message" role="alert"></p><div class="actions"><button class="primary" type="submit">Save Changes</button><button id="cancel-edit-intake" class="quiet" type="button">Cancel</button></div></form>`;
}

async function openDetail(id, preferredTab = null) {
  const row = state.intakes.find(item => item.request_id === id); if (!row) return;
  show('loading-view'); state.selected = row;
  if (preferredTab) state.selectedTab = preferredTab;
  $('#print-intake').hidden = false;
  try {
    const [teacher, coach, converted] = await Promise.all([
      exactAccount(row.teacher_email, 'teacher'), exactAccount(row.coach_email, 'coach'),
      row.status === 'converted' && row.converted_case_id ? loadReadiness(row.request_id) : Promise.resolve(null)
    ]);
    state.accounts = { teacher, coach };
    const targets = normalizeTargets(row.fidelity_targets, row.has_crisis_plan === true);
    const canEditIntake = !converted && ['submitted', 'approved'].includes(row.status);
    const normalIntakeContent = `<section class="intake-edit-actions panel no-print"><div><p id="intake-update-message" class="success-message" role="status">${escapeHtml(state.intakeMessage || '')}</p>${converted ? '<p>Intake is locked after study case setup.</p>' : '<p>Correct submitted intake information before study case setup.</p>'}</div>${canEditIntake ? '<button id="edit-intake" class="primary" type="button">Edit Intake</button>' : ''}</section>${section('Contact Information', [field('Teacher', row.teacher_name), field('Teacher email', row.teacher_email), field('Coach', row.coach_name), field('Coach email', row.coach_email)])}
      ${section('Student &amp; Behavior', [field('Student initials', row.student_initials), field('Grade', row.grade_level), field('Behavior description', row.target_behavior, true), field('Topography', row.behavior_topography, true), field('Student strengths & interests', row.student_strengths, true), field('Preferences & known reinforcers', row.preferred_items_activities, true), field('Preference information', row.preference_assessment_notes, true), field('Function', row.primary_function), field('Replacement behavior', row.replacement_behavior, true), field('Desired behavior', row.desired_behavior, true)])}
      ${section('BIP/BSP Strategies', [field('Prevention details', row.prevention_strategies, true), field('Teaching details', row.teaching_strategies, true), field('Reinforcement details', row.reinforcement_system, true), field('Response details', row.response_strategy, true)])}
      ${row.has_crisis_plan ? section('Crisis / Safety Plan', [field('Crisis / Safety Plan', row.crisis_plan, true)]) : ''}
      ${section('Contextual Information', [field('Where the behavior typically occurs', row.typical_settings, true), ...antecedentContext(row).map(item => field(item.label, item.value, true)), field('What typically happens after the behavior', row.typical_consequences, true), field('How staff usually respond right now', row.current_staff_responses, true), field('Situations requested for the game', row.requested_scenarios, true), field('Anything else we should know', row.additional_context, true)])}
      <section class="panel notice"><p class="eyebrow">Fidelity Targets</p><strong>Check these against the BIP/BSP before case setup.</strong><p>Each target should be one observable teacher action.</p><div id="targets">${targets.map(target => `<label class="target-row"><span>${escapeHtml(target.target_key)}</span><input data-domain="${target.domain}" data-order="${target.sort_order}" value="${escapeHtml(target.description)}" aria-label="${target.target_key}"><span class="print-target">${escapeHtml(target.description)}</span></label>`).join('')}</div></section>
      <section id="intake-accounts" class="panel no-print"><p class="eyebrow">Accounts</p>${accountBox('Teacher Account', row.teacher_email, teacher, 'teacher')}${accountBox('Coach Account', row.coach_email, coach, 'coach')}<p>Nothing here sends an email.</p></section>
      ${converted ? '' : provisionPanel(row, teacher, coach)}${reviewActions(row)}`;
    const intakeContent = state.editingIntake && canEditIntake ? editIntakeForm(row, teacher, coach) : normalIntakeContent;
    state.intakeMessage = '';
    state.intakeDecisionMessage = '';
    const preparedHeader = converted ? `<div class="case-header"><div><p class="eyebrow">Prepared research case</p><h1>${escapeHtml(converted.participant?.participant_code || 'Study case')}</h1><p><strong>Case code:</strong> ${escapeHtml(converted.case.case_code)} · <strong>Student alias:</strong> ${escapeHtml(converted.case.student_alias)}</p></div><div><div class="case-status" aria-label="Case status"><span class="pill">${escapeHtml(state.caseOperations?.current_phase || 'prebaseline')}</span><span class="${converted.case.active ? 'ready' : 'off'}">Game ${converted.case.active ? 'On' : 'Off'}</span><span class="${converted.protected_content?.present ? 'ready' : 'needs'}">Content ${converted.protected_content?.present ? 'ready' : 'needs action'}</span></div><button id="download-case-pdf" class="quiet case-report-button" type="button">Download Case PDF</button><small class="case-report-help">Choose Save as PDF in the print window.</small></div></div>`
      : `<div class="hero"><div><p class="eyebrow">Submitted Intake</p><h1>${escapeHtml(row.teacher_name)} · ${escapeHtml(row.student_initials)}</h1><p>Request ${escapeHtml(row.request_id)} · Submitted ${formatDate(intakeDate(row))} · <span class="pill">${escapeHtml(row.status)}</span></p></div><div class="safeguard"><strong>Review, not approved BIP content</strong><span>The BIP/BSP remains the source of truth for individualized game content and final fidelity targets.</span></div></div>`;
    const tabs = converted ? `<div class="case-tabs no-print" role="tablist" aria-label="Case detail sections"><button id="intake-tab" class="case-tab" type="button" role="tab" aria-selected="false" aria-controls="intake-panel" tabindex="-1" data-tab="intake">Intake Information</button><button id="operations-tab" class="case-tab" type="button" role="tab" aria-selected="false" aria-controls="operations-panel" tabindex="-1" data-tab="operations">Research Operations</button></div>` : '';
    $('#detail').innerHTML = `<div class="print-heading"><strong>Mission: Reinforceable</strong><h1>Submitted Intake</h1><p>Request ${escapeHtml(row.request_id)} · Submitted ${formatDate(intakeDate(row))}</p></div>${preparedHeader}${tabs}
      <div id="intake-panel" class="tab-panel intake-workspace" role="tabpanel" aria-labelledby="intake-tab">${intakeContent}</div>
      ${converted ? `<div id="operations-panel" class="tab-panel operations-workspace" role="tabpanel" aria-labelledby="operations-tab">${readinessPanel(converted)}</div>` : ''}`;
    bindDetail();
    if (converted) selectCaseTab(preferredTab || state.selectedTab || 'intake');
    show('detail-view'); window.scrollTo(0, 0);
  } catch (error) { $('#error-message').textContent = error.message || 'Readiness checks failed.'; show('error-view'); }
}
function selectCaseTab(name, focus = false) {
  const selected = name === 'operations' ? 'operations' : 'intake';
  state.selectedTab = selected;
  document.querySelectorAll('.case-tab').forEach(tab => {
    const active = tab.dataset.tab === selected;
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    if (active && focus) tab.focus();
  });
  ['intake', 'operations'].forEach(tab => { const panel = $(`#${tab}-panel`); if (panel) panel.hidden = tab !== selected; });
  $('#print-intake').hidden = selected !== 'intake';
}
function bindCaseTabs() {
  const tabs = [...document.querySelectorAll('.case-tab')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectCaseTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectCaseTab(tabs[next].dataset.tab, true);
    });
  });
}
function accountBox(label, email, result, type) { return `<div class="account"><strong>${label}</strong><br><small>${escapeHtml(email)}</small><br><span class="${result.ready ? 'ready' : 'needs'}">${result.ready ? 'Ready' : 'No account yet'}</span>${result.ready && type === 'teacher' ? '<button class="primary qa-link" type="button">Create Test Login Link</button><small>QA only. No email is sent.</small>' : !result.ready ? `<button class="primary create-account" data-type="${type}" type="button">Create ${type === 'teacher' ? 'Teacher' : 'Coach'} Account</button>` : ''}${type === 'teacher' ? '<div id="qa-result"></div>' : ''}</div>`; }
function reviewActions(row) { return row.status === 'submitted' ? `<section class="panel no-print"><h2>Intake decision</h2><p>Approval does not provision a case, activate gameplay, enable reminders, or send email.</p><div class="actions"><button id="approve" class="primary">Approve intake</button><button id="decline" class="primary decline">Decline intake</button></div><p id="action-message" class="message" aria-live="polite"></p></section>` : `<section class="panel no-print"><h2>Intake decision</h2><p id="action-message" class="success-message" role="status">${escapeHtml(state.intakeDecisionMessage || '')}</p><p>Current status: <strong>${escapeHtml(row.status)}</strong></p></section>`; }
function bindDetail() {
  bindCaseTabs();
  bindOperations();
  $('.go-teacher-account')?.addEventListener('click', () => {
    selectCaseTab('intake');
    $('#intake-accounts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelectorAll('.create-account').forEach(button => button.addEventListener('click', () => createAccount(button.dataset.type, button)));
  $('.qa-link')?.addEventListener('click', generateQaLink);
  $('#preview-protected-game')?.addEventListener('click', event => {
    const caseCode = event.currentTarget.dataset.caseCode;
    window.open(`../game/?qa_case=${encodeURIComponent(caseCode)}`, '_blank', 'noopener');
  });
  document.querySelectorAll('.signoff-action:not(:disabled)').forEach(button => button.addEventListener('click', recordSignoff));
  $('#fidelity-scope')?.addEventListener('change', renderFidelityForm);
  $('#fidelity-date')?.addEventListener('change', loadFidelityEvidence);
  $('#fidelity-form')?.addEventListener('submit', submitFidelityReview);
  $('#approve')?.addEventListener('click', () => setStatus('approved'));
  $('#edit-intake')?.addEventListener('click', () => { state.editingIntake = true; openDetail(state.selected.request_id, 'intake'); });
  $('#cancel-edit-intake')?.addEventListener('click', () => { state.editingIntake = false; openDetail(state.selected.request_id, 'intake'); });
  $('#edit-intake-form')?.addEventListener('submit', saveIntakeChanges);
  $('#decline')?.addEventListener('click', () => { if (window.confirm('Decline this intake? This does not delete the submitted context.')) setStatus('declined'); });
  $('#study-id')?.addEventListener('input', event => {
    const match = event.target.value.trim().match(/^MR-(\d{3})$/);
    if (match && !$('#case-code').value) $('#case-code').value = `CASE-${match[1]}`;
  });
  $('#provision-form')?.addEventListener('submit', provisionCase);
  $('#download-case-pdf')?.addEventListener('click', openCaseReport);
  if ($('#fidelity-form-wrap')) renderFidelityForm();
}

async function saveIntakeChanges(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  // Disabled account emails are intentionally retained rather than reassigned.
  if (!form.has('teacher_email')) form.set('teacher_email', state.selected.teacher_email);
  if (!form.has('coach_email')) form.set('coach_email', state.selected.coach_email);
  const changes = intakeChanges(form, state.selected);
  const missing = missingRequired(changes);
  const message = $('#edit-intake-message');
  if (missing.length) { message.textContent = 'Please complete all required fields.'; return; }
  const wasApproved = state.selected.status === 'approved';
  const { error } = await state.client.rpc('research_admin_update_intake', { target_request_id: state.selected.request_id, intake_changes: changes });
  if (error) { message.textContent = error.message; return; }
  const requestId = state.selected.request_id;
  state.editingIntake = false;
  state.intakeMessage = wasApproved ? 'Intake updated. Review and approve it again.' : 'Intake updated.';
  await loadIntakes();
  await openDetail(requestId, 'intake');
}

function openCaseReport() {
  if (!state.caseOperations || !state.readiness) return;
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) { window.alert('Allow pop-ups to open the Case PDF print window.'); return; }
  reportWindow.opener = null;
  const item = { ...state.caseOperations, case_code: state.readiness.case.case_code, student_alias: state.readiness.case.student_alias };
  reportWindow.document.open();
  reportWindow.document.write(renderCaseReport(item, state.readiness, state.fidelity, escapeHtml));
  reportWindow.document.close();
  reportWindow.addEventListener('load', () => reportWindow.print(), { once: true });
}

async function operationRpc(name,args,reload='case',successMessage=''){const {error}=await state.client.rpc(name,args);if(error){window.alert(friendlyBaselineError(error.message));return false;}if(successMessage)state.observerMessage=successMessage;await loadIntakes();if(reload==='home')renderHome();else await openDetail(state.selected.request_id, state.selectedTab);return true;}
function taskArgs(form,caseId){const f=new FormData(form);return {target_case_id:caseId,target_title:f.get('title'),target_category:f.get('category'),target_due_date:f.get('due_date')||null,target_required:f.has('required'),target_note:f.get('note')||null};}
function bindTaskControls(caseId,formSelector='#task-form'){
 const reload=caseId===null?'home':'case';
 $(formSelector)?.addEventListener('submit',event=>{event.preventDefault();operationRpc('research_admin_create_task',taskArgs(event.currentTarget,caseId),reload);});
 const scope=caseId===null?$('#study-wide-tasks'):$('#detail');
 scope?.querySelectorAll('.task-action').forEach(button=>button.addEventListener('click',()=>operationRpc('research_admin_set_task_status',{target_task_id:button.dataset.id,target_status:button.dataset.status},reload)));
}
function bindObserverTeam(){
 $('#observer-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_save_observer',{target_observer_id:null,target_observer_code:f.get('code'),target_display_name:f.get('name'),target_observer_type:f.get('type'),target_active:true},'home','Observer saved.');});
 document.querySelectorAll('.observer-edit-form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(form);operationRpc('research_admin_save_observer',{target_observer_id:form.dataset.id,target_observer_code:f.get('code'),target_display_name:f.get('name'),target_observer_type:f.get('type'),target_active:f.has('active')},'home','Observer saved.');}));
 $('#training-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_record_observer_training',{target_observer_id:f.get('observer_id'),target_event_type:f.get('event_type'),target_event_date:f.get('event_date'),target_teacher_fidelity_agreement:Number(f.get('teacher')),target_student_behavior_agreement:Number(f.get('student')),target_brief_note:f.get('note')||null},'home');});
}
function bindObservationControls(caseId){
 $('#observation-setup-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_save_observation_setup',{target_case_id:caseId,target_routine:f.get('routine'),target_behavior_definition:f.get('definition'),target_change_note:f.get('change_note')||null});});
 $('#edit-observation-setup')?.addEventListener('click',()=>{$('#observation-setup-form').hidden=false;$('#observation-setup-form').scrollIntoView({behavior:'smooth',block:'center'});});
 const unified=$('#record-observation-form');
 if(unified){const fields=unified.querySelector('.ioa-fields'),required=[...fields.querySelectorAll('select,input[type="number"]')];unified.querySelectorAll('[name="ioa_collected"]').forEach(input=>input.addEventListener('change',()=>{const selected=unified.querySelector('[name="ioa_collected"]:checked').value==='yes';fields.hidden=!selected;required.forEach(field=>{field.required=selected;if(!selected)field.value='';});}));unified.querySelector('[name="date"]').addEventListener('change',event=>{const date=event.target.value,phase=(state.caseOperations?.phase_history||[]).filter(x=>x.effective_date<=date).sort((a,b)=>b.effective_date.localeCompare(a.effective_date)||b.recorded_at.localeCompare(a.recorded_at))[0]?.phase;unified.querySelector('.phase-helper strong').textContent=phase?phase[0].toUpperCase()+phase.slice(1):'Not determinable';});unified.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(unified),payload=recordPayload(unified);operationRpc('research_admin_record_classroom_observation_summary',{target_case_id:caseId,target_observation_date:f.get('date'),target_primary_observer_id:f.get('primary'),target_secondary_observer_id:f.get('secondary')||null,target_start_time:f.get('start')||null,target_end_time:f.get('end')||null,target_observation_note:f.get('note')||null,target_ioa_note:f.get('ioa_note')||null,target_teacher_fidelity_percent:payload.teacher_fidelity_percent,target_student_target_behavior_percent:payload.student_target_behavior_percent,target_teacher_fidelity_ioa_percent:payload.teacher_fidelity_ioa_percent,target_student_behavior_ioa_percent:payload.student_behavior_ioa_percent});});}
 document.querySelectorAll('.edit-summary-toggle').forEach(button=>button.addEventListener('click',()=>{const form=document.querySelector(`.edit-summary-form[data-observation="${button.dataset.observation}"]`);form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input')?.focus();}));
 document.querySelectorAll('.edit-summary-form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(form),payload=recordPayload(form);operationRpc('research_admin_revise_classroom_observation_summary',{target_observation_id:form.dataset.observation,target_observation_note:f.get('observation_note')||null,target_ioa_note:f.get('ioa_note')||null,target_correction_reason:f.get('correction_reason'),target_teacher_fidelity_percent:payload.teacher_fidelity_percent,target_student_target_behavior_percent:payload.student_target_behavior_percent,target_teacher_fidelity_ioa_percent:payload.teacher_fidelity_ioa_percent,target_student_behavior_ioa_percent:payload.student_behavior_ioa_percent});}));
}
function bindOperations(){const caseId=state.readiness?.case?.id;if(!caseId)return;
 bindObservationControls(caseId);
 $('#protocol-form')?.addEventListener('submit',event=>{event.preventDefault();operationRpc('research_admin_set_case_protocol',{target_case_id:caseId,target_stagger_position:Number(new FormData(event.currentTarget).get('position'))});});
 document.querySelectorAll('.checklist-form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(form);operationRpc('research_admin_record_checklist_status',{target_case_id:caseId,target_item_key:form.dataset.key,target_status:f.get('status'),target_status_date:f.get('status_date'),target_brief_note:f.get('note')||null});}));
 document.querySelectorAll('.measure-form').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(form),status=f.get('status');if(status==='complete'&&!f.get('completed_on')){window.alert('Completion date is required when status is Complete.');return;}operationRpc('research_admin_record_measure',{target_case_id:caseId,target_measure_key:form.dataset.key,target_status:status,target_completed_on:f.get('completed_on')||null,target_external_reference:f.get('external_reference')||null,target_brief_note:f.get('note')||null});}));
 $('#phase-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_record_phase',{target_case_id:caseId,target_phase:f.get('phase'),target_effective_date:f.get('effective_date'),target_decision_note:f.get('note')||null});});
 bindTaskControls(caseId);
 $('#coaching-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget),focuses=f.getAll('focus').filter(x=>COACHING_FOCUSES.includes(x));if(!focuses.length){window.alert('Select at least one coaching focus.');return;}operationRpc('research_admin_record_coaching_contact',{target_case_id:caseId,target_contact_date:f.get('date'),target_format:f.get('format'),target_provider_role:f.get('provider'),target_focuses:focuses,target_approximate_duration_minutes:f.get('duration')?Number(f.get('duration')):null,target_brief_note:f.get('note')||null});});
 $('#event-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_record_study_event',{target_case_id:caseId,target_event_date:f.get('date'),target_event_type:f.get('type'),target_brief_note:f.get('note'),target_affects_observation:f.has('affects_observation'),target_affects_mr_exposure:f.has('affects_mr_exposure'),target_affects_phase_interpretation:f.has('affects_phase_interpretation'),target_action_taken:f.get('action_taken')||null});});
 document.querySelectorAll('.resolve-event').forEach(button=>button.addEventListener('click',()=>{const action=window.prompt('Action taken (optional). Existing action is retained if left blank.','');if(action!==null)operationRpc('research_admin_resolve_study_event',{target_event_id:button.dataset.id,target_action_taken:action||null});}));
}

async function recordSignoff(event) {
  const button = event.currentTarget;
  const version = state.readiness?.protected_content?.version;
  if (!window.confirm(`Mark this review complete for protected content version ${version}?`)) return;
  button.disabled = true;
  const { error } = await state.client.rpc('research_admin_record_case_signoff', {
    target_case_id: state.readiness.case.id,
    target_protected_content_version: version,
    target_review_type: button.dataset.reviewType
  });
  if (error) { $('#signoff-message').textContent = error.message; button.disabled = false; return; }
  await openDetail(state.selected.request_id, state.selectedTab);
}

async function adminApi(path, body) {
  const { data: { session } } = await state.client.auth.getSession();
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
async function createAccount(type, button) {
  button.disabled = true;
  try { await adminApi('/api/research-admin-create-account', { request_id: state.selected.request_id, account_type: type }); await openDetail(state.selected.request_id, state.selectedTab); }
  catch (error) { button.insertAdjacentHTML('afterend', `<p class="message">${escapeHtml(error.message)}</p>`); button.disabled = false; }
}
async function generateQaLink(event) {
  event.currentTarget.disabled = true;
  try {
    const result = await adminApi('/api/research-admin-qa-link', { request_id: state.selected.request_id });
    state.qaLink = result.action_link;
    $('#qa-result').innerHTML = `<label>Temporary test link<input value="${escapeHtml(state.qaLink)}" readonly></label><button id="copy-qa-link" class="quiet" type="button">Copy Link</button>`;
    $('#copy-qa-link').addEventListener('click', () => navigator.clipboard.writeText(state.qaLink));
  } catch (error) { $('#qa-result').textContent = error.message; event.currentTarget.disabled = false; }
}

function reviewedTargets() {
  return Array.from(document.querySelectorAll('#targets input')).map(input => ({ domain: input.dataset.domain, description: input.value.trim() })).filter(item => item.description);
}
function provisionPanel(row, teacher, coach) {
  if (row.status !== 'approved') return '<section class="panel no-print"><h2>Set Up Study Case</h2><p class="needs">Approve this intake before setting up the case.</p></section>';
  const disabled = !teacher.ready || !coach.ready;
  return `<section class="panel notice no-print"><h2>Set Up Study Case</h2><p>Create the study ID, student alias, and final fidelity targets. The game and reminders stay off.</p><form id="provision-form"><label>Study ID <small>— Example: MR-001</small><input id="study-id" name="study_id" required pattern="MR-[0-9]{3}" autocomplete="off"></label><label>Case code <small>— filled from Study ID</small><input id="case-code" name="case_code" required pattern="CASE-[0-9]{3}" autocomplete="off"></label><label>Student game alias <small>— Example: Kai</small><input id="student-alias" name="student_alias" required autocomplete="off"></label><small>Use a pseudonym. Do not enter the student's full name.</small><button class="primary" ${disabled ? 'disabled' : ''}>Set Up Study Case</button><p id="provision-message" class="message" aria-live="polite"></p></form><p class="off">Case setup only. Game and reminders stay off.</p></section>`;
}
async function provisionCase(event) {
  event.preventDefault();
  if (!window.confirm('Set up this study case? The game and reminders will stay off.')) return;
  const form = new FormData(event.currentTarget); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const args = { target_request_id: state.selected.request_id, study_id: String(form.get('study_id')).trim(), new_case_code: String(form.get('case_code')).trim(), student_game_alias: String(form.get('student_alias')).trim(), reviewed_targets: reviewedTargets() };
  const { data, error } = await state.client.rpc('provision_intake_case', args);
  if (error) { $('#provision-message').textContent = error.message; button.disabled = false; return; }
  state.selected.status = 'converted'; state.selected.converted_case_id = data?.[0]?.case_id; await openDetail(state.selected.request_id, state.selectedTab);
}
async function loadReadiness(requestId) {
  const { data, error } = await state.client.rpc('research_admin_case_readiness', { target_request_id: requestId });
  if (error) throw error;
  const { data: fidelity, error: fidelityError } = await state.client.rpc('research_admin_procedural_fidelity_dashboard', { target_case_id: data.case.id });
  if (fidelityError) throw fidelityError; state.fidelity = fidelity; state.readiness = data;
  const {data:operations,error:operationsError}=await state.client.rpc('research_admin_operations_dashboard',{target_case_id:data.case.id}); if(operationsError) throw operationsError; const {data:observationData,error:observationError}=await state.client.rpc('research_admin_observation_dashboard',{target_case_id:data.case.id});if(observationError)throw observationError;const {data:targets,error:targetsError}=await state.client.from('fidelity_targets').select('target_key,domain,description,sort_order').eq('case_id',data.case.id).eq('active',true).order('sort_order');if(targetsError)throw targetsError;state.caseOperations=operations.cases?.[0];state.caseOperations.fidelity_targets=targets||[];state.caseOperations.observation_data=observationData; return data;
}
function readinessPanel(data) {
  const states = readinessForCase(data);
  return renderOperations({...state.caseOperations,case_code:data.case.case_code},{...data,teacher_account_ready:state.accounts.teacher?.ready===true},escapeHtml)
    .replace('<!-- INTERVENTION_FIDELITY -->',fidelityPanel());
}

function fidelityPanel() {
  const f=state.fidelity, s=f.summary || {}, enabled=f.case_active && f.participant_active;
  const stat=(label,yes,applicable)=>`<div><span>${label}</span><strong>${percentage(yes,applicable)}</strong><small>${yes} / ${applicable} applicable components</small></div>`;
  const history=(f.history||[]).map(r=>`<li><strong>${r.review_scope==='daily'?'Daily':'Weekly'} · ${escapeHtml(r.study_date||`${r.week_start}–${r.week_end}`)}</strong> · ${r.fidelity_percent===null?'Not applicable':`${r.fidelity_percent}%`} · ${r.yes_count} / ${r.applicable_count} · ${escapeHtml(r.reviewer)} · ${formatDate(r.reviewed_at)} · <span class="${r.is_current?'ready':'off'}">${r.is_current?'Current':'Superseded'}</span></li>`).join('');
  return `<section class="panel procedural-fidelity no-print"><p id="operations-fidelity" class="eyebrow">MR Fidelity</p><h2>MR Procedural Fidelity</h2><p>Did Mission: Reinforceable run the way it was supposed to? This is separate from whether the teacher played or implemented the BIP/BSP correctly.</p><div class="fidelity-summary">${stat('Daily Fidelity',s.daily_yes||0,s.daily_applicable||0)}${stat('Weekly Fidelity',s.weekly_yes||0,s.weekly_applicable||0)}${stat('Overall Fidelity',s.overall_yes||0,s.overall_applicable||0)}</div><p><strong>Reviews completed:</strong> ${s.daily_dates||0} daily dates · ${s.study_weeks||0} study weeks. Missing periods are not scored.</p><p class="neutral-note">Mission completion and Weekly Teacher Report completion are participation data—not procedural-fidelity failures.</p>${enabled?`<label>Review<select id="fidelity-scope"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><div id="fidelity-form-wrap"></div>`:'<p class="off">Procedural fidelity logging begins when the participant enters the intervention phase.</p>'}<details class="review-history"><summary>Review history (${(f.history||[]).length})</summary>${history?`<ol>${history}</ol>`:'<p>No procedural-fidelity reviews recorded.</p>'}</details></section>`;
}
function renderFidelityForm(){
 const scope=$('#fidelity-scope')?.value||'daily', monday=scope==='weekly';
 $('#fidelity-form-wrap').innerHTML=`<form id="fidelity-form"><label>${monday?'Week beginning Monday':'Study date'}<input id="fidelity-date" type="date" min="${STUDY_START}" max="${STUDY_END}" required></label><div id="fidelity-evidence" class="system-evidence">Choose a date to see the system record.</div>${COMPONENTS[scope].map(([key,title,help])=>`<fieldset class="fidelity-component"><legend>${escapeHtml(title)}</legend><p>${escapeHtml(help)}</p><div data-evidence="${key}"></div><div class="criterion-options">${[['yes','Yes'],['no','No'],['na','N/A']].map(([v,l])=>`<label><input type="radio" name="fidelity-${key}" value="${v}" required> ${l}</label>`).join('')}</div><label>Note <textarea name="fidelity-note-${key}" maxlength="1000" rows="2"></textarea></label><small>Required for No and N/A. Keep notes brief. Do not include student names, diagnoses, or protected BIP/BSP content.</small></fieldset>`).join('')}<label>Optional overall review note<textarea id="fidelity-overall" maxlength="2000" rows="3"></textarea></label><button class="primary">Record ${monday?'Weekly':'Daily'} Fidelity Review</button><p id="fidelity-message" class="message" aria-live="polite"></p></form>`;
 $('#fidelity-date').addEventListener('change',loadFidelityEvidence); $('#fidelity-form').addEventListener('submit',submitFidelityReview);
}
async function loadFidelityEvidence(){
 const scope=$('#fidelity-scope').value,date=$('#fidelity-date').value;
 if (!date || (scope==='daily'?!isStudyDay(date):(new Date(`${date}T00:00:00Z`).getUTCDay()!==1 || !weekHasStudyDay(date)))) { $('#fidelity-evidence').textContent=scope==='daily'?'Choose a scheduled Granite study day.':'Choose a Monday whose week contains a Granite study day.'; return; }
 const args={target_participant_id:state.fidelity.participant_id,target_case_id:state.readiness.case.id,target_scope:scope,target_study_date:scope==='daily'?date:null,target_week_start:scope==='weekly'?date:null};
 const {data,error}=await state.client.rpc('research_admin_procedural_fidelity_evidence',args); if(error){$('#fidelity-evidence').textContent=error.message;return;} state.fidelityEvidence=data;
 $('#fidelity-evidence').textContent=`System record — use this to score the item. It will not choose the answer for you.`;
 const evidenceFor=scope==='daily'?[data.daily_prompt,data.mission_availability,data.functional_access]:[data.weekly_usage_summary,data.weekly_teacher_checkin];
 COMPONENTS[scope].forEach(([key],i)=>{document.querySelector(`[data-evidence="${key}"]`).innerHTML=`<small><strong>System record:</strong> ${escapeHtml(JSON.stringify(evidenceFor[i]))}</small>`;});
}
async function submitFidelityReview(event){
 event.preventDefault(); const scope=$('#fidelity-scope').value,date=$('#fidelity-date').value;
 const components=Object.fromEntries(COMPONENTS[scope].map(([key])=>[key,{status:document.querySelector(`[name="fidelity-${key}"]:checked`)?.value,note:document.querySelector(`[name="fidelity-note-${key}"]`).value.trim()||null}]));
 const missing=Object.entries(components).find(([,v])=>['no','na'].includes(v.status)&&!v.note); if(missing){$('#fidelity-message').textContent='A brief note is required for every No and N/A.';return;}
 const {error}=await state.client.rpc('research_admin_submit_procedural_fidelity_review',{target_participant_id:state.fidelity.participant_id,target_case_id:state.readiness.case.id,target_review_scope:scope,target_study_date:scope==='daily'?date:null,target_week_start:scope==='weekly'?date:null,submitted_components:components,submitted_overall_notes:$('#fidelity-overall').value.trim()||null});
 if(error){$('#fidelity-message').textContent=error.message;return;} await openDetail(state.selected.request_id, state.selectedTab);
}

async function setStatus(status) {
  const requestId = state.selected.request_id;
  const { error } = await state.client.rpc('research_admin_set_intake_status', { target_request_id: requestId, target_status: status });
  if (error) { $('#action-message').textContent = error.message; return; }
  if (status === 'approved') {
    await loadIntakes();
    state.intakeDecisionMessage = 'Intake approved.';
    await openDetail(requestId, 'intake');
    return;
  }
  state.selected.status = status;
  renderHome();
}
async function loadIntakes() { const { data, error } = await state.client.rpc('research_admin_intakes'); if (error) throw error; state.intakes = data || []; const {data:operations,error:operationsError}=await state.client.rpc('research_admin_operations_dashboard',{}); if(operationsError) throw operationsError; const {data:observations,error:observationError}=await state.client.rpc('research_admin_observation_dashboard',{});if(observationError)throw observationError;state.observationData=observations;for(const item of operations.cases||[]){const rows=(observations.observations||[]).filter(x=>x.case_id===item.id),completed=rows.filter(x=>x.summary_revision_id).length,paired=rows.filter(x=>x.summary_revision_id&&x.ioa).length,required=Math.ceil(completed*.20);item.observation_data={...observations,observations:rows,setups:(observations.setups||[]).filter(x=>x.case_id===item.id),coverage:{completed,ioa:paired,percent:completed?Math.round(1000*paired/completed)/10:0,required_minimum:required,additional_needed:Math.max(required-paired,0)}};} state.operations=operations; }
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
$('#sign-out').addEventListener('click', signOut); $('.sign-out-action').addEventListener('click', signOut); $('#retry').addEventListener('click', start); $('#back-home').addEventListener('click', renderHome); $('#print-intake').addEventListener('click', () => window.print());
start();
