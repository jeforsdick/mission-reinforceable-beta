import { accountState, normalizeTargets, readinessForCase } from './admin-model.mjs';
import { COMPONENTS, STUDY_START, STUDY_END, isStudyDay, weekHasStudyDay, percentage } from './procedural-fidelity.mjs';
import { ioaNeedsReview } from './observations-model.mjs';
import { attentionForCase, baselineReadiness, measureNeeds, studyWideAttention, COACHING_FOCUSES } from './operations-model.mjs';
import { renderOperations, renderStudyWideTasks } from './operations-ui.mjs';
import { renderObserverTeam, renderStudyIoaSummary, recordPayload, cycleInterval, updatePreviews } from './observations-ui.mjs';

const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
const state = { client: null, intakes: [], operations: { cases: [], study_wide_tasks: [] }, selected: null, accounts: {}, qaLink: '' };
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const COMPARABILITY_CONFIRMATION = 'I have reviewed the complete mission bank using the Mission Bank Comparability Review and all criteria meet expectations for this content version.';
const COMPARABILITY_CRITERIA = [
  ['consistent_structure', 'Consistent Mission Structure', 'Across Daily, Mystery, and Crisis missions, confirm that missions use the same core structure: 5 decisions, 3 plausible choices per decision, 10/5/0 scoring, branching, hints, and feedback.'],
  ['same_instructional_purpose', 'Same Instructional Purpose', "Confirm that all mission modes rehearse implementation of the participant's BIP/BSP and that no mode functions as a separate teaching program, assessment, or coaching intervention."],
  ['comparable_decision_difficulty', 'Comparable Decision Difficulty', 'Confirm that correct responses are not systematically more obvious in one mode, distractors remain plausible, and hints do not reveal the answer.'],
  ['comparable_feedback_support', 'Comparable Feedback and Support', 'Confirm that no mode systematically provides more explanation, prompting, hints, retries, feedback detail, or other instructional support than another.'],
  ['bip_alignment', 'BIP/BSP Alignment', "Confirm that choices, consequences, feedback, and plan references are supported by the participant's BIP/BSP."],
  ['target_representation', 'Reasonable Implementation-Target Representation', "Review the mission bank as a whole and confirm that the participant's implementation targets are reasonably represented across practice opportunities."],
  ['context_not_dose', 'Context — Not Dose — Distinguishes Modes', 'Confirm that Daily, Mystery, and Crisis differ primarily by scenario context rather than intervention strength. Daily: routine classroom situations. Mystery: unexpected/generalization situations. Crisis: higher-intensity/recovery situations.'],
  ['crisis_safety_boundaries', 'Crisis Safety Boundaries', "Confirm that Crisis missions do not invent crisis or emergency procedures that are absent from the participant's plan."],
  ['overall_comparability', 'Overall Comparability', 'Considering the complete mission bank, confirm that no mode is systematically easier, harder, longer, more supportive, or behaviorally complex enough to represent a meaningfully different intervention exposure.']
];

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
  $('#study-attention').innerHTML=all.length?`<section class="panel attention"><h3>Needs Attention</h3><ul>${all.map(({studyId,reason})=>`<li><strong>${escapeHtml(studyId)}</strong> — ${escapeHtml(reason)}</li>`).join('')}</ul></section>`:'<section class="panel"><strong>No actionable study needs right now.</strong></section>';
  $('#study-case-list').innerHTML=cases.length?cases.map(item=>{const attention=attentionForCase(item), baseline=baselineReadiness(item), measureCount=measureNeeds(item).length; return `<article class="intake-card study-card"><div class="card-top"><span class="pill">${escapeHtml(item.current_phase)}</span><span class="id">${escapeHtml(item.case_code)}</span></div><h3>${escapeHtml(item.study_id)}</h3><p>Student alias: <strong>${escapeHtml(item.student_alias)}</strong></p><dl><div><dt>Planned minimum</dt><dd>${item.protocol?`${item.protocol.planned_baseline_observations} observations`:'Not assigned'}</dd></div><div><dt>Protocol readiness</dt><dd>${baseline.ready?'Complete':`${baseline.remaining} need action`}</dd></div><div><dt>Measures</dt><dd>${measureCount?`${measureCount} need action`:'Current'}</dd></div><div><dt>Open tasks</dt><dd>${(item.tasks||[]).filter(x=>x.status==='pending').length}</dd></div><div><dt>Study events</dt><dd>${(item.study_events||[]).filter(x=>!x.resolved_at).length} unresolved</dd></div><div><dt>Observations</dt><dd>${item.observation_data?.observations?.filter(x=>x.primary_record_id).length||0}</dd></div><div><dt>IOA</dt><dd>${item.observation_data?.coverage?.percent||0}% coverage</dd></div><div><dt>IOA Review</dt><dd>${item.observation_data?.observations?.filter(x=>ioaNeedsReview(x.ioa)).length||0}</dd></div><div><dt>Attention</dt><dd>${attention.length||'None'}</dd></div></dl><button class="primary open-case" data-case="${item.id}">Open Case</button></article>`}).join(''):'<article class="panel"><h3>No prepared study cases</h3><p>Converted cases will appear here without being activated.</p></article>';
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
    const intakeContent = `${section('Contact Information', [field('Teacher', row.teacher_name), field('Teacher email', row.teacher_email), field('Coach', row.coach_name), field('Coach email', row.coach_email)])}
      ${section('Student and behavior context', [field('Student initials', row.student_initials), field('Grade', row.grade_level), field('Behavior description', row.target_behavior, true), field('Topography', row.behavior_topography, true), field('Student strengths & interests', row.student_strengths, true), field('Preferences & known reinforcers', row.preferred_items_activities, true), field('Preference information', row.preference_assessment_notes, true), field('Function', row.primary_function), field('Replacement behavior', row.replacement_behavior, true), field('Desired behavior', row.desired_behavior, true)])}
      ${section('Plan-Aligned Staff Actions', [field('Prevention details', row.prevention_strategies, true), field('Teaching details', row.teaching_strategies, true), field('Reinforcement details', row.reinforcement_system, true), field('Response details', row.response_strategy, true)])}
      ${row.has_crisis_plan ? section('Crisis / Safety Plan', [field('Crisis / Safety Plan', row.crisis_plan, true)]) : ''}
      ${section('Classroom and additional context', [field('Typical settings', row.typical_settings, true), field('Common triggers', row.common_triggers, true), field('Typical antecedents', row.typical_antecedents, true), field('Typical consequences', row.typical_consequences, true), field('Current staff responses', row.current_staff_responses, true), field('Requested scenarios', row.requested_scenarios, true), field('Additional context', row.additional_context, true)])}
      <section class="panel notice"><p class="eyebrow">Proposed / final reviewed fidelity targets</p><h2>Review and edit</h2><strong>Confirm final fidelity targets against the student’s BIP/BSP before setting up the case.</strong><p>Each target must be one atomic, observable teacher behavior. Keys derive only from final domain/order.</p><div id="targets">${targets.map(target => `<label class="target-row"><span>${escapeHtml(target.target_key)}</span><input data-domain="${target.domain}" data-order="${target.sort_order}" value="${escapeHtml(target.description)}" aria-label="${target.target_key}"><span class="print-target">${escapeHtml(target.description)}</span></label>`).join('')}</div></section>
      <section class="panel no-print"><p class="eyebrow">Account readiness</p><h2>Verified exact-email matches</h2>${accountBox('Teacher Account', row.teacher_email, teacher, 'teacher')}${accountBox('Coach Account', row.coach_email, coach, 'coach')}<p>No invitation or password-reset email will be sent.</p></section>
      ${converted ? '' : provisionPanel(row, teacher, coach)}${reviewActions(row)}`;
    const preparedHeader = converted ? `<div class="case-header"><div><p class="eyebrow">Prepared research case</p><h1>${escapeHtml(converted.participant?.participant_code || 'Study case')}</h1><p><strong>Case code:</strong> ${escapeHtml(converted.case.case_code)} · <strong>Student alias:</strong> ${escapeHtml(converted.case.student_alias)}</p></div><div class="case-status" aria-label="Case status"><span class="pill">${escapeHtml(state.caseOperations?.current_phase || 'prebaseline')}</span><span class="${converted.case.active ? 'ready' : 'off'}">Game ${converted.case.active ? 'ON' : 'OFF intentionally'}</span><span class="${converted.protected_content?.present ? 'ready' : 'needs'}">Content ${converted.protected_content?.present ? 'ready' : 'needs action'}</span></div></div>`
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
function accountBox(label, email, result, type) { return `<div class="account"><strong>${label}</strong><br><small>${escapeHtml(email)}</small><br><span class="${result.ready ? 'ready' : 'needs'}">${result.ready ? 'Ready' : 'No account yet'}</span>${result.ready && type === 'teacher' ? '<button class="primary qa-link" type="button">Generate Test Sign-In Link</button><small>QA only — no email will be sent.</small>' : !result.ready ? `<button class="primary create-account" data-type="${type}" type="button">Create ${type === 'teacher' ? 'Teacher' : 'Coach'} Account</button>` : ''}${type === 'teacher' ? '<div id="qa-result"></div>' : ''}</div>`; }
function reviewActions(row) { return row.status === 'submitted' ? `<section class="panel no-print"><h2>Intake decision</h2><p>Approval does not provision a case, activate gameplay, enable reminders, or send email.</p><div class="actions"><button id="approve" class="primary">Approve intake</button><button id="decline" class="primary decline">Decline intake</button></div><p id="action-message" class="message" aria-live="polite"></p></section>` : `<section class="panel no-print"><h2>Intake decision</h2><p>Current status: <strong>${escapeHtml(row.status)}</strong></p></section>`; }
function bindDetail() {
  bindCaseTabs();
  bindOperations();
  document.querySelectorAll('.create-account').forEach(button => button.addEventListener('click', () => createAccount(button.dataset.type, button)));
  $('.qa-link')?.addEventListener('click', generateQaLink);
  $('#preview-protected-game')?.addEventListener('click', event => {
    const caseCode = event.currentTarget.dataset.caseCode;
    window.open(`../game/?qa_case=${encodeURIComponent(caseCode)}`, '_blank', 'noopener');
  });
  document.querySelectorAll('.signoff-action:not(:disabled)').forEach(button => button.addEventListener('click', recordSignoff));
  $('#comparability-form')?.addEventListener('submit', submitComparabilityReview);
  $('#fidelity-scope')?.addEventListener('change', renderFidelityForm);
  $('#fidelity-date')?.addEventListener('change', loadFidelityEvidence);
  $('#fidelity-form')?.addEventListener('submit', submitFidelityReview);
  document.querySelectorAll('input[name^="criterion-"]').forEach(input => input.addEventListener('change', updateComparabilityConfirmation));
  $('#final-confirmation')?.addEventListener('change', updateComparabilityConfirmation);
  $('#approve')?.addEventListener('click', () => setStatus('approved'));
  $('#decline')?.addEventListener('click', () => { if (window.confirm('Decline this intake? This does not delete the submitted context.')) setStatus('declined'); });
  $('#study-id')?.addEventListener('input', event => {
    const match = event.target.value.trim().match(/^MR-(\d{3})$/);
    if (match && !$('#case-code').value) $('#case-code').value = `CASE-${match[1]}`;
  });
  $('#provision-form')?.addEventListener('submit', provisionCase);
  if ($('#fidelity-form-wrap')) renderFidelityForm();
}

