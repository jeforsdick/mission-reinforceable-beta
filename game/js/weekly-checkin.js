(function () {
  'use strict';
  const MR = window.MR = window.MR || {};
  let assignment = null, currentWindow = null, submitted = false;
  function renderEntry() {
    const entry = MR.$('#weekly-checkin-entry'); if (!entry) return;
    currentWindow = assignment && !assignment.qaMode ? MR.studyCalendar.weeklyCheckinWindow() : null;
    entry.hidden = !currentWindow?.isAvailable; if (entry.hidden) return;
    MR.$('#weekly-checkin-open').hidden = submitted; MR.$('#weekly-checkin-complete').hidden = !submitted;
  }
  async function hydrate() {
    currentWindow = MR.studyCalendar.weeklyCheckinWindow();
    if (!currentWindow?.isAvailable || assignment.qaMode) return renderEntry();
    submitted = await MR.auth.hasWeeklyCheckin(currentWindow.weekStart); renderEntry();
  }
  function open() {
    const metadata = MR.teacherConfig.weeklyTeacherReport || {};
    const context = MR.$('#weekly-report-case-context');
    const items = [metadata.targetBehavior && `<p><strong>Target behavior:</strong> ${MR.escapeHTML(metadata.targetBehavior)}</p>`, metadata.replacementBehavior && `<p><strong>Replacement or desired behavior:</strong> ${MR.escapeHTML(metadata.replacementBehavior)}</p>`, metadata.targetRoutine && `<p><strong>Target routine:</strong> ${MR.escapeHTML(metadata.targetRoutine)}</p>`].filter(Boolean);
    context.innerHTML = items.join('') || '<p>Use the target behavior, replacement or desired behavior, and routine from your current support plan.</p>';
    MR.$('#weekly-checkin-error').textContent = ''; MR.$('#weekly-checkin-form').reset(); MR.setScreen('weekly-checkin');
  }
  async function submit(event) {
    event.preventDefault(); const form=event.currentTarget, button=form.querySelector('[type="submit"]'), v=new FormData(form);
    button.disabled=true; MR.$('#weekly-checkin-error').textContent='';
    try {
      await MR.auth.submitWeeklyTeacherReport({accessRating:Number(v.get('access_rating')),manageabilityRating:Number(v.get('manageability_rating')),bspRelevanceRating:Number(v.get('bsp_relevance_rating')),implementationThinkingRating:Number(v.get('implementation_thinking_rating')),feedbackUsefulnessRating:Number(v.get('feedback_usefulness_rating')),targetBehaviorRating:Number(v.get('target_behavior_rating')),replacementBehaviorRating:Number(v.get('replacement_behavior_rating')),barriersFacilitators:String(v.get('barriers_facilitators')||'').trim()||null,behaviorContextNote:String(v.get('behavior_context_note')||'').trim()||null});
      submitted=true; MR.$('#weekly-checkin-confirmation').hidden=false; setTimeout(()=>{MR.$('#weekly-checkin-confirmation').hidden=true;renderEntry();MR.setScreen('home');},900);
    } catch(error) { MR.$('#weekly-checkin-error').textContent=error.message||'The report could not be submitted. Please try again.'; } finally { button.disabled=false; }
  }
  MR.weeklyCheckin={async init(value){assignment=value;MR.$('#weekly-checkin-open').addEventListener('click',open);MR.$('#weekly-checkin-cancel').addEventListener('click',()=>MR.setScreen('home'));MR.$('#weekly-checkin-form').addEventListener('submit',submit);await hydrate();},renderEntry};
})();
