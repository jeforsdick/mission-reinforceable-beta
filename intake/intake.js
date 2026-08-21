(function () {
  'use strict';

  const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  const DRAFT_KEY = 'mr-intake-draft-v1';
  const DOMAINS = {
    proactive: ['Proactive / Prevention Plan Steps', 'What does the behavior plan say staff should do to prevent or reduce the likelihood of the behavior?'],
    teaching: ['Teaching Plan Steps', 'What does the behavior plan say staff should teach or prompt the student to do instead?'],
    reinforcement: ['Reinforcement Plan Steps', 'What does the behavior plan say staff should notice, reinforce, or provide when the student uses the replacement or desired behavior?'],
    response: ['Response Plan Steps', 'What does the behavior plan say staff should do when the target behavior occurs?'],
    crisis: ['Crisis / Safety Plan Steps', 'What does the existing crisis or safety plan say staff should do?']
  };
  const REQUIRED_FIELDS = ['teacher_name', 'teacher_email', 'coach_name', 'coach_email', 'grade_level', 'student_initials', 'target_behavior', 'behavior_topography', 'primary_function', 'replacement_behavior', 'desired_behavior', 'typical_settings', 'common_triggers', 'typical_consequences', 'current_staff_responses'];
  const OPTIONAL_FIELDS = ['student_strengths', 'preferred_items_activities', 'prevention_strategies', 'teaching_strategies', 'reinforcement_system', 'response_strategy', 'crisis_plan', 'requested_scenarios', 'additional_context'];
  const INTAKE_FIELDS = REQUIRED_FIELDS.concat(OPTIONAL_FIELDS, ['typical_antecedents']);
  const state = { client: null, busy: false };
  const $ = selector => document.querySelector(selector);

  function hasCrisis() { return $('input[name="has_crisis_plan"]:checked')?.value === 'true'; }
  function fieldValue(name) { return String($(`[name="${name}"]`)?.value || '').trim(); }
  function setMessage(text, type = '') {
    const message = $('#form-message');
    message.textContent = text;
    message.className = `message save-message${type ? ` ${type}` : ''}`;
  }
  function makeClient() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Submission service unavailable.');
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  function renderDomain(domain, rows) {
    const card = document.createElement('section');
    card.className = 'domain-card';
    card.dataset.domain = domain;
    card.hidden = domain === 'crisis' && !hasCrisis();
    const contextFields = { proactive: 'prevention_strategies', teaching: 'teaching_strategies', reinforcement: 'reinforcement_system', response: 'response_strategy' };
    const context = contextFields[domain] ? `<div class="field context-detail"><label for="${contextFields[domain]}">More details <span>Optional</span></label><textarea id="${contextFields[domain]}" name="${contextFields[domain]}"></textarea><p class="helper">Add any timing, wording, materials, prompting, schedule, or other details needed to understand how these steps should be used.</p></div>` : '';
    card.innerHTML = `<h3>${DOMAINS[domain][0]} <i>*</i></h3><p class="helper">${DOMAINS[domain][1]}</p><div class="step-list"></div><button class="add-step" type="button">+ Add another step</button><p class="domain-error" aria-live="polite"></p>${context}`;
    const list = card.querySelector('.step-list');
    (rows.length ? rows : [{ description: '' }]).forEach(row => addStep(list, row));
    card.querySelector('.add-step').addEventListener('click', () => addStep(list, { description: '' }));
    return card;
  }
  function addStep(list, row) {
    const wrapper = document.createElement('div');
    wrapper.className = 'step-row';
    wrapper.innerHTML = '<span class="step-label"></span><input type="text" aria-label="Fidelity step"><button class="remove-step" type="button">Remove</button>';
    wrapper.querySelector('input').value = row.description || '';
    wrapper.querySelector('.remove-step').addEventListener('click', () => {
      wrapper.remove();
      if (!list.children.length) addStep(list, {});
      renumber(list);
    });
    list.append(wrapper);
    renumber(list);
  }
  function renumber(list) {
    Array.from(list.children).forEach((row, index) => {
      const title = DOMAINS[list.closest('.domain-card').dataset.domain][0];
      row.querySelector('.step-label').textContent = `Step ${index + 1}`;
      row.querySelector('input').setAttribute('aria-label', `${title} step ${index + 1}`);
      const remove = row.querySelector('.remove-step');
      remove.hidden = list.children.length === 1;
      remove.setAttribute('aria-label', `Remove ${title} step ${index + 1}`);
    });
  }
  function renderTargets(targets = []) {
    const container = $('#fidelity-domains');
    container.replaceChildren();
    Object.keys(DOMAINS).forEach(domain => {
      const rows = targets.filter(row => row.domain === domain).sort((a, b) => a.sort_order - b.sort_order);
      container.append(renderDomain(domain, rows));
    });
  }
  function collectTargets() {
    const targets = [];
    document.querySelectorAll('.domain-card').forEach(card => {
      if (card.dataset.domain === 'crisis' && !hasCrisis()) return;
      card.querySelectorAll('.step-row').forEach((row, index) => {
        const description = row.querySelector('input').value.trim();
        if (description) targets.push({ domain: card.dataset.domain, description, sort_order: index + 1 });
      });
    });
    return targets;
  }
  function toggleCrisis() {
    const enabled = hasCrisis();
    $('#crisis-plan-wrap').hidden = !enabled;
    const card = $('.domain-card[data-domain="crisis"]');
    if (card) card.hidden = !enabled;
    if (!enabled) clearFieldError('crisis_plan');
  }
  function collectDraft() {
    const fields = {};
    INTAKE_FIELDS.forEach(name => { fields[name] = fieldValue(name); });
    fields.typical_antecedents = fields.common_triggers;
    return { fields, has_crisis_plan: hasCrisis(), fidelity_targets: collectTargets() };
  }
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
      setMessage('Draft saved on this device.', 'success');
    } catch (_) {
      setMessage('This browser could not save the draft. Your entries remain on this page.', 'error');
    }
  }
  function clearSavedDraft(showMessage = true) {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* Storage may be unavailable. */ }
    if (showMessage) setMessage('Saved draft cleared.', 'success');
  }
  function restoreDraft() {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) { return; }
    if (!draft || !draft.fields) return;
    const antecedent = draft.fields.common_triggers || draft.fields.typical_antecedents || '';
    INTAKE_FIELDS.forEach(name => {
      const field = $(`[name="${name}"]`);
      if (field && typeof draft.fields[name] === 'string') field.value = draft.fields[name];
    });
    const commonTriggers = $('[name="common_triggers"]');
    if (commonTriggers) commonTriggers.value = antecedent;
    const crisis = $(`input[name="has_crisis_plan"][value="${draft.has_crisis_plan === true}"]`);
    if (crisis) crisis.checked = true;
    renderTargets(Array.isArray(draft.fidelity_targets) ? draft.fidelity_targets : []);
    toggleCrisis();
    setMessage('Saved draft restored from this device.', 'success');
  }
  function clearFieldError(name) {
    const field = $(`[name="${name}"]`);
    const error = $(`#${name}-error`);
    if (field) field.removeAttribute('aria-invalid');
    if (error) error.textContent = '';
  }
  function clearErrors() {
    document.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute('aria-invalid'));
    document.querySelectorAll('.field-error,.domain-error').forEach(element => { element.textContent = ''; });
    setMessage('');
  }
  function setFieldError(name, message) {
    const field = $(`[name="${name}"]`);
    const error = $(`#${name}-error`);
    if (field) field.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
    return field;
  }
  function validate() {
    clearErrors();
    let first = null;
    REQUIRED_FIELDS.forEach(name => {
      if (!fieldValue(name)) first = first || setFieldError(name, 'This field is required before submission.');
    });
    ['teacher_email', 'coach_email'].forEach(name => {
      const field = $(`[name="${name}"]`);
      if (fieldValue(name) && !field.checkValidity()) first = first || setFieldError(name, 'Enter a valid email address.');
    });
    if (hasCrisis() && !fieldValue('crisis_plan')) first = first || setFieldError('crisis_plan', 'Describe the crisis or safety plan before submission.');
    const targets = collectTargets();
    ['proactive', 'teaching', 'reinforcement', 'response'].concat(hasCrisis() ? ['crisis'] : []).forEach(domain => {
      if (!targets.some(target => target.domain === domain)) {
        const card = $(`.domain-card[data-domain="${domain}"]`);
        card.querySelector('.domain-error').textContent = 'Add at least one nonblank step before submission.';
        const input = card.querySelector('input');
        input.setAttribute('aria-invalid', 'true');
        first = first || input;
      }
    });
    if (!first) return true;
    setMessage('Please correct the highlighted fields. Your entries have been preserved.', 'error');
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.focus({ preventScroll: true });
    return false;
  }
  function submissionPayload(requestId) {
    const payload = {};
    INTAKE_FIELDS.forEach(name => { payload[name] = fieldValue(name) || null; });
    payload.typical_antecedents = payload.common_triggers;
    payload.request_id = requestId;
    payload.has_crisis_plan = hasCrisis();
    if (!payload.has_crisis_plan) payload.crisis_plan = null;
    payload.fidelity_targets = collectTargets();
    return payload;
  }
  function setBusy(busy) {
    state.busy = busy;
    $('#save-draft').disabled = busy;
    $('#clear-draft').disabled = busy;
    $('#submit-intake').disabled = busy;
    $('#submit-intake').textContent = busy ? 'Submitting…' : 'Submit Intake';
  }
  async function submitIntake() {
    if (state.busy || !validate()) return;
    setBusy(true);
    try {
      state.client = state.client || makeClient();
      const requestId = crypto.randomUUID();
      const { error } = await state.client.from('intake_requests').insert(submissionPayload(requestId));
      if (error) throw error;
      try {
        const response = await fetch('/api/intake-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: requestId })
        });
        if (!response.ok) console.error('Intake notification was not delivered.', { requestId, status: response.status });
      } catch (notificationError) {
        console.error('Intake notification request failed.', { requestId, error: notificationError });
      }
      clearSavedDraft(false);
      $('#intake-form').hidden = true;
      $('.section-nav').hidden = true;
      $('#completion-panel').hidden = false;
      $('#completion-panel').focus();
      $('#completion-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      setMessage('We could not submit your intake right now. Your entries have been preserved. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }
  function resetForAnother() {
    clearSavedDraft(false);
    $('#intake-form').reset();
    renderTargets([]);
    toggleCrisis();
    clearErrors();
    $('#completion-panel').hidden = true;
    $('#intake-form').hidden = false;
    $('.section-nav').hidden = false;
    $('#section-1').scrollIntoView({ behavior: 'smooth' });
    $('#teacher_name').focus({ preventScroll: true });
  }
  function bindEvents() {
    document.querySelectorAll('input[name="has_crisis_plan"]').forEach(input => input.addEventListener('change', toggleCrisis));
    $('#save-draft').addEventListener('click', saveDraft);
    $('#clear-draft').addEventListener('click', () => clearSavedDraft(true));
    $('#intake-form').addEventListener('submit', event => { event.preventDefault(); submitIntake(); });
    $('#submit-another').addEventListener('click', resetForAnother);
  }

  window.MRIntakeTest = Object.freeze({ collectTargets, validate, toggleCrisis, collectDraft, submissionPayload });
  bindEvents();
  renderTargets([]);
  toggleCrisis();
  restoreDraft();
})();