async function operationRpc(name,args,reload='case',successMessage=''){const {error}=await state.client.rpc(name,args);if(error){window.alert(error.message);return false;}if(successMessage)state.observerMessage=successMessage;await loadIntakes();if(reload==='home')renderHome();else await openDetail(state.selected.request_id, state.selectedTab);return true;}
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
 $('#new-observation-form')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);operationRpc('research_admin_create_classroom_observation',{target_case_id:caseId,target_observation_date:f.get('date'),target_primary_observer_id:f.get('primary'),target_secondary_observer_id:f.get('secondary')||null,target_start_time:f.get('start')||null,target_end_time:f.get('end')||null,target_context_note:f.get('note')||null});});
 document.querySelectorAll('.observation-record-form').forEach(form=>{updatePreviews(form);form.querySelectorAll('.interval-cell').forEach(button=>button.addEventListener('click',()=>{cycleInterval(button);updatePreviews(form);}));form.querySelectorAll('.fidelity-entry input').forEach(input=>input.addEventListener('change',()=>updatePreviews(form)));form.addEventListener('submit',event=>{event.preventDefault();const payload=recordPayload(form),f=new FormData(form);if(payload.fidelity.some(x=>!x.status)){window.alert('Select one explicit score for every fidelity item.');return;}operationRpc('research_admin_submit_classroom_observation_record',{target_observation_id:form.dataset.observation,target_observer_role:form.dataset.role,submitted_fidelity_scores:payload.fidelity,submitted_student_intervals:payload.intervals,target_observer_note:f.get('observer_note')||null,target_correction_reason:f.get('correction_reason')||null});});});
}
function bindOperations(){const caseId=state.readiness?.case?.id;if(!caseId)return;
 bindObservationControls(caseId);
 $('#protocol-form')?.addEventListener('submit',event=>{event.preventDefault();operationRpc('research_admin_set_case_protocol',{target_case_id:caseId,target_stagger_position:Number(new FormData(event.currentTarget).get('position'))});});
 $('#protocol-swap-form')?.addEventListener('submit',event=>{event.preventDefault();const other=new FormData(event.currentTarget).get('other_case_id');if(other)operationRpc('research_admin_swap_case_protocol_positions',{first_case_id:caseId,second_case_id:other});});
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

function updateComparabilityConfirmation() {
  const allAnswered = COMPARABILITY_CRITERIA.every(([key]) => document.querySelector(`input[name="criterion-${key}"]:checked`));
  const allPass = allAnswered && COMPARABILITY_CRITERIA.every(([key]) => document.querySelector(`input[name="criterion-${key}"]:checked`)?.value === 'pass');
  const confirmation = $('#comparability-confirmation');
  if (confirmation) confirmation.hidden = !allPass;
  const submit = $('#submit-comparability');
  if (submit) submit.disabled = !allAnswered || (allPass && (!state.readiness.mission_bank_comparability.complete_bank || !$('#final-confirmation')?.checked));
}

async function submitComparabilityReview(event) {
  event.preventDefault();
  const criteria = Object.fromEntries(COMPARABILITY_CRITERIA.map(([key]) => [key, {
    status: document.querySelector(`input[name="criterion-${key}"]:checked`)?.value,
    note: document.querySelector(`[name="note-${key}"]`).value.trim() || null
  }]));
  const allPass = Object.values(criteria).every(item => item.status === 'pass');
  if (!window.confirm(allPass ? `Finalize this all-Pass review for protected content version ${state.readiness.protected_content.version}?` : 'Record this review attempt with revisions identified?')) return;
  const button = $('#submit-comparability'); button.disabled = true;
  const { error } = await state.client.rpc('research_admin_submit_mission_bank_comparability_review', {
    target_case_id: state.readiness.case.id,
    target_protected_content_version: state.readiness.protected_content.version,
    submitted_criteria: criteria,
    submitted_overall_notes: $('#comparability-overall-notes').value.trim() || null,
    final_confirmation: allPass && $('#final-confirmation').checked
  });
  if (error) { $('#comparability-message').textContent = error.message; updateComparabilityConfirmation(); return; }
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
  return `<section class="panel notice no-print"><p class="eyebrow">Prepared state only</p><h2>Set Up Study Case</h2><p>Create the study ID, game alias, teacher/coach connections, and finalized fidelity targets. Game access and reminders will remain off.</p><form id="provision-form"><label>Study ID <small>— Example: MR-001</small><input id="study-id" name="study_id" required pattern="MR-[0-9]{3}" autocomplete="off"></label><label>Case code <small>— automatically suggested from Study ID</small><input id="case-code" name="case_code" required pattern="CASE-[0-9]{3}" autocomplete="off"></label><label>Student game alias <small>— Example: Kai</small><input id="student-alias" name="student_alias" required autocomplete="off"></label><small>Use a non-identifying game name or pseudonym. Do not enter the student's full name.</small><button class="primary" ${disabled ? 'disabled' : ''}>Set Up Study Case</button><p id="provision-message" class="message" aria-live="polite"></p></form><p class="off">This creates a prepared case. Gameplay and reminders remain OFF.</p></section>`;
}
async function provisionCase(event) {
  event.preventDefault();
  if (!window.confirm('Set up this study case in the prepared state? Gameplay and reminders will remain OFF.')) return;
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
  const {data:operations,error:operationsError}=await state.client.rpc('research_admin_operations_dashboard',{target_case_id:data.case.id}); if(operationsError) throw operationsError; const {data:observationData,error:observationError}=await state.client.rpc('research_admin_observation_dashboard',{target_case_id:data.case.id});if(observationError)throw observationError;state.caseOperations=operations.cases?.[0];state.caseOperations.observation_data=observationData; return data;
}
function readinessPanel(data) {
  const states = readinessForCase(data);
  const rows = [['Intake reviewed', 'Ready'], ['Teacher account linked', states.teacher], ['Coach account linked', states.coach], ['Case created', states.case], ['Case intake snapshot', states.snapshot], ['Fidelity targets finalized', states.targets], ['Coach assigned', states.assignment], ['Protected game content', states.content === 'Ready' ? `Ready — version ${escapeHtml(data.protected_content.version)}, updated ${formatDate(data.protected_content.updated_at)}` : 'Needs action — Not loaded'], ['BIP Resource Map finalized', states.resourceMap], ['Mission bank comparability reviewed', states.comparability], ['Game access', states.game === 'Ready' ? 'Ready — intervention active' : 'OFF intentionally — intervention not activated'], ['Daily reminders', states.reminders === 'Ready' ? 'Ready — enabled' : 'OFF intentionally']];
  const preview = states.content === 'Ready' ? `<button id="preview-protected-game" class="primary" type="button" data-case-code="${escapeHtml(data.case.case_code)}">Preview Protected Game</button><small>QA only — does not activate teacher gameplay or reminders. QA sessions are excluded from study data.</small>` : '';
  const signoffs = states.content === 'Ready' ? `<div class="signoffs no-print"><h3>Review Checks</h3><p>Approving protected content <strong>version ${escapeHtml(data.protected_content.version)}</strong>. A later version requires new signoffs.</p>${[
    ['resource_behavior_review', 'Behavioral review complete', data.resource_map?.behavior_reviewed],
    ['resource_privacy_review', 'Privacy review complete', data.resource_map?.privacy_reviewed],
    ['resource_qa_preview', 'Resource QA Preview passed', data.resource_map?.qa_previewed]
  ].map(([type, label, done]) => `<button class="signoff-action ${done ? 'signed' : ''}" type="button" data-review-type="${type}" ${done ? 'disabled' : ''}>${done ? '✓ ' : ''}${label}</button>`).join('')}<p id="signoff-message" class="message" aria-live="polite"></p></div>` : '';
  return `${renderOperations(state.caseOperations,data,escapeHtml,state.operations.cases||[])}<section class="panel"><p class="eyebrow">Prepared Case / Review Checks</p><h2>${escapeHtml(data.case.case_code)}</h2><p><strong>Study ID:</strong> ${escapeHtml(data.participant?.participant_code || '—')}<br><strong>Game alias:</strong> ${escapeHtml(data.case.student_alias)}</p><div class="checklist">${rows.map(([label, value]) => `<div><span>${label}</span><strong class="${value.startsWith('Ready') ? 'ready' : value.startsWith('OFF') ? 'off' : 'needs'}">${value}</strong></div>`).join('')}</div>${preview}${signoffs}<p><strong>Prepared does not mean intervention active.</strong></p></section>${states.content === 'Ready' ? comparabilityPanel(data) : ''}${fidelityPanel()}`;
}

function fidelityPanel() {
  const f=state.fidelity, s=f.summary || {}, enabled=f.case_active && f.participant_active;
  const stat=(label,yes,applicable)=>`<div><span>${label}</span><strong>${percentage(yes,applicable)}</strong><small>${yes} / ${applicable} applicable components</small></div>`;
  const history=(f.history||[]).map(r=>`<li><strong>${r.review_scope==='daily'?'Daily':'Weekly'} · ${escapeHtml(r.study_date||`${r.week_start}–${r.week_end}`)}</strong> · ${r.fidelity_percent===null?'Not applicable':`${r.fidelity_percent}%`} · ${r.yes_count} / ${r.applicable_count} · ${escapeHtml(r.reviewer)} · ${formatDate(r.reviewed_at)} · <span class="${r.is_current?'ready':'off'}">${r.is_current?'Current':'Superseded'}</span></li>`).join('');
  return `<section class="panel procedural-fidelity no-print"><p class="eyebrow">Research operations</p><h2>MR Procedural Fidelity</h2><p>Procedural fidelity reflects whether Mission: Reinforceable was delivered as intended. Teacher participation and classroom implementation are analyzed separately.</p><div class="fidelity-summary">${stat('Daily Procedural Fidelity',s.daily_yes||0,s.daily_applicable||0)}${stat('Weekly Procedural Fidelity',s.weekly_yes||0,s.weekly_applicable||0)}${stat('Overall Recorded Procedural Fidelity',s.overall_yes||0,s.overall_applicable||0)}</div><p><strong>Recorded reviews:</strong> ${s.daily_dates||0} daily dates · ${s.study_weeks||0} study weeks. Missing periods are not scored.</p><p class="neutral-note">Teacher mission completion and Weekly Teacher Report completion are engagement/adherence measures. They are not scored as procedural-fidelity failures when the MR component was delivered as intended.</p>${enabled?`<label>Review type<select id="fidelity-scope"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><div id="fidelity-form-wrap"></div>`:'<p class="off">Procedural fidelity logging begins when the participant enters the intervention phase.</p>'}<details class="review-history"><summary>Review history (${(f.history||[]).length})</summary>${history?`<ol>${history}</ol>`:'<p>No procedural-fidelity reviews recorded.</p>'}</details></section>`;
}
function renderFidelityForm(){
 const scope=$('#fidelity-scope')?.value||'daily', monday=scope==='weekly';
 $('#fidelity-form-wrap').innerHTML=`<form id="fidelity-form"><label>${monday?'Week beginning Monday':'Eligible Granite study date'}<input id="fidelity-date" type="date" min="${STUDY_START}" max="${STUDY_END}" required></label><div id="fidelity-evidence" class="system-evidence">Select a ${monday?'study week':'study date'} to load supporting system evidence.</div>${COMPONENTS[scope].map(([key,title,help])=>`<fieldset class="fidelity-component"><legend>${escapeHtml(title)}</legend><p>${escapeHtml(help)}</p><div data-evidence="${key}"></div><div class="criterion-options">${[['yes','Yes'],['no','No'],['na','N/A']].map(([v,l])=>`<label><input type="radio" name="fidelity-${key}" value="${v}" required> ${l}</label>`).join('')}</div><label>Brief note <textarea name="fidelity-note-${key}" maxlength="1000" rows="2"></textarea></label><small>Required for No and N/A. Keep notes brief and operational. Do not include student names, diagnoses, or protected BIP content.</small></fieldset>`).join('')}<label>Optional overall review note<textarea id="fidelity-overall" maxlength="2000" rows="3"></textarea></label><button class="primary">Record ${monday?'Weekly':'Daily'} Fidelity Review</button><p id="fidelity-message" class="message" aria-live="polite"></p></form>`;
 $('#fidelity-date').addEventListener('change',loadFidelityEvidence); $('#fidelity-form').addEventListener('submit',submitFidelityReview);
}
async function loadFidelityEvidence(){
 const scope=$('#fidelity-scope').value,date=$('#fidelity-date').value;
 if (!date || (scope==='daily'?!isStudyDay(date):(new Date(`${date}T00:00:00Z`).getUTCDay()!==1 || !weekHasStudyDay(date)))) { $('#fidelity-evidence').textContent=scope==='daily'?'Choose a scheduled Granite study day.':'Choose a Monday whose week contains a Granite study day.'; return; }
 const args={target_participant_id:state.fidelity.participant_id,target_case_id:state.readiness.case.id,target_scope:scope,target_study_date:scope==='daily'?date:null,target_week_start:scope==='weekly'?date:null};
 const {data,error}=await state.client.rpc('research_admin_procedural_fidelity_evidence',args); if(error){$('#fidelity-evidence').textContent=error.message;return;} state.fidelityEvidence=data;
 $('#fidelity-evidence').textContent=`System evidence (${data.authoritative_timezone}): supporting evidence only; it does not select Yes, No, or N/A.`;
 const evidenceFor=scope==='daily'?[data.daily_prompt,data.mission_availability,data.functional_access]:[data.weekly_usage_summary,data.weekly_teacher_checkin];
 COMPONENTS[scope].forEach(([key],i)=>{document.querySelector(`[data-evidence="${key}"]`).innerHTML=`<small><strong>System Evidence:</strong> ${escapeHtml(JSON.stringify(evidenceFor[i]))}</small>`;});
}
async function submitFidelityReview(event){
 event.preventDefault(); const scope=$('#fidelity-scope').value,date=$('#fidelity-date').value;
 const components=Object.fromEntries(COMPONENTS[scope].map(([key])=>[key,{status:document.querySelector(`[name="fidelity-${key}"]:checked`)?.value,note:document.querySelector(`[name="fidelity-note-${key}"]`).value.trim()||null}]));
 const missing=Object.entries(components).find(([,v])=>['no','na'].includes(v.status)&&!v.note); if(missing){$('#fidelity-message').textContent='A brief note is required for every No and N/A.';return;}
 const {error}=await state.client.rpc('research_admin_submit_procedural_fidelity_review',{target_participant_id:state.fidelity.participant_id,target_case_id:state.readiness.case.id,target_review_scope:scope,target_study_date:scope==='daily'?date:null,target_week_start:scope==='weekly'?date:null,submitted_components:components,submitted_overall_notes:$('#fidelity-overall').value.trim()||null});
 if(error){$('#fidelity-message').textContent=error.message;return;} await openDetail(state.selected.request_id, state.selectedTab);
}

function comparabilityPanel(data) {
  const review = data.mission_bank_comparability;
  const status = review.reviewed ? 'Ready' : !review.complete_bank ? 'Mission bank incomplete' : review.status;
  const criteria = COMPARABILITY_CRITERIA.map(([key, title, guidance], index) => `<fieldset class="comparability-criterion"><legend>${index + 1}. ${escapeHtml(title)}</legend><p>${escapeHtml(guidance)}</p><div class="criterion-options"><label><input type="radio" name="criterion-${key}" value="pass" required> Pass</label><label><input type="radio" name="criterion-${key}" value="revise"> Revise</label></div><label>Optional brief note<textarea name="note-${key}" maxlength="1000" rows="2"></textarea></label><small>Optional. Keep notes brief and do not copy protected student/BIP content into this field.</small></fieldset>`).join('');
  const history = (review.history || []).map(item => {
    const revised = COMPARABILITY_CRITERIA.flatMap(([key], index) => item.criteria?.[key]?.status === 'revise' ? [index + 1] : []);
    return `<li><strong>${item.all_pass ? 'All Pass' : 'Revisions Identified'}</strong> · ${formatDate(item.reviewed_at)} · ${escapeHtml(item.reviewer)} · version ${escapeHtml(item.protected_content_version)}${revised.length ? ` · Revise: ${revised.join(', ')}` : ''}</li>`;
  }).join('');
  return `<section class="panel comparability no-print"><p class="eyebrow">Structured human review</p><h2>Mission Bank Comparability Review</h2><p><strong>Mission modes describe scenario context, not dose or intervention strength.</strong></p><p>Reviewing protected content version ${escapeHtml(data.protected_content.version)}</p><div class="mission-counts"><span>Daily: <strong>${review.daily_count} / 10</strong></span><span>Mystery: <strong>${review.mystery_count} / 5</strong></span><span>Crisis: <strong>${review.crisis_count} / 5</strong></span></div><p class="${status === 'Ready' ? 'ready' : 'needs'}">${escapeHtml(status)}</p>${review.reviewed ? '<p>This version has a final all-Pass comparability signoff. A later protected content version requires a new review.</p>' : `<form id="comparability-form">${criteria}<label>Optional overall notes<textarea id="comparability-overall-notes" maxlength="2000" rows="3"></textarea></label><small>Keep notes brief and do not copy protected student/BIP content into this field.</small><div id="comparability-confirmation" class="final-confirmation" hidden><label><input id="final-confirmation" type="checkbox"> ${COMPARABILITY_CONFIRMATION}</label></div><button id="submit-comparability" class="primary" disabled>Record Review${review.complete_bank ? ' / Finalize All-Pass' : ''}</button><p id="comparability-message" class="message" aria-live="polite"></p></form>`}<details class="review-history"><summary>Review history (${(review.history || []).length})</summary>${history ? `<ol>${history}</ol>` : '<p>No review attempts recorded.</p>'}</details></section>`;
}
async function setStatus(status) {
  const { error } = await state.client.rpc('research_admin_set_intake_status', { target_request_id: state.selected.request_id, target_status: status });
  if (error) { $('#action-message').textContent = error.message; return; }
  state.selected.status = status; renderHome();
}
async function loadIntakes() { const { data, error } = await state.client.rpc('research_admin_intakes'); if (error) throw error; state.intakes = data || []; const {data:operations,error:operationsError}=await state.client.rpc('research_admin_operations_dashboard',{}); if(operationsError) throw operationsError; const {data:observations,error:observationError}=await state.client.rpc('research_admin_observation_dashboard',{});if(observationError)throw observationError;state.observationData=observations;for(const item of operations.cases||[]){const rows=(observations.observations||[]).filter(x=>x.case_id===item.id),completed=rows.filter(x=>x.primary_record_id).length,paired=rows.filter(x=>x.primary_record_id&&x.secondary_record_id).length,required=Math.ceil(completed*.20);item.observation_data={...observations,observations:rows,setups:(observations.setups||[]).filter(x=>x.case_id===item.id),coverage:{completed,ioa:paired,percent:completed?Math.round(1000*paired/completed)/10:0,required_minimum:required,additional_needed:Math.max(required-paired,0)}};} state.operations=operations; }
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
