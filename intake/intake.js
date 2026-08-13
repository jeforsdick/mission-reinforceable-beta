(function () {
  'use strict';

  const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  const DOMAINS = {
    proactive: ['Proactive / Prevention', 'What should the teacher consistently do before or early in situations where the behavior is likely?'],
    teaching: ['Teaching', 'What should the teacher consistently do to teach or prompt the replacement behavior?'],
    reinforcement: ['Reinforcement', 'What should the teacher consistently notice and reinforce?'],
    response: ['Response', 'What should the teacher consistently do when the target behavior occurs?'],
    crisis: ['Crisis / Safety', 'What should the teacher consistently do to follow the crisis or safety plan?']
  };
  const REQUIRED_FIELDS = ['teacher_name', 'teacher_email', 'coach_name', 'coach_email', 'grade_level', 'student_initials', 'target_behavior', 'behavior_topography', 'primary_function', 'replacement_behavior', 'desired_behavior', 'prevention_strategies', 'teaching_strategies', 'reinforcement_system', 'response_strategy', 'typical_settings', 'common_triggers', 'typical_antecedents', 'typical_consequences', 'current_staff_responses'];
  const INTAKE_FIELDS = REQUIRED_FIELDS.concat(['crisis_plan', 'requested_scenarios', 'additional_context']);
  const state = { client: null, user: null, profile: null, caseId: '', intake: null, targets: [], busy: false, viewing: false };
  const $ = selector => document.querySelector(selector);

  function showOnly(id) {
    ['loading-view', 'login-view', 'unauthorized-view', 'admin-view'].forEach(view => { $(`#${view}`).hidden = view !== id; });
  }
  function readableError(error, prefix) { return `${prefix} ${error && error.message ? error.message : 'Unknown error'}`; }
  function makeClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('The secure sign-in service did not load. Refresh the page and try again.');
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  async function authenticate() {
    showOnly('loading-view');
    try {
      state.client = state.client || makeClient();
      const { data, error } = await state.client.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') throw error;
      if (!data || !data.user) { showOnly('login-view'); $('#login-email').focus(); return; }
      state.user = data.user;
      const result = await state.client.from('profiles').select('id, display_name, email, role, active').eq('id', state.user.id).maybeSingle();
      if (result.error) throw new Error(`Unable to verify administrator access: ${result.error.message}`);
      state.profile = result.data;
      if (!state.profile || state.profile.role !== 'research_admin' || state.profile.active !== true) { showOnly('unauthorized-view'); $('#sign-out').hidden = false; return; }
      showOnly('admin-view'); $('#sign-out').hidden = false; await loadCases();
    } catch (error) { showOnly('login-view'); $('#login-error').textContent = readableError(error, 'Unable to open the intake tool.'); }
  }
  async function signOut() { if (state.client) await state.client.auth.signOut(); window.location.reload(); }
  function caseLabel(record) { return record.case_code ? `${record.case_code}${record.active === false ? ' (inactive)' : ''}` : `Case ${String(record.id).slice(0, 8)}`; }
  async function loadCases() {
    const result = await state.client.from('cases').select('*').order('created_at', { ascending: false });
    if (result.error) { $('#case-message').textContent = readableError(result.error, 'Cases could not be loaded.'); $('#case-message').className = 'message error'; return; }
    (result.data || []).forEach(record => { const option = document.createElement('option'); option.value = record.id; option.textContent = caseLabel(record); $('#case-select').append(option); });
    if (!result.data || !result.data.length) $('#case-message').textContent = 'No existing cases are available. A case must be created by the research team before an intake can be saved.';
  }
  function hasCrisis() { return $('input[name="has_crisis_plan"]:checked')?.value === 'true'; }
  function renderDomain(domain, rows) {
    const card = document.createElement('section'); card.className = 'domain-card'; card.dataset.domain = domain; card.hidden = domain === 'crisis' && !hasCrisis();
    card.innerHTML = `<h3>${DOMAINS[domain][0]} <i>*</i></h3><p class="helper">${DOMAINS[domain][1]}</p><div class="step-list"></div><button class="add-step" type="button">+ Add another step</button><p class="domain-error" aria-live="polite"></p>`;
    const list = card.querySelector('.step-list'); (rows.length ? rows : [{ id: '', description: '' }]).forEach(row => addStep(list, row));
    card.querySelector('.add-step').addEventListener('click', () => addStep(list, { id: '', description: '' })); return card;
  }
  function addStep(list, row) {
    const wrapper = document.createElement('div'); wrapper.className = 'step-row'; wrapper.dataset.id = row.id || '';
    wrapper.innerHTML = '<span class="step-label"></span><input type="text" aria-label="Fidelity step"><button class="remove-step" type="button">Remove</button>';
    wrapper.querySelector('input').value = row.description || '';
    wrapper.querySelector('.remove-step').addEventListener('click', () => { wrapper.remove(); if (!list.children.length) addStep(list, {}); renumber(list); });
    list.append(wrapper); renumber(list);
  }
  function renumber(list) {
    Array.from(list.children).forEach((row, index) => { const title = DOMAINS[list.closest('.domain-card').dataset.domain][0]; row.querySelector('.step-label').textContent = `Step ${index + 1}`; row.querySelector('input').setAttribute('aria-label', `${title} step ${index + 1}`); const remove = row.querySelector('.remove-step'); remove.hidden = list.children.length === 1; remove.setAttribute('aria-label', `Remove ${title} step ${index + 1}`); });
  }
  function renderTargets(targets) {
    const container = $('#fidelity-domains'); container.replaceChildren();
    Object.keys(DOMAINS).forEach(domain => container.append(renderDomain(domain, targets.filter(row => row.domain === domain && row.active !== false).sort((a, b) => a.sort_order - b.sort_order))));
  }
  function toggleCrisis() { const enabled = hasCrisis(); $('#crisis-plan-wrap').hidden = !enabled; const card = $('.domain-card[data-domain="crisis"]'); if (card) card.hidden = !enabled; if (!enabled) clearFieldError('crisis_plan'); }
  function setStatus(status) { const badge = $('#status-badge'); badge.className = `status ${status || 'new'}`; badge.textContent = status === 'submitted' ? 'Submitted' : status === 'draft' ? 'Draft' : 'Not started'; }
  function resetForm() { $('#intake-form').reset(); state.intake = null; state.targets = []; renderTargets([]); toggleCrisis(); clearErrors(); setStatus(); }
  function populateForm(intake, targets) {
    resetForm(); state.intake = intake; state.targets = targets;
    INTAKE_FIELDS.forEach(name => { const field = $(`[name="${name}"]`); if (field) field.value = intake[name] || ''; });
    const crisis = $(`input[name="has_crisis_plan"][value="${intake.has_crisis_plan === true}"]`); if (crisis) crisis.checked = true;
    renderTargets(targets); toggleCrisis(); setStatus(intake.status);
  }
  function setViewing(viewing) {
    state.viewing = viewing; $('#form-fields').disabled = viewing || !state.caseId; $('#save-draft').disabled = viewing || !state.caseId; $('#submit-intake').disabled = viewing || !state.caseId;
    $('#edit-intake').hidden = !(state.intake && state.intake.status === 'submitted' && viewing); $('#save-draft').textContent = state.intake && state.intake.status === 'submitted' ? 'Revert to Draft' : 'Save Draft';
  }
  async function selectCase() {
    state.caseId = $('#case-select').value; $('#case-message').textContent = ''; $('#completion-panel').hidden = true; resetForm(); setViewing(true); if (!state.caseId) return;
    $('#case-message').textContent = 'Loading intake…';
    const [intakeResult, targetResult] = await Promise.all([state.client.from('case_intake').select('*').eq('case_id', state.caseId).maybeSingle(), state.client.from('fidelity_targets').select('*').eq('case_id', state.caseId).order('sort_order')]);
    if (intakeResult.error || targetResult.error) { $('#case-message').className = 'message error'; $('#case-message').textContent = readableError(intakeResult.error || targetResult.error, 'This intake could not be loaded.'); return; }
    if (intakeResult.data) populateForm(intakeResult.data, targetResult.data || []);
    $('#case-message').className = 'message'; $('#case-message').textContent = intakeResult.data ? 'Existing intake loaded.' : 'No intake has been started. It will be created when you save.'; setViewing(Boolean(intakeResult.data && intakeResult.data.status === 'submitted'));
  }
  function fieldValue(name) { return String($(`[name="${name}"]`)?.value || '').trim(); }
  function intakePayload(status) {
    const payload = { case_id: state.caseId, has_crisis_plan: hasCrisis(), status }; INTAKE_FIELDS.forEach(name => { payload[name] = fieldValue(name) || null; }); if (!payload.has_crisis_plan) payload.crisis_plan = null;
    if (status === 'submitted') { payload.submitted_by = state.profile.id; payload.submitted_at = state.intake?.submitted_at || new Date().toISOString(); } else { payload.submitted_by = null; payload.submitted_at = null; } return payload;
  }
  function collectTargets() {
    const rows = []; document.querySelectorAll('.domain-card').forEach(card => { if (card.dataset.domain === 'crisis' && !hasCrisis()) return; card.querySelectorAll('.step-row').forEach((row, index) => { const description = row.querySelector('input').value.trim(); if (description) rows.push({ id: row.dataset.id || null, case_id: state.caseId, domain: card.dataset.domain, description, sort_order: index + 1, active: true }); }); }); return rows;
  }
  function clearFieldError(name) { const field = $(`[name="${name}"]`); const error = $(`#${name}-error`); if (field) field.removeAttribute('aria-invalid'); if (error) error.textContent = ''; }
  function clearErrors() { document.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid')); document.querySelectorAll('.field-error,.domain-error').forEach(el => { el.textContent = ''; }); $('#form-message').textContent = ''; $('#form-message').className = 'message save-message'; }
  function setFieldError(name, message) { const field = $(`[name="${name}"]`); const error = $(`#${name}-error`); if (field) field.setAttribute('aria-invalid', 'true'); if (error) error.textContent = message; return field; }
  function validate() {
    clearErrors(); let first = null; REQUIRED_FIELDS.forEach(name => { if (!fieldValue(name)) first = first || setFieldError(name, 'This field is required before submission.'); });
    ['teacher_email', 'coach_email'].forEach(name => { const field = $(`[name="${name}"]`); if (fieldValue(name) && !field.checkValidity()) first = first || setFieldError(name, 'Enter a valid email address.'); });
    if (hasCrisis() && !fieldValue('crisis_plan')) first = first || setFieldError('crisis_plan', 'Describe the crisis or safety plan before submission.');
    const targets = collectTargets(); ['proactive', 'teaching', 'reinforcement', 'response'].concat(hasCrisis() ? ['crisis'] : []).forEach(domain => { if (!targets.some(row => row.domain === domain)) { const card = $(`.domain-card[data-domain="${domain}"]`); card.querySelector('.domain-error').textContent = 'Add at least one nonblank step before submission.'; const input = card.querySelector('input'); input.setAttribute('aria-invalid', 'true'); first = first || input; } });
    if (first) { $('#form-message').textContent = 'Please correct the highlighted fields. Your entries have been preserved.'; $('#form-message').className = 'message save-message error'; first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); return false; } return true;
  }
  async function syncTargets(wasSubmitted) {
    // Existing IDs are updated in place. Removed draft targets are deleted; targets
    // removed from a submitted intake are retained and soft-deactivated for history.
    const current = collectTargets(); const retainedIds = new Set(current.filter(row => row.id).map(row => row.id)); const removed = state.targets.filter(row => row.active !== false && !retainedIds.has(row.id));
    for (const row of current) { const values = { case_id: row.case_id, domain: row.domain, description: row.description, sort_order: row.sort_order, active: true }; const result = row.id ? await state.client.from('fidelity_targets').update(values).eq('id', row.id).eq('case_id', state.caseId) : await state.client.from('fidelity_targets').insert(values).select('id').single(); if (result.error) throw new Error(`A fidelity step could not be saved: ${result.error.message}`); if (!row.id) row.id = result.data.id; }
    for (const row of removed) { const result = wasSubmitted ? await state.client.from('fidelity_targets').update({ active: false }).eq('id', row.id).eq('case_id', state.caseId) : await state.client.from('fidelity_targets').delete().eq('id', row.id).eq('case_id', state.caseId); if (result.error) throw new Error(`A removed fidelity step could not be synchronized: ${result.error.message}`); }
    state.targets = current; renderTargets(current); toggleCrisis();
  }
  function setBusy(busy, action) { state.busy = busy; $('#case-select').disabled = busy; $('#save-draft').disabled = busy || state.viewing || !state.caseId; $('#submit-intake').disabled = busy || state.viewing || !state.caseId; $('#save-draft').textContent = busy && action === 'draft' ? 'Saving…' : state.intake?.status === 'submitted' ? 'Revert to Draft' : 'Save Draft'; $('#submit-intake').textContent = busy && action === 'submitted' ? 'Submitting…' : 'Submit Intake'; }
  async function save(status) {
    if (state.busy || !state.caseId || (status === 'submitted' && !validate())) return;
    if (status === 'draft' && state.intake?.status === 'submitted' && !window.confirm('Revert this submitted intake to Draft? Its original submission date will be cleared.')) return;
    clearErrors(); setBusy(true, status);
    try { const wasSubmitted = state.intake?.status === 'submitted'; const result = await state.client.from('case_intake').upsert(intakePayload(status), { onConflict: 'case_id' }).select('*').single(); if (result.error) throw new Error(`The intake could not be saved: ${result.error.message}`); state.intake = result.data; await syncTargets(wasSubmitted); setStatus(status); setViewing(status === 'submitted'); if (status === 'draft') { $('#form-message').textContent = 'Draft saved.'; $('#form-message').className = 'message save-message success'; } else { $('#completion-panel').hidden = false; $('#completion-panel').focus(); $('#completion-panel').scrollIntoView({ behavior: 'smooth' }); } }
    catch (error) { $('#form-message').textContent = readableError(error, 'Save failed.'); $('#form-message').className = 'message save-message error'; } finally { setBusy(false, status); }
  }
  function bindEvents() {
    $('#login-form').addEventListener('submit', async event => { event.preventDefault(); const button = $('#login-submit'); button.disabled = true; button.textContent = 'Signing in…'; $('#login-error').textContent = ''; try { state.client = state.client || makeClient(); const result = await state.client.auth.signInWithPassword({ email: $('#login-email').value.trim(), password: $('#login-password').value }); if (result.error) throw result.error; await authenticate(); } catch (error) { $('#login-error').textContent = readableError(error, 'Sign-in failed.'); } finally { button.disabled = false; button.textContent = 'Sign in'; } });
    $('#sign-out').addEventListener('click', signOut); $('#unauthorized-sign-out').addEventListener('click', signOut); $('#case-select').addEventListener('change', selectCase); document.querySelectorAll('input[name="has_crisis_plan"]').forEach(input => input.addEventListener('change', toggleCrisis)); $('#save-draft').addEventListener('click', () => save('draft')); $('#intake-form').addEventListener('submit', event => { event.preventDefault(); save('submitted'); }); $('#edit-intake').addEventListener('click', () => { setViewing(false); $('#section-1').scrollIntoView({ behavior: 'smooth' }); }); $('#view-intake').addEventListener('click', () => { $('#completion-panel').hidden = true; setViewing(true); $('#section-1').scrollIntoView({ behavior: 'smooth' }); });
  }
  window.MRIntakeTest = Object.freeze({ collectTargets, validate, toggleCrisis });
  bindEvents(); renderTargets([]); toggleCrisis(); authenticate();
})();
