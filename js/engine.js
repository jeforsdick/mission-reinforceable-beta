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

  function wizardSpriteForScore(score) {
    if (score >= 10) return { src: MR.asset('wizardSuccess'), cls: 'happy', title: 'The Wizard nods approvingly!' };
    if (score >= 5) return { src: MR.asset('wizardMeh'), cls: 'questioning', title: 'The Wizard pauses...' };
    return { src: MR.asset('wizardDead'), cls: 'dead', title: 'The Wizard sounds the alarm!' };
  }

  function updateHeartsForChoice(score) {
    const before = current.hearts;
    if (score >= 10) {
      if (current.hearts < current.maxHearts) current.hearts = Math.min(current.maxHearts, current.hearts + 0.5);
    } else if (score >= 5) {
      current.hearts = Math.max(0, current.hearts - 0.25);
    } else {
      current.hearts = Math.max(0, current.hearts - 0.5);
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
    const stepNumber = Math.min(current.history.length + 1, current.missionSteps);
    const progressPct = Math.max(0, Math.min(100, (stepNumber / current.missionSteps) * 100));
    const xp = Math.min(current.xpMax, current.score * current.xpMultiplier);
    const xpPct = Math.max(0, Math.min(100, (xp / current.xpMax) * 100));

    renderHearts('#heart-row');
    MR.$('#mission-progress-label').textContent = `Mission Progress: ${stepNumber}/${current.missionSteps} Completed`;
    MR.$('#mission-progress-count').textContent = `${stepNumber}/${current.missionSteps}`;
    MR.$('#mission-progress-fill').style.width = `${progressPct}%`;
    MR.$('#xp-label').textContent = `Behavior Plan XP: ${xp}/${current.xpMax}`;
    MR.$('#xp-fill').style.width = `${xpPct}%`;
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
    MR.$('#wizard-modal-title').textContent = 'BIP Briefing';
    MR.$('#wizard-modal-text').textContent = text;
    img.src = MR.asset('wizardGuide') || MR.asset('wizardThink');
    img.className = 'wizard-modal-img briefing';
    MR.$('#wizard-modal-continue').textContent = 'Begin Mission';
    modal.hidden = false;
  }

  function showWizardFeedback(choice, score) {
    modalMode = 'feedback';
    const sprite = wizardSpriteForScore(score);
    const modal = MR.$('#wizard-modal');
    const img = MR.$('#wizard-modal-img');
    MR.$('#wizard-modal-title').textContent = sprite.title;
    MR.$('#wizard-modal-text').textContent = choice.wizard || choice.feedback || 'The classroom shifts in response to your decision.';
    img.src = sprite.src;
    img.className = `wizard-modal-img ${sprite.cls}`;
    MR.$('#wizard-modal-continue').textContent = pendingNext ? 'Continue Mission' : 'Complete Mission';
    modal.hidden = false;
  }

  function hideWizardFeedback() {
    MR.$('#wizard-modal').hidden = true;
  }

  function continueAfterFeedback() {
    hideWizardFeedback();
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

  function classifyRun(accuracy) {
    if (accuracy >= 80) return 'high';
    if (accuracy >= 50) return 'mid';
    return 'low';
  }

  function summaryForRun(run) {
    const config = MR.teacherConfig;
    const level = classifyRun(run.accuracy);
    const feedback = config.feedback[level] || config.feedback.mid;
    const actions = level === 'high' ? config.feedback.actionHigh : level === 'mid' ? config.feedback.actionMid : config.feedback.actionLow;
    const lastStrong = run.history.slice().reverse().find(item => item.score >= 10);
    const lastText = lastStrong ? `${config.studentAlias || 'Student'} contacted reinforcement for a plan-aligned response. The BIP pathway became stronger.` : `The final pathway needs one clearer bridge back to the routine before escape, attention, or escalation becomes more efficient.`;
    return { level, feedback, actions, lastText };
  }

  function finishMission() {
    const accuracy = current.maxScore ? Math.round((current.score / current.maxScore) * 100) : 0;
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

  function renderResults(run) {
    const summary = summaryForRun(run);
    const xp = Math.min(MR.teacherConfig.xpMax, run.score * MR.teacherConfig.xpMultiplier);
    const xpPct = Math.max(0, Math.min(100, (xp / MR.teacherConfig.xpMax) * 100));
    renderHearts('#results-heart-row', run.hearts, run.maxHearts);
    MR.$('#results-xp-label').textContent = `Behavior Plan XP: ${xp}/${MR.teacherConfig.xpMax}`;
    MR.$('#results-xp-fill').style.width = `${xpPct}%`;
    MR.$('#results-score-label').textContent = `${run.score}`;

    MR.$('#results-content').innerHTML = `
      <h1>Score: ${run.score} / ${run.maxScore} (${run.accuracy}%)</h1>
      <p><strong>Overall feedback:</strong><br />${MR.escapeHTML(summary.feedback)}</p>
      <p>${MR.escapeHTML(summary.lastText)}</p>
      <p><strong>Action steps for teachers:</strong></p>
      ${summary.actions}
    `;
    MR.setScreen('results');
  }

  MR.engine = {
    start(mode) {
      current = {
        mode,
        mission: chooseMission(mode),
        stepId: null,
        score: 0,
        maxScore: 0,
        hearts: Number(MR.teacherConfig.defaultHearts || 5),
        maxHearts: Number(MR.teacherConfig.defaultHearts || 5),
        missionSteps: Number(MR.teacherConfig.missionSteps || 5),
        xpMax: Number(MR.teacherConfig.xpMax || 1000),
        xpMultiplier: Number(MR.teacherConfig.xpMultiplier || 5),
        history: []
      };
      current.stepId = current.mission.start || Object.keys(current.mission.steps || {})[0];
      MR.setScreen('play');
      renderStep();
      const firstStep = current.mission.steps[current.stepId];
      showBIPBriefing(extractBIPBriefing(firstStep && firstStep.text));
    },

    continueAfterFeedback,

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
