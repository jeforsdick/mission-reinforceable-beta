(function () {
  'use strict';
  const MR = window.MR = window.MR || {};
  let assignment = null;
  let currentWindow = null;
  let submitted = false;

  function showState(message, secondary = '') {
    MR.$('#weekly-checkin-form').hidden = true;
    MR.$('#weekly-checkin-state').hidden = false;
    MR.$('#weekly-checkin-state-message').textContent = message;
    MR.$('#weekly-checkin-state-secondary').textContent = secondary;
    MR.$('#weekly-checkin-state-secondary').hidden = !secondary;
    MR.setScreen('weekly-checkin');
  }

  function populateCaseContext() {
    const metadata = MR.teacherConfig.weeklyTeacherReport || {};
    const items = [
      metadata.targetBehavior && `<p><strong>Target behavior:</strong> ${MR.escapeHTML(metadata.targetBehavior)}</p>`,
      metadata.replacementBehavior && `<p><strong>Replacement or desired behavior:</strong> ${MR.escapeHTML(metadata.replacementBehavior)}</p>`,
      metadata.targetRoutine && `<p><strong>Target routine:</strong> ${MR.escapeHTML(metadata.targetRoutine)}</p>`
    ].filter(Boolean);
    MR.$('#weekly-report-case-context').innerHTML = items.join('') || '<p>Use the target behavior, replacement or desired behavior, and routine from your current support plan.</p>';
  }

  function openForm() {
    populateCaseContext();
    MR.$('#weekly-checkin-error').textContent = '';
    MR.$('#weekly-checkin-form').reset();
    MR.$('#weekly-checkin-form').hidden = false;
    MR.$('#weekly-checkin-state').hidden = true;
    MR.setScreen('weekly-checkin');
  }

  async function enter() {
    currentWindow = MR.studyCalendar.weeklyCheckinWindow();
    if (assignment.qaMode || !currentWindow?.isAvailable) {
      showState('This report is not available right now.', 'Please use the link in your current weekly email.');
      return;
    }
    submitted = await MR.auth.hasWeeklyCheckin(currentWindow.weekStart);
    if (submitted) {
      showState("This week's report is already complete. Thank you!");
      return;
    }
    openForm();
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const values = new FormData(form);
    button.disabled = true;
    MR.$('#weekly-checkin-error').textContent = '';
    try {
      if (!assignment?.weeklyReportMode || assignment.qaMode) throw new Error('This report is not available right now.');
      await MR.auth.submitWeeklyTeacherReport({
        accessRating: Number(values.get('access_rating')),
        manageabilityRating: Number(values.get('manageability_rating')),
        bspRelevanceRating: Number(values.get('bsp_relevance_rating')),
        implementationThinkingRating: Number(values.get('implementation_thinking_rating')),
        feedbackUsefulnessRating: Number(values.get('feedback_usefulness_rating')),
        targetBehaviorRating: Number(values.get('target_behavior_rating')),
        replacementBehaviorRating: Number(values.get('replacement_behavior_rating')),
        barriersFacilitators: String(values.get('barriers_facilitators') || '').trim() || null,
        behaviorContextNote: String(values.get('behavior_context_note') || '').trim() || null
      });
      submitted = true;
      showState('Weekly Teacher Report complete — thank you!', 'You may close this page.');
    } catch (error) {
      MR.$('#weekly-checkin-error').textContent = error.message || 'The report could not be submitted. Please try again.';
    } finally {
      button.disabled = false;
    }
  }

  MR.weeklyCheckin = {
    async init(value) {
      assignment = value;
      MR.$('#weekly-checkin-form').addEventListener('submit', submit);
      MR.$('#weekly-checkin-sign-out').addEventListener('click', async event => {
        event.currentTarget.disabled = true;
        await MR.auth.signOut();
        window.location.assign(window.location.pathname);
      });
      if (assignment.weeklyReportMode) await enter();
    }
  };
})();
