(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  const MODE_LABELS = {
    daily: 'Daily Mission',
    wild: 'Mystery Mission',
    crisis: 'Crisis Mission'
  };

  let current = null;
  let pendingNext = null;
  let pendingEnding = null;
  let modalMode = 'feedback';

  const DEFAULT_BETA_BIP_BRIEFING = `Jordan has a hard time during independent writing. When writing feels too big, Jordan may shut down, refuse, or leave the area.
Your job is to choose responses that follow the plan:
* make the writing task smaller,
* offer help or a short break,
* stay calm and private,
* guide Jordan back to one small step.
Avoid public correction, arguing, threats, or making the task feel bigger.`;
  const DEFAULT_HINT_PROMPT = 'Stuck? Ask the wizard for a plan hint.';
  const DEFAULT_BSP_HINT = 'Jordan’s plan focuses on small writing steps, help or break requests, and quick reinforcement for returning to the task.';

  function getChoiceArray(step) {
    const entries = Object.entries(step.choices || {}).map(([key, value]) => Object.assign({ key }, value));
    return MR.teacherConfig.shuffleChoices ? MR.shuffle(entries) : entries;
  }

  function getScore(choice) {
    if (typeof choice.score === 'number') return choice.score;
    if (typeof choice.score === 'string') return Number(choice.score) || 0;
    if (typeof choice.delta === 'number') return choice.delta;
    if (typeof choice.delta === 'string') return Number(choice.delta) || 0;
    return 0;
  }

  function scoreValue(value) {
    return Number(value || 0);
  }

  function combinedFeedbackText(choice) {
    return [choice && choice.consequence, choice && choice.feedback]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join('\n\n') || String(choice && choice.wizard || '').trim();
  }

  function endingForChoice(mission, choice, isTerminal) {
    if (!isTerminal || !mission || !choice) return null;
    const key = String(choice.ending || '').trim();
    if (!['STRONG', 'MIXED', 'FRAGILE'].includes(key)) return null;
    const ending = mission.endings && mission.endings[key];
    return key && ending && typeof ending === 'object' && String(ending.text || '').trim()
      ? { key, text: String(ending.text).trim(), wizard: String(ending.wizard || '').trim() }
      : null;
  }

  function choiceTypeForScore(score) {
    const value = scoreValue(score);
    if (value === 10) return 'best';
    if (value === 5) return 'refine';
    if (value === 0) return 'missed';
    return value >= 10 ? 'best' : value > 0 ? 'refine' : 'missed';
  }

  function choiceLabelForType(type) {
    if (type === 'best') return 'Best Choice';
    if (type === 'refine') return 'Workable, but Refine';
    return 'Missed Opportunity';
  }

  function telemetryAlignment(item) {
    const type = item.selectedType || choiceTypeForScore(item.selectedScore != null ? item.selectedScore : item.score);
    if (type === 'best') return 'plan_aligned';
    if (type === 'refine') return 'workable_refine';
    return 'missed_opportunity';
  }

  function telemetryDomain(item) {
    const component = String(item && item.meta && item.meta.bipComponent || '').trim().toLowerCase();
    return {
      prevent: 'proactive',
      teach: 'teaching',
      reinforce: 'reinforcement',
      respond: 'response'
    }[component] || null;
  }

  function telemetryTarget(item, context) {
    const stepKey = item && item.stepMeta && item.stepMeta.fidelityTargetKey;
    const choiceKey = item && item.meta && item.meta.fidelityTargetKey;
    const key = String(stepKey || choiceKey || '').trim();
    if (!key) return { id: null, domain: telemetryDomain(item) };

    const target = context && context.fidelityTargets && context.fidelityTargets[key];
    if (!target) {
      console.warn(`Fidelity target key "${key}" was not found for the current case; using domain-only telemetry.`);
      const targetDomain = /^(proactive|teaching|reinforcement|response|crisis)_\d{2}$/.exec(key);
      return { id: null, domain: targetDomain ? targetDomain[1] : telemetryDomain(item) };
    }
    return { id: target.id, domain: target.domain };
  }

  function telemetryUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  function startRelationalTelemetry(attempt) {
    const context = MR.telemetryContext;
    if (!context || !context.participantId || !context.caseId) return Promise.resolve(false);
    const sessionRow = {
      id: attempt.telemetrySessionId,
      participant_id: context.participantId,
      case_id: context.caseId,
      mode: attempt.mode,
      mission_id: attempt.mission.id,
      mission_title: attempt.mission.title || null,
      game_content_version: context.gameContentVersion,
      qa_mode: context.qaMode === true,
      started_at: attempt.telemetryStartedAt,
      status: 'started'
    };
    return MR.auth.createTelemetrySession(sessionRow).then(() => true).catch(error => {
      console.warn('Supabase telemetry session insert failed; mission completion will remain blocked.', error);
      return false;
    });
  }

  function responseRowsForTelemetry(run, sessionId, context) {
    return (Array.isArray(run.history) ? run.history : []).map(item => {
      const target = telemetryTarget(item, context);
      return {
        session_id: sessionId,
        participant_id: context.participantId,
        case_id: context.caseId,
        fidelity_target_id: target.id,
        fidelity_domain: target.domain,
        mission_id: run.missionId,
        step_id: item.stepId,
        step_index: item.stepIndex,
        scenario_title: item.scenarioTitle || null,
        scenario_text: item.context || item.prompt || null,
        context_tag: null,
        choice_id: item.choiceKey || null,
        selected_answer_text: item.selectedAnswerText || item.choiceText || null,
        selected_score: item.selectedScore != null ? item.selectedScore : item.score,
        alignment: telemetryAlignment(item),
        best_answer_text: item.bestAnswerText || item.bestChoiceText || null,
        feedback_text: item.feedbackText || item.feedback || item.wizard || null,
        mechanism: item.meta && item.meta.mechanism || null,
        error_type: item.meta && item.meta.errorType || null,
        function_tag: item.meta && item.meta.function || null,
        hint_opened: Boolean(item.hintOpened),
        hint_open_count: Number(item.hintOpenCount || 0),
        time_to_hint_ms: item.timeFromQuestionStartToHintMs != null ? item.timeFromQuestionStartToHintMs : null,
        time_hint_to_answer_ms: item.timeFromHintToAnswerMs != null ? item.timeFromHintToAnswerMs : null,
        response_time_ms: item.responseTimeMs != null ? item.responseTimeMs : null,
        game_content_version: context.gameContentVersion,
        qa_mode: context.qaMode === true
      };
    });
  }

  async function finishRelationalTelemetry(run, sessionId, sessionInsertPromise) {
    const context = MR.telemetryContext;
    if (!context || !sessionId) return;
    const sessionCreated = await sessionInsertPromise;
    if (!sessionCreated) return;

    try {
      const updates = {
        ended_at: run.sessionEndedAt,
        status: 'completed',
        duration_seconds: run.durationSeconds,
        active_duration_seconds: run.activeDurationSeconds,
        score: run.score,
        max_score: run.maxScore,
        accuracy: run.accuracy,
        total_questions: run.totalQuestions,
        plan_aligned_count: run.bestChoiceCount,
        refine_count: run.refineChoiceCount,
        missed_count: run.missedOpportunityCount,
        hints_used: run.hintsUsed,
        total_hints_opened: run.totalHintsOpened,
        questions_with_hints: run.questionsWithHints,
        hint_use_rate: run.hintUseRate
      };

      if (!context.qaMode) {
        const result = await MR.auth.completeParticipantMission(sessionId, updates);
        if (result === 'already_completed') {
          MR.dailyMissionCompleted = true;
          if (typeof MR.onDailyMissionCompleted === 'function') MR.onDailyMissionCompleted();
          return false;
        }
      } else {
        await MR.auth.completeTelemetrySession(sessionId, context.participantId, context.caseId, updates);
      }

      try {
        await MR.auth.insertTelemetryResponses(responseRowsForTelemetry(run, sessionId, context));
      } catch (error) {
        console.warn('Supabase telemetry response insert failed; completed session remains authoritative.', error);
      }

      if (!context.qaMode) {
        MR.dailyMissionCompleted = true;
        if (typeof MR.onDailyMissionCompleted === 'function') MR.onDailyMissionCompleted();
      }
      return true;
    } catch (error) {
      console.warn('Supabase telemetry session completion failed; gameplay and existing logging will continue.', error);
      return null;
    }
  }

  function countSummaryForHistory(history) {
    const scores = (Array.isArray(history) ? history : []).map(item => scoreValue(item.score));
    return {
      totalQuestions: scores.length,
      bestChoiceCount: scores.filter(score => score === 10).length,
      refineChoiceCount: scores.filter(score => score === 5).length,
      missedOpportunityCount: scores.filter(score => score === 0).length,
      missedReviewCount: scores.filter(score => score < 10).length
    };
  }

  function stepMax(step) {
    const scores = Object.values(step.choices || {}).map(getScore);
    return scores.length ? Math.max(...scores, 10) : 10;
  }

  function expectedStepsForMission(mission) {
    const expected = Number(mission && mission.expectedSteps);
    return expected > 0 ? expected : 3;
  }

  function behaviorXPFor(score, expectedSteps, xpMax) {
    const maxXP = Number(xpMax) || 1000;
    const maxPossibleScore = Math.max(1, (Number(expectedSteps) || 3) * 10);
    const rawXP = Math.round((Number(score || 0) / maxPossibleScore) * maxXP);
    const behaviorXP = Math.max(0, Math.min(maxXP, rawXP));
    return {
      behaviorXP,
      behaviorXPMax: maxXP,
      behaviorXPPct: Math.max(0, Math.min(100, Math.round((behaviorXP / maxXP) * 100)))
    };
  }

  function chooseMission(mode) {
    const pool = (MR.pool && MR.pool[mode]) || [];
    if (!pool.length) throw new Error(`No missions found for mode: ${mode}`);

    if (mode === 'daily') {
      const daySeed = MR.studyDate.dailySeed();
      return pool[daySeed % pool.length];
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  function splitScenarioText(text) {
    let value = String(text || '').trim();
    const sceneIndex = value.indexOf('Scene:');
    if (sceneIndex >= 0) value = value.slice(sceneIndex);
    value = value.replace(/\n\nYou are/g, '\n\nYou are');
    return value;
  }

  function extractBIPBriefing(text) {
    const raw = String(text || '');
    const briefingIndex = raw.search(/BIP Briefing:/i);
    if (briefingIndex < 0) return '';
    const sceneIndex = raw.search(/\n\nScene:|Scene:/i);
    const briefing = sceneIndex > briefingIndex
      ? raw.slice(briefingIndex, sceneIndex)
      : raw.slice(briefingIndex);
    return briefing.replace(/^BIP Briefing:\s*/i, '').trim();
  }

  function scenarioHTML(text) {
    const clean = splitScenarioText(text);
    if (clean.startsWith('Scene:')) {
      return `<span class="scene-label">Scene:</span>${MR.escapeHTML(clean.replace(/^Scene:\s*/, ''))}`;
    }
    return MR.escapeHTML(clean);
  }

  function shortText(text, limit = 220) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    return `${clean.slice(0, limit).trim()}...`;
  }

  function bestChoiceForStep(step) {
    const choices = getChoiceArray(step);
    if (!choices.length) return null;
    const max = Math.max(...choices.map(getScore));
    return choices.find(choice => getScore(choice) === max) || null;
  }

  function branchStateForStep(stepId) {
    const value = String(stepId || '');
    if (value.includes('start')) return 'start';
    if (value.includes('supported')) return 'supported';
    if (value.includes('wobbly')) return 'wobbly';
    if (value.includes('escalated')) return 'escalated';
    return 'start';
  }

  function currentStep() {
    return current && current.mission && current.mission.steps ? current.mission.steps[current.stepId] : null;
  }

  function bspHintForCurrentStep() {
    const step = currentStep();
    if (step && step.hint) return step.hint;
    if (current && current.mission && current.mission.hint) return current.mission.hint;
    return DEFAULT_BSP_HINT;
  }

  function wizardHintForCurrentStep() {
    if (!current || !current.hintOpenedForStep) return DEFAULT_HINT_PROMPT;
    return bspHintForCurrentStep();
  }

  function updateWizardHintTrigger() {
    const trigger = MR.$('#wizard-hint-trigger');
    if (!trigger) return;
    const opened = Boolean(current && current.hintOpenedForStep);
    trigger.classList.toggle('is-open', opened);
    trigger.setAttribute('aria-expanded', opened ? 'true' : 'false');
  }

  function revealWizardHint() {
    if (!current) return;
    const now = Date.now();
    const tracker = current.hintTracking || {};
    tracker.hintOpenCount = Number(tracker.hintOpenCount || 0) + 1;
    if (!tracker.hintOpenedAt) {
      tracker.hintOpened = true;
      tracker.hintOpenedAt = new Date(now).toISOString();
      tracker.timeFromQuestionStartToHintMs = tracker.questionStartTime
        ? Math.max(0, now - tracker.questionStartTime)
        : null;
    }
    current.hintTracking = tracker;
    current.hintOpenedForStep = true;
    playAudioCue('click', 0.18);
    renderWizardHint();
  }

  function wireWizardHintTrigger() {
    const trigger = MR.$('#wizard-hint-trigger');
    if (!trigger || trigger.dataset.hintWired === 'true') return;
    trigger.dataset.hintWired = 'true';
    trigger.addEventListener('click', revealWizardHint);
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      revealWizardHint();
    });
  }

  function renderWizardHint() {
    const hint = MR.$('#wizard-hint');
    if (!hint) return;
    hint.textContent = wizardHintForCurrentStep();
    updateWizardHintTrigger();
  }

  function wizardSpriteForScore(score) {
    if (score >= 10) return { src: MR.asset('wizardSuccess'), cls: 'happy', title: 'The Wizard nods approvingly!' };
    if (score >= 5) return { src: MR.asset('wizardMeh'), cls: 'questioning', title: 'The Wizard pauses...' };
    return { src: MR.asset('wizardDead'), cls: 'dead', title: 'The Wizard sounds the alarm!' };
  }

  function updateHeartsForChoice(score) {
    const before = current.hearts;
    if (score >= 5 && score < 10) {
      current.hearts = Math.max(0, current.hearts - 0.5);
    } else if (score < 5) {
      current.hearts = Math.max(0, current.hearts - 1);
    }
    current.hearts = Math.round(current.hearts * 4) / 4;
    return { before, after: current.hearts };
  }

  function playAudioCue(name, volume) {
    if (MR.audio && MR.audio.playSfx) MR.audio.playSfx(name, volume);
  }

  function soundForScore(score) {
    const value = Number(score) || 0;
    if (value >= 10) return 'correct';
    if (value >= 5) return 'neutral';
    return 'incorrect';
  }

  function renderHearts(rootSelector = '#heart-row', hearts = current ? current.hearts : 0, max = current ? current.maxHearts : 5) {
    const root = MR.$(rootSelector);
    if (!root) return;
    const heartPath = MR.asset('heart');
    let html = '';
    for (let i = 0; i < max; i++) {
      const remaining = hearts - i;
      if (remaining >= 1) {
        html += `<img src="${heartPath}" alt="heart" />`;
      } else if (remaining > 0) {
        const fillPercent = Math.max(0, Math.min(100, remaining * 100));
        html += `<span class="heart-half" style="--heart-fill: ${fillPercent}%" aria-label="partial heart"><img class="heart-base" src="${heartPath}" alt="" /><span class="heart-fill"><img src="${heartPath}" alt="" /></span></span>`;
      } else {
        html += `<img class="heart-empty" src="${heartPath}" alt="empty heart" />`;
      }
    }
    root.innerHTML = html;
    root.setAttribute('aria-label', `${hearts} out of ${max} hearts`);
  }

  function renderHUD() {
    if (!current) return;
    const totalSteps = current.expectedSteps || 3;
    const completedSteps = Math.min(current.history.length, totalSteps);
    const progressPct = Math.max(0, Math.min(100, (completedSteps / totalSteps) * 100));
    const xp = behaviorXPFor(current.score, totalSteps, current.xpMax);

    renderHearts('#heart-row');
    MR.$('#mission-progress-label').textContent = `Mission Progress: ${completedSteps}/${totalSteps} Completed`;
    MR.$('#mission-progress-count').textContent = `${completedSteps}/${totalSteps}`;
    MR.$('#mission-progress-fill').style.width = `${progressPct}%`;
    MR.$('#xp-label').textContent = `Behavior Plan XP: ${xp.behaviorXP}/${xp.behaviorXPMax}`;
    MR.$('#xp-fill').style.width = `${xp.behaviorXPPct}%`;
    MR.$('#score-label').textContent = `${current.score}`;
  }

  function renderStep() {
    const step = currentStep();
    if (!step) {
      finishMission();
      return;
    }

    renderHUD();
    current.hintOpenedForStep = false;
    current.hintTracking = {
      questionStartTime: Date.now(),
      hintOpened: false,
      hintOpenCount: 0,
      hintOpenedAt: null,
      timeFromQuestionStartToHintMs: null
    };
    wireWizardHintTrigger();
    const scenarioText = MR.$('#scenario-text');
    scenarioText.innerHTML = scenarioHTML(step.text || '');
    if (MR.scenarioFit) MR.scenarioFit.fitScenarioText(scenarioText);
    renderWizardHint();
    const choices = getChoiceArray(step);
    MR.$('#choice-list').innerHTML = choices.map(choice => `
      <button class="choice-btn" data-choice-key="${MR.escapeHTML(choice.key)}" type="button">
        ${MR.escapeHTML(choice.text || '')}
      </button>
    `).join('');

    MR.$$('.choice-btn').forEach(button => {
      button.addEventListener('click', () => selectChoice(button.dataset.choiceKey));
    });
  }

  function selectChoice(choiceKey) {
    const step = current.mission.steps[current.stepId];
    const choice = Object.assign({ key: choiceKey }, step.choices[choiceKey]);
    const score = getScore(choice);
    const maxScore = stepMax(step);
    const heartChange = updateHeartsForChoice(score);
    const answerTime = Date.now();
    const hintTracking = current.hintTracking || {};
    const timeFromHintToAnswerMs = hintTracking.hintOpenedAt && hintTracking.timeFromQuestionStartToHintMs != null
      ? Math.max(0, answerTime - Date.parse(hintTracking.hintOpenedAt))
      : null;
    const responseTimeMs = hintTracking.questionStartTime
      ? Math.max(0, answerTime - hintTracking.questionStartTime)
      : null;
    const selectedScore = scoreValue(score);
    const selectedType = choiceTypeForScore(selectedScore);
    playAudioCue(soundForScore(score));

    current.score += score;
    current.maxScore += maxScore;
    const bestChoice = bestChoiceForStep(step);
    current.history.push({
      stepId: current.stepId,
      stepIndex: current.history.length + 1,
      stepMeta: step.meta || {},
      scenarioTitle: step.title || current.mission.title || '',
      prompt: splitScenarioText(step.text || ''),
      context: splitScenarioText(step.text || ''),
      choiceKey,
      choiceText: choice.text || '',
      selectedAnswerText: choice.text || '',
      score,
      selectedScore,
      selectedType,
      isBestChoice: selectedScore === 10,
      isReviewItem: selectedScore < 10,
      maxScore,
      feedback: choice.feedback || '',
      consequence: choice.consequence || '',
      feedbackText: combinedFeedbackText(choice),
      wizard: choice.wizard || '',
      hintOpened: Boolean(hintTracking.hintOpened),
      hintOpenCount: Number(hintTracking.hintOpenCount || 0),
      hintOpenedAt: hintTracking.hintOpenedAt || null,
      timeFromQuestionStartToHintMs: hintTracking.timeFromQuestionStartToHintMs != null ? hintTracking.timeFromQuestionStartToHintMs : null,
      timeFromHintToAnswerMs,
      responseTimeMs,
      hintText: current.hintOpenedForStep ? bspHintForCurrentStep() : '',
      bestChoiceKey: bestChoice ? bestChoice.key : '',
      bestChoiceText: bestChoice ? bestChoice.text || '' : '',
      bestAnswerText: bestChoice ? bestChoice.text || '' : '',
      bestChoiceFeedback: bestChoice ? bestChoice.feedback || '' : '',
      meta: choice.meta || {},
      heartsBefore: heartChange.before,
      heartsAfter: heartChange.after
    });

    const nextId = choice.next;
    pendingNext = nextId && current.mission.steps[nextId] ? nextId : null;
    const isTerminalDecision = !pendingNext && current.history.length === 5;
    pendingEnding = endingForChoice(current.mission, choice, isTerminalDecision);
    MR.$$('.choice-btn').forEach(button => button.disabled = true);
    renderHUD();
    showWizardFeedback(choice, score);
  }

  function showBIPBriefing(text) {
    if (!text) return;
    modalMode = 'briefing';
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'briefing';
    MR.$('#wizard-modal-title').textContent = 'BIP Briefing';
    hideRichFeedbackContent();
    MR.$('#wizard-modal-text').textContent = text;
    img.src = MR.asset('wizardGuide') || MR.asset('wizardThink');
    img.className = 'wizard-modal-img briefing';
    MR.$('#wizard-modal-continue').textContent = 'Start Mission';
    modal.hidden = false;
  }

  function hideRichFeedbackContent() {
    MR.$('#wizard-modal-text').hidden = false;
    MR.$('#wizard-feedback-content').hidden = true;
  }

  function setFeedbackSection(sectionSelector, textSelector, value) {
    const text = String(value || '').trim();
    MR.$(sectionSelector).hidden = !text;
    MR.$(textSelector).textContent = text;
  }

  function showRichFeedbackContent(content, consequenceHeading = 'What happens') {
    MR.$('#wizard-modal-text').hidden = true;
    MR.$('#wizard-feedback-content').hidden = false;
    MR.$('#wizard-consequence-heading').textContent = consequenceHeading;
    setFeedbackSection('#wizard-consequence-section', '#wizard-consequence-text', content.consequence);
    setFeedbackSection('#wizard-reaction-section', '#wizard-reaction-text', content.wizard);
    setFeedbackSection('#wizard-explanation-section', '#wizard-explanation-text', content.feedback);
  }

  function showWizardFeedback(choice, score) {
    modalMode = 'feedback';
    const sprite = wizardSpriteForScore(score);
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'feedback';
    MR.$('#wizard-modal-title').textContent = sprite.title;
    hideRichFeedbackContent();
    MR.$('#wizard-modal-text').textContent = String(choice.wizard || '').trim()
      || 'The classroom shifts in response to your decision.';
    img.src = sprite.src;
    img.className = `wizard-modal-img ${sprite.cls}`;
    MR.$('#wizard-modal-continue').textContent = pendingNext ? 'Continue Mission' : pendingEnding ? 'See Mission Outcome' : 'Complete Mission';
    modal.hidden = false;
  }

  function showMissionOutcome(ending) {
    modalMode = 'outcome';
    const outcomeWizard = {
      STRONG: { asset: 'wizardSuccess', cls: 'happy' },
      MIXED: { asset: 'wizardMeh', cls: 'questioning' },
      FRAGILE: { asset: 'wizardDead', cls: 'dead' }
    }[ending.key];
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'outcome';
    MR.$('#wizard-modal-title').textContent = 'Mission Outcome';
    showRichFeedbackContent({ consequence: ending.text, wizard: ending.wizard }, 'Mission Outcome');
    img.src = MR.asset(outcomeWizard.asset) || MR.asset('wizardGuide');
    img.className = `wizard-modal-img ${outcomeWizard.cls}`;
    MR.$('#wizard-modal-continue').textContent = 'View Results';
    modal.hidden = false;
  }

  function hideWizardFeedback() {
    const modal = MR.$('#wizard-modal');
    modal.hidden = true;
    modal.dataset.mode = '';
  }

  function continueAfterFeedback() {
    hideWizardFeedback();
    if (modalMode === 'outcome') {
      pendingEnding = null;
      modalMode = 'feedback';
      finishMission();
      return;
    }
    if (modalMode === 'briefing') {
      modalMode = 'feedback';
      return;
    }
    if (pendingNext) {
      current.stepId = pendingNext;
      pendingNext = null;
      renderStep();
    } else if (pendingEnding) {
      const ending = pendingEnding;
      pendingEnding = null;
      showMissionOutcome(ending);
    } else {
      finishMission();
    }
  }

  function classifyRun(run) {
    if (Number(run && run.maxScore) === 50) {
      const score = Number(run.score || 0);
      if (score >= 40) return 'high';
      if (score >= 25) return 'mid';
      return 'low';
    }

    const accuracy = Number(run && run.accuracy) || 0;
    if (accuracy >= 80) return 'high';
    if (accuracy >= 50) return 'mid';
    return 'low';
  }

  function summaryForRun(run) {
    const config = MR.teacherConfig;
    const score = Number(run && run.score) || 0;
    const maxScore = Number(run && run.maxScore) || 0;
    const accuracy = maxScore > 0 ? Math.round((score / maxScore) * 100) : Number(run && run.accuracy) || 0;
    const isPerfect = maxScore > 0 && (score >= maxScore || accuracy >= 100);
    let result;

    if (isPerfect) {
      result = {
        level: 'perfect',
        title: 'Perfect Mission!',
        message: 'You made every decision in alignment with the plan. The wizard is impressed - this was a flawless run.',
        summary: 'All responses were plan-aligned.',
        actions: '<p>Keep using the plan-aligned pattern: prevent, prompt, reinforce, and return to the routine.</p>'
      };
    } else if (accuracy >= 80) {
      result = {
        level: 'strong',
        title: 'Strong Mission!',
        message: 'You were mostly aligned with the plan. Review the feedback from any missed choices, then try again to sharpen your response pattern.',
        summary: 'Almost all responses were plan-aligned.',
        actions: config.feedback.actionHigh || '<p>Review any missed choices, then try again to sharpen your response pattern.</p>'
      };
    } else {
      result = {
        level: 'practice',
        title: 'Keep Practicing',
        message: 'Some choices moved away from the plan. Review the feedback, revisit the BIP Briefing, and try again.',
        summary: 'Additional practice can help strengthen plan-aligned responding.',
        actions: config.feedback.actionLow || '<p>Review the BIP Briefing and focus on calm, plan-aligned responses.</p>'
      };
    }

    const history = Array.isArray(run && run.history) ? run.history : [];
    const lastStrong = history.slice().reverse().find(item => item.score >= 10);
    const lastText = lastStrong ? `${config.studentAlias || 'Student'} contacted reinforcement for a plan-aligned response. The BIP pathway became stronger.` : `The final pathway needs one clearer bridge back to the routine before escape, attention, or escalation becomes more efficient.`;
    return Object.assign(result, {
      feedback: `${result.title}\n\n${result.message}`,
      lastText: result.level === 'perfect' ? result.summary : lastText
    });
  }

  function answeredQuestions(run) {
    const history = Array.isArray(run.history) ? run.history : [];
    return history.map((item, index) => Object.assign({}, item, {
      stepIndex: Number(item.stepIndex || index + 1),
      score: scoreValue(item.score)
    }));
  }

  function scoreBuckets(run) {
    const answered = answeredQuestions(run);
    return {
      answered,
      bestChoices: answered.filter(item => item.score === 10),
      refineChoices: answered.filter(item => item.score === 5),
      mismatchChoices: answered.filter(item => item.score === 0),
      missedQuestions: answered.filter(item => item.score < 10)
    };
  }

  function coachingSummary(run, buckets) {
    if (!buckets.missedQuestions.length) {
      return 'Excellent work. Your choices consistently matched the plan and supported prevention, replacement behavior teaching, reinforcement, and calm error correction.';
    }
    if (buckets.refineChoices.length && !buckets.mismatchChoices.length) {
      return 'Strong work. Your choices mostly stayed aligned with the plan. A few responses were workable, but could be tightened by prompting and reinforcing the replacement behavior more directly.';
    }
    return 'You identified some helpful responses, but a few choices moved away from the student’s plan. Review the coaching notes below to strengthen plan-aligned responding during tricky moments.';
  }

  function reviewItemHTML(item) {
    const coachNote = item.feedback || item.wizard || 'Review how this choice connects to the student’s plan.';
    const strongerMove = item.bestChoiceText || 'Use the most plan-aligned option available: prevent, prompt, reinforce, and return calmly.';
    return `
      <article class="results-review-item">
        <h3>Moment ${MR.escapeHTML(String(item.stepIndex || ''))}</h3>
        <p><strong>Context:</strong> ${MR.escapeHTML(shortText(item.context || item.prompt || item.stepId || 'Practice moment'))}</p>
        <p><strong>Your Choice:</strong> ${MR.escapeHTML(item.choiceText || 'No choice text saved')}</p>
        <p><strong>Coach Note:</strong> ${MR.escapeHTML(coachNote)}</p>
        <p><strong>Stronger Plan-Aligned Move:</strong> ${MR.escapeHTML(strongerMove)}</p>
      </article>
    `;
  }

  function reviewGroupHTML(title, intro, items) {
    if (!items.length) return '';
    return `
      <section class="results-review-group">
        <h2>${MR.escapeHTML(title)}</h2>
        <p>${MR.escapeHTML(intro)}</p>
        ${items.map(reviewItemHTML).join('')}
      </section>
    `;
  }

  function coachingDebriefHTML(run, summary) {
    const buckets = scoreBuckets(run);
    const coaching = coachingSummary(run, buckets);
    const reviewHTML = buckets.missedQuestions.length
      ? `
        ${reviewGroupHTML(
          'Workable, but Refine',
          'These choices were supportive or reasonable, but missed a chance to respond more directly from the plan.',
          buckets.refineChoices
        )}
        ${reviewGroupHTML(
          'Missed Opportunities',
          'These choices moved away from the plan or missed a chance to teach, reinforce, or calmly return to the routine.',
          buckets.mismatchChoices
        )}
      `
      : '<p class="results-empty-review">No review items today — strong plan-aligned responding.</p>';

    return `
      <section class="results-debrief">
        <h1>${MR.escapeHTML(summary.title)}</h1>
        <section class="results-card results-summary-card">
          <h2>Mission Summary</h2>
          <dl class="results-stats">
            <div><dt>Total Score</dt><dd>${MR.escapeHTML(String(run.score))} / ${MR.escapeHTML(String(run.maxScore))}</dd></div>
            <div><dt>Percent</dt><dd>${MR.escapeHTML(String(run.accuracy))}%</dd></div>
            <div><dt>Best Choice</dt><dd>${buckets.bestChoices.length}</dd></div>
            <div><dt>Workable, but Refine</dt><dd>${buckets.refineChoices.length}</dd></div>
            <div><dt>Missed Opportunity</dt><dd>${buckets.mismatchChoices.length}</dd></div>
          </dl>
        </section>
        <section class="results-card results-coaching-card">
          <h2>Coaching Summary</h2>
          <p>${MR.escapeHTML(coaching)}</p>
        </section>
        <section class="results-card results-review-card">
          <h2>Review</h2>
          ${reviewHTML}
        </section>
      </section>
    `;
  }

  function mobileResultsHTML(run, summary) {
    return coachingDebriefHTML(run, summary);
  }

  function wizardSpriteForAccuracy(accuracy) {
    const value = Number(accuracy) || 0;
    if (value >= 80) return { asset: 'wizardSuccess', alt: 'A happy wizard' };
    if (value >= 60) return { asset: 'wizardMeh', alt: 'A thinking wizard' };
    return { asset: 'wizardDead', alt: 'A sleepy wizard' };
  }

  function updateResultsWizard(run) {
    const img = MR.$('.results-wizard-note img');
    if (!img) return;
    const sprite = wizardSpriteForAccuracy(run && run.accuracy);
    const src = MR.asset(sprite.asset);
    if (src) img.src = src;
    img.dataset.asset = sprite.asset;
    img.alt = sprite.alt;
  }

  function hintSummaryForHistory(history) {
    const items = Array.isArray(history) ? history : [];
    const questionsWithHints = items.filter(item => Boolean(item.hintOpened)).length;
    const totalHintsOpened = items.reduce((sum, item) => sum + Number(item.hintOpenCount || 0), 0);
    return {
      hintsUsed: questionsWithHints > 0,
      totalHintsOpened,
      questionsWithHints,
      hintUseRate: items.length ? questionsWithHints / items.length : 0,
      perQuestionHintData: items.map(item => ({
        stepId: item.stepId,
        stepIndex: item.stepIndex,
        hintOpened: Boolean(item.hintOpened),
        hintOpenCount: Number(item.hintOpenCount || 0),
        hintOpenedAt: item.hintOpenedAt || null,
        timeFromQuestionStartToHintMs: item.timeFromQuestionStartToHintMs != null ? item.timeFromQuestionStartToHintMs : null,
        timeFromHintToAnswerMs: item.timeFromHintToAnswerMs != null ? item.timeFromHintToAnswerMs : null
      }))
    };
  }

  async function finishMission() {
    const accuracy = current.maxScore ? Math.round((current.score / current.maxScore) * 100) : 0;
    const xp = behaviorXPFor(current.score, current.expectedSteps || 3, current.xpMax);
    const timing = MR.SessionTimer && MR.SessionTimer.stop ? MR.SessionTimer.stop() : null;
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const history = current.history.map(item => Object.assign({}, item, {
      sessionId: runId,
      teacherId: MR.teacherConfig.teacherId,
      missionId: current.mission.id
    }));
    const hintSummary = hintSummaryForHistory(history);
    const countSummary = countSummaryForHistory(history);
    const run = {
      id: runId,
      teacherId: MR.teacherConfig.teacherId,
      teacherName: MR.teacherConfig.displayName,
      mode: current.mode,
      modeLabel: MODE_LABELS[current.mode] || current.mode,
      missionId: current.mission.id,
      missionTitle: current.mission.title,
      missionFocus: current.mission.focus || '',
      routine: current.mission.routine || '',
      functionPressure: current.mission.functionPressure || current.mission.function_pressure || '',
      bipTargets: current.mission.bipTargets || current.mission.bip_targets || '',
      dateKey: MR.todayKey(),
      timestamp: new Date().toISOString(),
      score: current.score,
      maxScore: current.maxScore,
      accuracy,
      hearts: current.hearts,
      maxHearts: current.maxHearts,
      behaviorXP: xp.behaviorXP,
      behaviorXPMax: xp.behaviorXPMax,
      behaviorXPPct: xp.behaviorXPPct,
      sessionStartedAt: timing ? timing.sessionStartedAt : null,
      sessionEndedAt: timing ? timing.sessionEndedAt : null,
      durationSeconds: timing ? timing.durationSeconds : 0,
      activeDurationSeconds: timing ? timing.activeDurationSeconds : 0,
      durationFormatted: timing ? timing.durationFormatted : '0:00',
      hintsUsed: hintSummary.hintsUsed,
      totalHintsOpened: hintSummary.totalHintsOpened,
      questionsWithHints: hintSummary.questionsWithHints,
      hintUseRate: hintSummary.hintUseRate,
      perQuestionHintData: hintSummary.perQuestionHintData,
      totalQuestions: countSummary.totalQuestions,
      bestChoiceCount: countSummary.bestChoiceCount,
      refineChoiceCount: countSummary.refineChoiceCount,
      missedOpportunityCount: countSummary.missedOpportunityCount,
      missedReviewCount: countSummary.missedReviewCount,
      history
    };

    const telemetryResult = await finishRelationalTelemetry(run, current.telemetrySessionId, current.telemetrySessionInsert);
    if (telemetryResult === false) return;
    // Browser-local run history belongs only to unauthenticated public-demo gameplay.
    if (!MR.telemetryContext) MR.storage.saveRun(run);
    renderResults(run);
  }

  function renderResults(run, options = {}) {
    const shouldPlayCompletion = options.playCompletion !== false;
    const summary = summaryForRun(run);
    const xp = behaviorXPFor(
      run.score,
      run.expectedSteps || (run.history && run.history.length) || 3,
      run.behaviorXPMax || MR.teacherConfig.xpMax
    );
    renderHearts('#results-heart-row', run.hearts, run.maxHearts);
    MR.$('#results-xp-label').textContent = `Behavior Plan XP: ${xp.behaviorXP}/${xp.behaviorXPMax}`;
    MR.$('#results-xp-fill').style.width = `${xp.behaviorXPPct}%`;
    MR.$('#results-score-label').textContent = `${run.score}`;

    MR.$('#results-content').innerHTML = mobileResultsHTML(run, summary);
    updateResultsWizard(run);
    if (shouldPlayCompletion) {
      playAudioCue(summary.level === 'perfect' ? 'correct' : 'missionStart', summary.level === 'perfect' ? 0.26 : 0.18);
    }
    MR.setScreen('results');
  }

  if (MR.scenarioFit) MR.scenarioFit.watchScenarioTextFit(MR.$('#scenario-text'));

  MR.engine = {
    async start(mode) {
      const context = MR.telemetryContext;
      if (context && !context.qaMode) {
        if (!MR.studyCalendar.isEligibleStudyDay()) {
          if (typeof MR.onStudyCalendarBlocked === 'function') MR.onStudyCalendarBlocked();
          return false;
        }
        try {
          MR.dailyMissionCompleted = await MR.auth.hasCompletedMissionToday();
        } catch (error) {
          console.error(error);
          window.alert('We could not verify today\'s mission status. Please try again before starting.');
          return false;
        }
        if (MR.dailyMissionCompleted) {
          if (typeof MR.onDailyMissionCompleted === 'function') MR.onDailyMissionCompleted();
          return false;
        }
      }
      const mission = chooseMission(mode);
      const telemetryStartedAt = new Date().toISOString();
      current = {
        mode,
        mission,
        telemetrySessionId: telemetryUuid(),
        telemetryStartedAt,
        stepId: null,
        score: 0,
        maxScore: 0,
        hearts: Number(MR.teacherConfig.defaultHearts || 5),
        maxHearts: Number(MR.teacherConfig.defaultHearts || 5),
        missionSteps: Number(MR.teacherConfig.missionSteps || 5),
        expectedSteps: expectedStepsForMission(mission),
        xpMax: Number(MR.teacherConfig.xpMax || 1000),
        xpMultiplier: Number(MR.teacherConfig.xpMultiplier || 5),
        history: []
      };
      pendingNext = null;
      pendingEnding = null;
      current.telemetrySessionInsert = startRelationalTelemetry(current);
      current.stepId = current.mission.start || Object.keys(current.mission.steps || {})[0];
      if (MR.SessionTimer && MR.SessionTimer.start) MR.SessionTimer.start();
      if (MR.audio && MR.audio.startBgm) MR.audio.startBgm();
      playAudioCue('missionStart', 0.26);
      MR.setScreen('play');
      renderStep();
      const firstStep = current.mission.steps[current.stepId];
      showBIPBriefing(extractBIPBriefing(firstStep && firstStep.text) || DEFAULT_BETA_BIP_BRIEFING);
      return true;
    },

    continueAfterFeedback,

    showStoredRunDetails(run) {
      renderResults(run, { playCompletion: false });
    },

    renderHearts,

    hasDailyRunToday() {
      if (MR.telemetryContext && !MR.telemetryContext.qaMode) return MR.dailyMissionCompleted === true;
      return MR.storage.getRuns().some(run => run.dateKey === MR.todayKey() && run.mode === 'daily');
    },

    latestDailyRunToday() {
      return MR.storage.getRuns().find(run => run.dateKey === MR.todayKey() && run.mode === 'daily');
    }
  };
})();
