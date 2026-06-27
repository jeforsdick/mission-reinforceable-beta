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
  let modalMode = 'feedback';

  const DEFAULT_BETA_BIP_BRIEFING = `Jordan has a hard time during independent writing. When writing feels too big, Jordan may shut down, refuse, or leave the area.
Your job is to choose responses that follow the plan:
* make the writing task smaller,
* offer help or a short break,
* stay calm and private,
* guide Jordan back to one small step.
Avoid public correction, arguing, threats, or making the task feel bigger.`;

  function getChoiceArray(step) {
    const entries = Object.entries(step.choices || {}).map(([key, value]) => Object.assign({ key }, value));
    return MR.teacherConfig.shuffleChoices ? MR.shuffle(entries) : entries;
  }

  function getScore(choice) {
    if (typeof choice.score === 'number') return choice.score;
    if (typeof choice.delta === 'number') return choice.delta;
    return 0;
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
      const daySeed = Math.floor(Date.now() / 86400000);
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

  function branchStateForStep(stepId) {
    const value = String(stepId || '');
    if (value.includes('start')) return 'start';
    if (value.includes('supported')) return 'supported';
    if (value.includes('wobbly')) return 'wobbly';
    if (value.includes('escalated')) return 'escalated';
    return 'start';
  }

  function wizardHintForCurrentStep() {
    if (!current) return 'Choose the move that best follows Jordan’s plan.';
    const history = Array.isArray(current.history) ? current.history : [];
    if (!history.length) return 'Choose your move carefully. Your decision changes what happens next.';

    const missedCount = history.filter(item => Number(item.score) < 5).length;
    if (missedCount >= 2) return 'The plan is your compass: help, break, small step, calm return.';

    const branchState = branchStateForStep(current.stepId);
    if (branchState === 'supported') return 'You’re keeping the path steady. Keep looking for calm, private support.';
    if (branchState === 'wobbly') return 'Jordan is unsure. Look for help, a short break, or one small step.';
    if (branchState === 'escalated') return 'Careful — the situation is getting bigger. Look for a lower-pressure response.';
    return 'Choose the move that best follows Jordan’s plan.';
  }

  function renderWizardHint() {
    const hint = MR.$('#wizard-hint');
    if (!hint) return;
    hint.textContent = wizardHintForCurrentStep();
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

  function renderHearts(rootSelector = '#heart-row', hearts = current ? current.hearts : 0, max = current ? current.maxHearts : 5) {
    const root = MR.$(rootSelector);
    if (!root) return;
    const heartPath = MR.asset('heart');
    let html = '';
    for (let i = 0; i < max; i++) {
      const remaining = hearts - i;
      const cls = remaining >= 1 ? '' : remaining > 0 ? 'half' : 'heart-empty';
      html += `<img class="${cls}" src="${heartPath}" alt="${remaining > 0 ? 'heart' : 'empty heart'}" />`;
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
    const step = current.mission.steps[current.stepId];
    if (!step) {
      finishMission();
      return;
    }

    renderHUD();
    MR.$('#scenario-text').innerHTML = scenarioHTML(step.text || '');
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

    current.score += score;
    current.maxScore += maxScore;
    current.history.push({
      stepId: current.stepId,
      prompt: splitScenarioText(step.text || ''),
      choiceKey,
      choiceText: choice.text || '',
      score,
      maxScore,
      feedback: choice.feedback || '',
      wizard: choice.wizard || '',
      meta: choice.meta || {},
      heartsBefore: heartChange.before,
      heartsAfter: heartChange.after
    });

    const nextId = choice.next;
    pendingNext = nextId && current.mission.steps[nextId] ? nextId : null;
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
    MR.$('#wizard-modal-text').textContent = text;
    img.src = MR.asset('wizardGuide') || MR.asset('wizardThink');
    img.className = 'wizard-modal-img briefing';
    MR.$('#wizard-modal-continue').textContent = 'Start Mission';
    modal.hidden = false;
  }

  function showWizardFeedback(choice, score) {
    modalMode = 'feedback';
    const sprite = wizardSpriteForScore(score);
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'feedback';
    MR.$('#wizard-modal-title').textContent = sprite.title;
    MR.$('#wizard-modal-text').textContent = choice.wizard || choice.feedback || 'The classroom shifts in response to your decision.';
    img.src = sprite.src;
    img.className = `wizard-modal-img ${sprite.cls}`;
    MR.$('#wizard-modal-continue').textContent = pendingNext ? 'Continue Mission' : 'Complete Mission';
    modal.hidden = false;
  }

  function showBetaSurveySuccessPopup() {
    modalMode = 'surveySuccess';
    const sprite = wizardSpriteForScore(10);
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'surveySuccess';
    MR.$('#wizard-modal-title').textContent = 'Quest Complete!';
    MR.$('#wizard-modal-text').textContent = 'Thank you for helping improve Mission: Reinforceable. Your beta survey was submitted successfully.';
    img.src = sprite.src;
    img.className = `wizard-modal-img ${sprite.cls}`;
    MR.$('#wizard-modal-continue').textContent = 'Back to Results';
    modal.hidden = false;
  }

  function showWelcomePopup() {
    modalMode = 'welcome';
    const sprite = wizardSpriteForScore(10);
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    modal.dataset.mode = 'welcome';
    MR.$('#wizard-modal-title').textContent = 'Welcome to Mission: Reinforceable Beta Testing!';
    MR.$('#wizard-modal-text').textContent = `Thank you for playtesting Mission: Reinforceable. Try a mission and notice what feels clear, confusing, fun, useful, or challenging.

After the mission, tap the wizard on the Results screen to complete the beta survey.`;
    img.src = sprite.src;
    img.className = `wizard-modal-img ${sprite.cls}`;
    MR.$('#wizard-modal-continue').textContent = 'Start Testing';
    modal.hidden = false;
  }

  function hideWizardFeedback() {
    const modal = MR.$('#wizard-modal');
    modal.hidden = true;
    modal.dataset.mode = '';
  }

  function continueAfterFeedback() {
    hideWizardFeedback();
    if (modalMode === 'surveySuccess') {
      modalMode = 'feedback';
      MR.setScreen('results');
      return;
    }
    if (modalMode === 'welcome') {
      modalMode = 'feedback';
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
    const level = classifyRun(run);
    const feedback = config.feedback[level] || config.feedback.mid;
    const actions = level === 'high' ? config.feedback.actionHigh : level === 'mid' ? config.feedback.actionMid : config.feedback.actionLow;
    const lastStrong = run.history.slice().reverse().find(item => item.score >= 10);
    const lastText = lastStrong ? `${config.studentAlias || 'Student'} contacted reinforcement for a plan-aligned response. The BIP pathway became stronger.` : `The final pathway needs one clearer bridge back to the routine before escape, attention, or escalation becomes more efficient.`;
    return { level, feedback, actions, lastText };
  }

  function missedAnswerReview(run) {
    const history = Array.isArray(run.history) ? run.history : [];
    const missed = history.filter(item => Number(item.score) === 0);
    if (!missed.length) {
      return '<p><strong>Missed-answer review:</strong><br />No incorrect answers to review &mdash; nice work!</p>';
    }

    return `
      <p><strong>Missed-answer review:</strong></p>
      ${missed.map(item => `
        <div class="missed-answer-review">
          <p><strong>Scene:</strong> ${MR.escapeHTML(item.prompt || item.stepId || 'Review step')}</p>
          <p><strong>Your answer:</strong> ${MR.escapeHTML(item.choiceText || 'No answer text saved')}</p>
          <p><strong>Feedback:</strong> ${MR.escapeHTML(item.wizard || item.feedback || 'No feedback saved')}</p>
        </div>
      `).join('')}
    `;
  }

  function isMobileView() {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
  }

  function feedbackParts(feedback) {
    const parts = String(feedback || '').split(/\n\s*\n/);
    return {
      title: parts.shift() || 'Mission Results',
      body: parts.join(' ').trim()
    };
  }

  function mobileResultsHTML(run, summary) {
    const history = Array.isArray(run.history) ? run.history : [];
    const strongCount = history.filter(item => Number(item.score || 0) >= 10).length;
    const partialCount = history.filter(item => {
      const score = Number(item.score || 0);
      return score > 0 && score < 10;
    }).length;
    const missedCount = history.filter(item => Number(item.score || 0) === 0).length;
    const feedback = feedbackParts(summary.feedback);
    const reminder = Number(run.accuracy || 0) < 80
      ? '<p class="mobile-results-reminder"><strong>Quick reminder:</strong> Review the BIP Briefing or Resources before playing again.</p>'
      : '';

    return `
      <section class="mobile-results-summary">
        <h1>${MR.escapeHTML(feedback.title)}</h1>
        <p class="mobile-results-score"><strong>Score:</strong> ${run.score} / ${run.maxScore} (${run.accuracy}%)</p>
        <p>${MR.escapeHTML(feedback.body || summary.feedback)}</p>
        <h2>Quick feedback</h2>
        <ul>
          <li>Strong choices: ${strongCount}</li>
          <li>Partial choices: ${partialCount}</li>
          <li>Missed choices: ${missedCount}</li>
        </ul>
        ${reminder}
      </section>
    `;
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

  function finishMission() {
    const accuracy = current.maxScore ? Math.round((current.score / current.maxScore) * 100) : 0;
    const xp = behaviorXPFor(current.score, current.expectedSteps || 3, current.xpMax);
    const timing = MR.SessionTimer && MR.SessionTimer.stop ? MR.SessionTimer.stop() : null;
    const run = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      teacherId: MR.teacherConfig.teacherId,
      teacherName: MR.teacherConfig.displayName,
      mode: current.mode,
      modeLabel: MODE_LABELS[current.mode] || current.mode,
      missionId: current.mission.id,
      missionTitle: current.mission.title,
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
      history: current.history
    };

    MR.storage.saveRun(run);
    sendRun(run);
    renderResults(run);
  }

  function sendRun(run) {
    const endpoint = MR.teacherConfig.resultEndpoint || '';
    if (!endpoint || endpoint.includes('PASTE_')) return;
    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(run)
      }).catch(error => console.warn('Remote logging failed:', error));
    } catch (error) {
      console.warn('Remote logging failed:', error);
    }
  }

  function ratingOptions() {
    return '<option value="">Select</option>' + [1, 2, 3, 4, 5].map(value => `<option value="${value}">${value}</option>`).join('');
  }

  function surveyRating(name, label) {
    const escapedName = MR.escapeHTML(name);
    const options = [1, 2, 3, 4, 5].map(value => {
      const id = `${escapedName}-${value}`;
      return `
        <label class="survey-rating-option" for="${id}">
          <input id="${id}" type="radio" name="${escapedName}" value="${value}" />
          <span>${value}</span>
        </label>
      `;
    }).join('');

    return `
      <fieldset class="survey-rating">
        <legend>${MR.escapeHTML(label)}</legend>
        <div class="survey-rating-options">
          ${options}
        </div>
      </fieldset>
    `;
  }

  function selectOptions(options) {
    return '<option value="">Select</option>' + options.map(option => `<option value="${MR.escapeHTML(option)}">${MR.escapeHTML(option)}</option>`).join('');
  }

  function surveySelect(name, label, optionsHTML) {
    return `
      <p>
        <label for="${name}"><strong>${MR.escapeHTML(label)}</strong></label><br />
        <select id="${name}" name="${name}">${optionsHTML}</select>
      </p>
    `;
  }

  function surveyTextarea(name, label) {
    return `
      <p>
        <label for="${name}"><strong>${MR.escapeHTML(label)}</strong></label><br />
        <textarea id="${name}" name="${name}" rows="3"></textarea>
      </p>
    `;
  }

  function betaSurveyHTML() {
    const roleOptions = selectOptions([
      'Classroom teacher',
      'Behavior specialist',
      'Student/graduate student',
      'Parent/caregiver',
      'Other educator',
      'Other adult'
    ]);
    const difficultyOptions = selectOptions(['Too easy', 'About right', 'Too hard', "I'm not sure"]);
    const permissionOptions = selectOptions(['Yes', 'No']);

    return `
      <section id="beta-survey-section">
        <h2>Beta Survey</h2>
        <p>Thank you for playtesting Mission: Reinforceable. Your feedback will help improve the game before it is used in research. Please do not include real student names, school names, or identifying information.</p>
        <p>For rating questions, use 1 = strongly disagree and 5 = strongly agree.</p>
        <form id="beta-survey-form">
          <h3>About You</h3>
          ${surveySelect('testerRole', 'Which best describes you?', roleOptions)}
          <h3>Playtest Ratings</h3>
          ${surveyRating('understoodTask', 'I understood what to do without needing extra help. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveyRating('bipClear', "Jordan's plan was clear enough to use during the mission. (1 = strongly disagree, 5 = strongly agree)")}
          ${surveyRating('choicesMadeMeThink', 'The choices made me think carefully, not just guess. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveyRating('feedbackHelpful', 'The wizard feedback helped me understand what to do differently. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveyRating('easyToNavigate', 'The game was easy to navigate. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveyRating('lookedPolished', 'The game was fun enough that I would want to play another mission. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveyRating('resourcesHelpful', "The Resources page or BIP Briefing helped me understand Jordan's plan. (1 = strongly disagree, 5 = strongly agree)")}
          ${surveyRating('missedReviewHelpful', 'The Results or missed-answer review helped me understand what to improve. (1 = strongly disagree, 5 = strongly agree)')}
          ${surveySelect('difficulty', 'How did the challenge level feel?', difficultyOptions)}
          <h3>Open Feedback</h3>
          ${surveyTextarea('confusingPart', 'Where, if anywhere, did you feel stuck, confused, or unsure what to do?')}
          ${surveyTextarea('favoritePart', 'What did you like most about the game?')}
          ${surveyTextarea('changeSuggestion', 'What would make the game more fun, useful, or challenging?')}
          ${surveyTextarea('openComments', 'Anything else you want to share?')}
          ${surveySelect('permissionToUseFeedback', 'May I use your anonymous feedback when describing beta testing or future revisions?', permissionOptions)}
          <p>
            <button id="beta-survey-submit" class="pixel-btn green-btn" type="submit">Submit Beta Feedback</button>
          </p>
          <p id="beta-survey-status" aria-live="polite"></p>
        </form>
      </section>
    `;
  }

  function betaSurveyPayload(run, form) {
    const data = new FormData(form);
    const history = Array.isArray(run.history) ? run.history : [];
    const scores = history.map(item => Number(item.score || 0));

    return {
      action: 'betaSurvey',
      timestamp: new Date().toISOString(),
      sessionId: run.id,
      teacherId: run.teacherId,
      teacherName: run.teacherName,
      mode: run.mode,
      modeLabel: run.modeLabel,
      missionId: run.missionId,
      missionTitle: run.missionTitle,
      score: run.score,
      maxScore: run.maxScore,
      accuracy: run.accuracy,
      durationSeconds: run.durationSeconds,
      activeDurationSeconds: run.activeDurationSeconds,
      testerRole: data.get('testerRole') || '',
      understoodTask: data.get('understoodTask') || '',
      bipClear: data.get('bipClear') || '',
      choicesMadeMeThink: data.get('choicesMadeMeThink') || '',
      feedbackHelpful: data.get('feedbackHelpful') || '',
      easyToNavigate: data.get('easyToNavigate') || '',
      lookedPolished: data.get('lookedPolished') || '',
      difficulty: data.get('difficulty') || '',
      branchingClear: data.get('branchingClear') || '',
      resourcesEasyToFind: data.get('resourcesEasyToFind') || '',
      resourcesShortEnough: data.get('resourcesShortEnough') || '',
      resourcesHelpful: data.get('resourcesHelpful') || '',
      progressHelpful: data.get('progressHelpful') || '',
      missedReviewHelpful: data.get('missedReviewHelpful') || '',
      confusingPart: data.get('confusingPart') || '',
      favoritePart: data.get('favoritePart') || '',
      changeSuggestion: data.get('changeSuggestion') || '',
      openComments: data.get('openComments') || '',
      permissionToUseFeedback: data.get('permissionToUseFeedback') || '',
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      choiceHistory: history,
      scoreHistory: scores,
      branchPath: history.map(item => item.stepId),
      missedReviewCount: scores.filter(score => score === 0).length,
      neutralChoiceCount: scores.filter(score => score > 0 && score < 10).length,
      incorrectChoiceCount: scores.filter(score => score === 0).length,
      correctChoiceCount: scores.filter(score => score >= 10).length
    };
  }

  function submitBetaSurvey(run, form, status, button) {
    const endpoint = MR.teacherConfig.resultEndpoint || '';
    if (!endpoint || endpoint.includes('PASTE_')) {
      status.textContent = 'Something went wrong and your survey was not submitted. Please check your connection and try again.';
      return;
    }

    button.disabled = true;
    status.textContent = 'Submitting beta feedback...';

    fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(betaSurveyPayload(run, form))
    }).then(() => {
      button.disabled = false;
      status.textContent = '';
      showBetaSurveySuccessPopup();
    }).catch(error => {
      console.warn('Beta survey submission failed:', error);
      button.disabled = false;
      status.textContent = 'Something went wrong and your survey was not submitted. Please check your connection and try again.';
    });
  }

  function wireBetaSurvey(run) {
    const form = MR.$('#beta-survey-form');
    if (!form) return;
    const status = MR.$('#beta-survey-status');
    const button = MR.$('#beta-survey-submit');
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitBetaSurvey(run, form, status, button);
    });
  }

  function renderBetaSurveyScreen(run) {
    const root = MR.$('#survey-content');
    if (!root || !run) return;

    root.innerHTML = `
      <p><button id="survey-back-results" class="pixel-btn brown-btn" type="button">Back to Results</button></p>
      ${betaSurveyHTML()}
    `;
    const backButton = MR.$('#survey-back-results');
    if (backButton) backButton.addEventListener('click', () => MR.setScreen('results'));
    wireBetaSurvey(run);
    MR.setScreen('survey');
  }

  function wireResultsSurveyInvite(run) {
    const targets = [
      MR.$('.results-wizard-note'),
      MR.$('.results-wizard-note img'),
      MR.$('.results-wizard-note .small-result-bubble')
    ].filter(Boolean);
    if (!targets.length) return;

    targets.forEach(target => {
      target.addEventListener('click', () => renderBetaSurveyScreen(run));
    });

    const note = MR.$('.results-wizard-note');
    if (!note) return;
    note.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      renderBetaSurveyScreen(run);
    });
  }

  function renderResults(run) {
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

    MR.$('#results-content').innerHTML = isMobileView() ? mobileResultsHTML(run, summary) : `
      <h1>Score: ${run.score} / ${run.maxScore} (${run.accuracy}%)</h1>
      <p><strong>Overall feedback:</strong><br />${MR.escapeHTML(summary.feedback)}</p>
      <p>${MR.escapeHTML(summary.lastText)}</p>
      <p><strong>Plan reminder:</strong></p>
      ${summary.actions}
      ${missedAnswerReview(run)}
    `;
    updateResultsWizard(run);
    wireResultsSurveyInvite(run);
    MR.setScreen('results');
  }

  MR.engine = {
    start(mode) {
      const mission = chooseMission(mode);
      current = {
        mode,
        mission,
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
      current.stepId = current.mission.start || Object.keys(current.mission.steps || {})[0];
      if (MR.SessionTimer && MR.SessionTimer.start) MR.SessionTimer.start();
      MR.setScreen('play');
      renderStep();
      const firstStep = current.mission.steps[current.stepId];
      showBIPBriefing(extractBIPBriefing(firstStep && firstStep.text) || DEFAULT_BETA_BIP_BRIEFING);
    },

    continueAfterFeedback,

    showWelcomePopup,

    showStoredRunDetails(run) {
      renderResults(run);
    },

    renderHearts,

    hasDailyRunToday() {
      return MR.storage.getRuns().some(run => run.dateKey === MR.todayKey() && run.mode === 'daily');
    },

    latestDailyRunToday() {
      return MR.storage.getRuns().find(run => run.dateKey === MR.todayKey() && run.mode === 'daily');
    }
  };
})();
