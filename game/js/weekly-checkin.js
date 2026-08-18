(function () {
  'use strict';
  const MR = window.MR = window.MR || {};
  let assignment = null;
  let currentWindow = null;
  let submitted = false;

  function renderEntry() {
    const entry = MR.$('#weekly-checkin-entry');
    if (!entry) return;
    currentWindow = assignment && !assignment.qaMode ? MR.studyCalendar.weeklyCheckinWindow() : null;
    entry.hidden = !currentWindow?.isAvailable;
    if (entry.hidden) return;
    MR.$('#weekly-checkin-open').hidden = submitted;
    MR.$('#weekly-checkin-complete').hidden = !submitted;
  }

  async function hydrate() {
    currentWindow = MR.studyCalendar.weeklyCheckinWindow();
    if (!currentWindow?.isAvailable || assignment.qaMode) return renderEntry();
    submitted = await MR.auth.hasWeeklyCheckin(currentWindow.weekStart);
    renderEntry();
  }

  function open() {
    const alias = assignment.case.student_alias || MR.teacherConfig.studentAlias || 'your student';
    MR.$$('#weekly-checkin-form [data-alias]').forEach(node => { node.textContent = alias; });
    MR.$('#weekly-checkin-error').textContent = '';
    MR.$('#weekly-checkin-form').reset();
    MR.setScreen('weekly-checkin');
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const values = new FormData(form);
    button.disabled = true;
    MR.$('#weekly-checkin-error').textContent = '';
    try {
      await MR.auth.submitWeeklyCheckin({
        helpfulnessRating: Number(values.get('helpfulness_rating')),
        confidenceRating: Number(values.get('confidence_rating')),
        planDifficult: values.get('plan_difficult') === 'true',
        coachNote: String(values.get('coach_note') || '').trim() || null
      });
      submitted = true;
      MR.$('#weekly-checkin-confirmation').hidden = false;
      setTimeout(() => {
        MR.$('#weekly-checkin-confirmation').hidden = true;
        renderEntry();
        MR.setScreen('home');
      }, 900);
    } catch (error) {
      MR.$('#weekly-checkin-error').textContent = error.message || 'The check-in could not be submitted. Please try again.';
    } finally { button.disabled = false; }
  }

  MR.weeklyCheckin = {
    async init(value) {
      assignment = value;
      MR.$('#weekly-checkin-open').addEventListener('click', open);
      MR.$('#weekly-checkin-cancel').addEventListener('click', () => MR.setScreen('home'));
      MR.$('#weekly-checkin-form').addEventListener('submit', submit);
      await hydrate();
    },
    renderEntry
  };
})();
