import {
  calculateFidelity,
  calculateStudentBehavior,
  formatClock
} from "./observation-model.mjs";
import {
  TRAINING_CASES,
  getTrainingCase,
  intervalCountForDuration
} from "./training-cases.mjs";

const INTERVAL_SECONDS = 15;
const STORAGE_KEY = "mr-observer-training-module-v5";

const ids = [
  "login-view","module-view","instruction-view","ready-view","active-view","review-view","results-view",
  "feedback-view","questions-view","complete-view","preview-login-form","preview-sign-out","module-welcome",
  "module-steps","complete-instruction","ready-part-label","ready-case-title","ready-case-source","ready-duration",
  "case-purpose","ready-routine","ready-behavior-name","ready-behavior-definition","ready-replacement","ready-hypothesis",
  "bip-prevent","bip-teach","bip-reinforce","bip-respond","preflight-fidelity-list","start-observation",
  "active-behavior-name","active-behavior-definition","active-case-chip","video-loading","elapsed-clock","interval-number",
  "interval-total","interval-clock","target-occurred","continuing-toggle","observable-toggle","current-interval-status",
  "occurred-count","not-observed-count","interval-grid","fidelity-progress","fidelity-list","outcome-prompt",
  "outcome-prompt-item","outcome-prompt-definition","observation-notes","summary-fidelity","summary-fidelity-detail",
  "summary-student","summary-student-detail","summary-observed","summary-not-observed","summary-duration",
  "summary-case-name","review-warning","review-warning-text","mark-remaining-no-opportunity","review-fidelity",
  "submit-attempt","results-eyebrow","results-title","results-copy","training-fidelity-agreement",
  "training-fidelity-agreement-detail","training-interval-agreement","practice-feedback-key","answer-key-list",
  "continue-after-results","feedback-form","questions-form","complete-title","completion-summary"
];
const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

let state = loadState();
let player = null;
let playerReady = false;
let playerCaseId = null;
let youtubeApiPromise = null;
let timerHandle = null;
let lastPromptedInterval = -1;
let pendingOutcomeItemId = null;
let audioContext = null;
let videoIsPlaying = false;

function blankModuleState(observer) {
  return {
    version: 5,
    observer,
    screen: "module",
    module: {
      instructionComplete: false,
      noraCompleted: false,
      noraFeedbackComplete: false,
      kaiCompleted: false,
      questionsComplete: false,
      completedAt: null
    },
    attempts: {
      nora: null,
      kai: null
    },
    feedback: {
      nora: null
    },
    questions: null,
    currentCaseId: null,
    currentAttempt: null
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 5) return null;
    parsed.module ||= {};
    parsed.attempts ||= { nora: null, kai: null };
    parsed.feedback ||= { nora: null };
    return parsed;
  } catch {
    return null;
  }
}

function saveState() {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
  state = null;
  localStorage.removeItem(STORAGE_KEY);
}

function hideAllViews() {
  [
    "login-view","module-view","instruction-view","ready-view","active-view","review-view",
    "results-view","feedback-view","questions-view","complete-view"
  ].forEach((id) => { els[id].hidden = true; });
}

function currentCase() {
  return state?.currentCaseId ? getTrainingCase(state.currentCaseId) : null;
}

function currentAttempt() {
  return state?.currentAttempt || null;
}

function caseIntervalCount(caseData = currentCase()) {
  return caseData ? intervalCountForDuration(caseData.videoDurationSeconds, INTERVAL_SECONDS) : 0;
}

function percentLabel(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function showLogin() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  els["login-view"].hidden = false;
}

function stepStatus(done, locked = false) {
  if (done) return '<span class="step-status complete">Complete</span>';
  if (locked) return '<span class="step-status locked">Locked</span>';
  return '<span class="step-status ready">Ready</span>';
}

function fidelityAgreementFor(attempt, caseData) {
  if (!attempt || !caseData) return null;
  const targets = caseData.fidelityTargets;
  const agreements = targets.filter((item) => attempt.fidelityScores?.[item.id] === item.trainingKey).length;
  const total = targets.length;
  const percent = total ? (agreements / total) * 100 : null;

  const outcomeTargets = targets.filter((item) => item.trainingOutcomeKey);
  const outcomeAgreements = outcomeTargets.filter(
    (item) => attempt.fidelityOutcomes?.[item.id] === item.trainingOutcomeKey
  ).length;
  const outcomePercent = outcomeTargets.length ? (outcomeAgreements / outcomeTargets.length) * 100 : null;

  return { agreements, total, percent, outcomeAgreements, outcomeTotal: outcomeTargets.length, outcomePercent };
}

function stepCard({number,title,description,done,locked,buttonLabel,action,detail}) {
  return `
    <article class="module-step ${done ? "is-complete" : ""} ${locked ? "is-locked" : ""}">
      <div class="step-number">${done ? "✓" : number}</div>
      <div class="step-copy">
        <div class="step-title-row"><h2>${title}</h2>${stepStatus(done, locked)}</div>
        <p>${description}</p>
        ${detail ? `<div class="step-detail">${detail}</div>` : ""}
      </div>
      <button class="step-button" type="button" data-module-action="${action}" ${locked ? "disabled" : ""}>${buttonLabel}</button>
    </article>
  `;
}

function renderModuleSteps() {
  const m = state.module;
  const noraAgreement = fidelityAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  const kaiAgreement = fidelityAgreementFor(state.attempts.kai, TRAINING_CASES.kai);

  const noraDetail = m.noraCompleted
    ? `Fidelity agreement: <strong>${percentLabel(noraAgreement?.percent)}</strong> · Student interval agreement: <strong>master key pending</strong>`
    : "";
  const kaiDetail = m.kaiCompleted
    ? `Fidelity agreement: <strong>${percentLabel(kaiAgreement?.percent)}</strong> · Student interval agreement: <strong>master key pending</strong>`
    : "";

  els["module-steps"].innerHTML = [
    stepCard({
      number:1,
      title:"Learn the procedure",
      description:"Review how 15-second partial-interval student recording and individualized teacher-fidelity scoring work together.",
      done:Boolean(m.instructionComplete),
      locked:false,
      buttonLabel:m.instructionComplete ? "Review" : "Start",
      action:"instruction"
    }),
    stepCard({
      number:2,
      title:"Nora guided practice",
      description:"Review a fictional BIP, collect both measures during the Nora clip, then compare your fidelity scoring with the training key.",
      done:Boolean(m.noraCompleted),
      locked:!m.instructionComplete,
      buttonLabel:m.noraCompleted ? "Review Results" : "Practice with Nora",
      action:m.noraCompleted ? "nora-results" : "nora-ready",
      detail:noraDetail
    }),
    stepCard({
      number:3,
      title:"Tell us what needs fixing",
      description:"Rate how manageable the form felt and tell Jess exactly what should change before live classroom observations.",
      done:Boolean(m.noraFeedbackComplete),
      locked:!m.noraCompleted,
      buttonLabel:m.noraFeedbackComplete ? "Review Feedback" : "Give Feedback",
      action:"feedback"
    }),
    stepCard({
      number:4,
      title:"Kai independent qualification",
      description:"Complete the second case independently. No answer-key coaching is shown while you collect.",
      done:Boolean(m.kaiCompleted),
      locked:!m.noraFeedbackComplete,
      buttonLabel:m.kaiCompleted ? "Review Results" : "Start Qualification",
      action:m.kaiCompleted ? "kai-results" : "kai-ready",
      detail:kaiDetail
    }),
    stepCard({
      number:5,
      title:"Submit questions for the 30-minute meeting",
      description:"Send anything that felt ambiguous, difficult to score, or worth practicing together before live data collection.",
      done:Boolean(m.questionsComplete),
      locked:!m.kaiCompleted,
      buttonLabel:m.questionsComplete ? "Review Questions" : "Submit Questions",
      action:"questions"
    })
  ].join("");
}

function showModule() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  state.screen = "module";
  saveState();
  els["module-view"].hidden = false;
  els["module-welcome"].textContent = `Hi ${state.observer}. You can stop and come back; this preview saves your progress in this browser.`;
  renderModuleSteps();
}

function showInstruction() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  state.screen = "instruction";
  saveState();
  els["instruction-view"].hidden = false;
}

function renderReady(caseData) {
  const isNora = caseData.id === "nora";
  els["ready-part-label"].textContent = isNora ? "Part 2 · Guided practice" : "Part 4 · Independent qualification";
  els["ready-case-title"].textContent = `${caseData.name}: Know What You’re Watching For`;
  els["ready-case-source"].innerHTML = `${caseData.sourceLabel} · <a href="${caseData.sourceUrl}" target="_blank" rel="noopener">view source context</a>`;
  els["ready-duration"].textContent = formatClock(caseData.videoDurationSeconds);
  els["case-purpose"].innerHTML = isNora
    ? '<strong>Nora is practice.</strong> After submitting, you will see item-level fidelity feedback. Use this case to learn the form and notice what is hard to do at the same time.'
    : '<strong>Kai is the independent check.</strong> Collect without answer-key coaching. Your full raw interval and fidelity record is retained for the training-agreement score.';
  els["ready-routine"].textContent = caseData.routine;
  els["ready-behavior-name"].textContent = caseData.behaviorName;
  els["ready-behavior-definition"].textContent = caseData.behaviorDefinition;
  els["ready-replacement"].textContent = caseData.replacement;
  els["ready-hypothesis"].textContent = caseData.hypothesis;
  els["bip-prevent"].textContent = caseData.bip.prevent;
  els["bip-teach"].textContent = caseData.bip.teach;
  els["bip-reinforce"].textContent = caseData.bip.reinforce;
  els["bip-respond"].textContent = caseData.bip.respond;
  els["preflight-fidelity-list"].innerHTML = caseData.fidelityTargets.map((item, index) => `
    <div class="preflight-item">
      <span>${item.area}</span>
      <strong>${index + 1}. ${item.short}</strong>
      ${item.detail}
    </div>
  `).join("");
}

function openCaseReady(caseId) {
  const caseData = getTrainingCase(caseId);
  state.currentCaseId = caseId;
  state.currentAttempt = null;
  state.screen = "ready";
  saveState();
  stopTimer();
  pausePlayer();
  hideAllViews();
  renderReady(caseData);
  els["ready-view"].hidden = false;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => reject(new Error("Could not load YouTube player."));
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

async function mountPlayer(caseData) {
  els["video-loading"].hidden = false;
  try {
    await loadYouTubeApi();
    const attempt = currentAttempt();

    if (player && playerReady) {
      if (playerCaseId !== caseData.id || Number(attempt?.videoTime || 0) <= 0) {
        player.cueVideoById(caseData.videoId);
        playerCaseId = caseData.id;
      } else {
        player.seekTo(attempt.videoTime, true);
      }
      els["video-loading"].hidden = true;
      return;
    }

    playerCaseId = caseData.id;
    player = new window.YT.Player("training-player", {
      width: "100%",
      height: "100%",
      videoId: caseData.videoId,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady(event) {
          playerReady = true;
          els["video-loading"].hidden = true;
          const active = currentAttempt();
          if (active?.videoTime > 0) event.target.seekTo(active.videoTime, true);
          renderTimer();
        },
        onStateChange(event) {
          if (!window.YT || !state?.currentAttempt) return;
          if (event.data === window.YT.PlayerState.PLAYING) {
            videoIsPlaying = true;
            if (state.currentAttempt.status === "armed") state.currentAttempt.status = "running";
            saveState();
            startTimer();
          } else if (
            event.data === window.YT.PlayerState.PAUSED ||
            event.data === window.YT.PlayerState.BUFFERING
          ) {
            videoIsPlaying = false;
            stopTimer();
            renderTimer();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            videoIsPlaying = false;
            completeObservation();
          }
        }
      }
    });
  } catch {
    els["video-loading"].textContent = "Could not load the embedded video. Please refresh and try again.";
  }
}

function pausePlayer() {
  try {
    if (playerReady && player?.pauseVideo) player.pauseVideo();
  } catch {}
  videoIsPlaying = false;
}

function getVideoTime() {
  try {
    if (playerReady && player?.getCurrentTime) {
      const time = Number(player.getCurrentTime());
      if (Number.isFinite(time)) return time;
    }
  } catch {}
  return Number(currentAttempt()?.videoTime || 0);
}

function currentIntervalIndex() {
  const caseData = currentCase();
  const count = caseIntervalCount(caseData);
  if (!count) return 0;
  const time = Math.min(getVideoTime(), caseData.videoDurationSeconds);
  return Math.min(count - 1, Math.floor(time / INTERVAL_SECONDS));
}

function automaticScoreForMode() {
  const attempt = currentAttempt();
  if (attempt.studentUnobservable) return "not_observed";
  if (attempt.continuingBehavior) return "occurred";
  return "did_not_occur";
}

function advanceIntervalsTo(activeIndex) {
  const attempt = currentAttempt();
  if (!attempt) return;

  if (lastPromptedInterval < 0) {
    lastPromptedInterval = activeIndex;
    if (attempt.studentUnobservable) attempt.intervals[activeIndex] = "not_observed";
    else if (attempt.continuingBehavior) attempt.intervals[activeIndex] = "occurred";
    return;
  }
  if (activeIndex <= lastPromptedInterval) return;

  for (let index = lastPromptedInterval; index < activeIndex; index += 1) {
    if (!attempt.intervals[index]) attempt.intervals[index] = automaticScoreForMode();
  }
  if (attempt.studentUnobservable) attempt.intervals[activeIndex] = "not_observed";
  else if (attempt.continuingBehavior) attempt.intervals[activeIndex] = "occurred";

  lastPromptedInterval = activeIndex;
  beep();
  saveState();
}

function finalizeIntervals() {
  const attempt = currentAttempt();
  if (!attempt) return;
  for (let index = 0; index < attempt.intervals.length; index += 1) {
    if (!attempt.intervals[index]) attempt.intervals[index] = automaticScoreForMode();
  }
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
  if (audioContext?.state === "suspended") audioContext.resume().catch(() => {});
}

function beep() {
  try {
    ensureAudio();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.038, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.07);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.07);
    if (navigator.vibrate) navigator.vibrate(35);
  } catch {}
}

function renderIntervalGrid(activeIndex) {
  const attempt = currentAttempt();
  els["interval-grid"].innerHTML = "";
  const fragment = document.createDocumentFragment();
  attempt.intervals.forEach((value, index) => {
    const cell = document.createElement("span");
    cell.className = "interval-cell";
    if (value) cell.classList.add(value);
    else if (index > activeIndex) cell.classList.add("future");
    if (index === activeIndex && attempt.status === "running") cell.classList.add("current");
    cell.title = `Interval ${index + 1}: ${value ? value.replaceAll("_"," ") : index === activeIndex ? "current" : "not yet scored"}`;
    fragment.appendChild(cell);
  });
  els["interval-grid"].appendChild(fragment);
}

function renderModeButtons() {
  const attempt = currentAttempt();
  els["continuing-toggle"].setAttribute("aria-pressed", String(Boolean(attempt.continuingBehavior)));
  els["observable-toggle"].setAttribute("aria-pressed", String(Boolean(attempt.studentUnobservable)));
  els["continuing-toggle"].querySelector("strong").textContent = attempt.continuingBehavior
    ? "↔ Continuing — tap when stopped"
    : "↔ Behavior continuing";
  els["observable-toggle"].querySelector("strong").textContent = attempt.studentUnobservable
    ? "👁 Student observable again"
    : "👁 Not observable";
}

function intervalStatusText(index) {
  const attempt = currentAttempt();
  if (attempt.status === "armed") return "Press play. The observation clock follows the training video.";
  if (!videoIsPlaying && attempt.status === "running") return "Video paused. Scoring controls are paused with it.";
  if (attempt.studentUnobservable) return "Not observable is ON. Current/new intervals are excluded until you turn it off.";
  if (attempt.continuingBehavior) return "Behavior continuing is ON. New intervals are automatically marked as occurrences.";
  if (attempt.intervals[index] === "occurred") return "Target behavior marked for this interval. Keep watching.";
  return "No target behavior marked. No action needed if it does not occur.";
}

function renderTimer() {
  const caseData = currentCase();
  const attempt = currentAttempt();
  if (!caseData || !attempt) return;

  const duration = caseData.videoDurationSeconds;
  const time = Math.max(0, Math.min(getVideoTime(), duration));
  attempt.videoTime = time;

  const index = currentIntervalIndex();
  const withinInterval = time % INTERVAL_SECONDS;
  const nextBoundary = Math.min(INTERVAL_SECONDS - withinInterval, Math.max(0, duration - time));

  if (attempt.status === "running") advanceIntervalsTo(index);

  els["elapsed-clock"].textContent = formatClock(time);
  els["interval-number"].textContent = String(index + 1);
  els["interval-total"].textContent = String(attempt.intervals.length);
  els["interval-clock"].textContent = formatClock(Math.ceil(nextBoundary));
  els["target-occurred"].classList.toggle("marked", attempt.intervals[index] === "occurred");
  els["current-interval-status"].textContent = intervalStatusText(index);
  renderModeButtons();

  const canScoreStudent = attempt.status === "running" && videoIsPlaying;
  els["target-occurred"].disabled = !canScoreStudent || attempt.studentUnobservable;
  els["continuing-toggle"].disabled = !canScoreStudent || attempt.studentUnobservable;
  els["observable-toggle"].disabled = !canScoreStudent;

  const summary = calculateStudentBehavior(attempt.intervals);
  els["occurred-count"].textContent = String(summary.occurred);
  els["not-observed-count"].textContent = String(summary.notObserved);
  renderIntervalGrid(index);
}

function startTimer() {
  stopTimer();
  renderTimer();
  timerHandle = window.setInterval(renderTimer, 250);
}

function stopTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
}

function fidelityTargets() {
  return currentCase()?.fidelityTargets || [];
}

function renderFidelity() {
  const attempt = currentAttempt();
  const targets = fidelityTargets();

  els["fidelity-list"].innerHTML = targets.map((item, index) => {
    const score = attempt.fidelityScores[item.id] || "";
    const outcome = attempt.fidelityOutcomes[item.id] || "";
    const outcomeLabel = outcome === "yes" ? "Outcome: Yes" : outcome === "no" ? "Outcome: No" : outcome === "unclear" ? "Outcome: Not clear" : "";
    return `
      <div class="training-fidelity-row">
        <div class="training-fidelity-copy" title="${item.full.replaceAll('"',"&quot;")}">
          <span class="target-area">${item.area}</span>
          <strong>${index + 1}. ${item.short}</strong>
          <small>${item.detail}</small>
          ${outcomeLabel ? `<button class="outcome-badge" type="button" data-outcome-edit="${item.id}">${outcomeLabel}</button>` : ""}
        </div>
        <button type="button" class="fidelity-choice ${score === "implemented" ? "selected" : ""}" data-fidelity-choice="${item.id}" data-score="implemented">Implemented<br>as Written</button>
        <button type="button" class="fidelity-choice not-implemented ${score === "not_implemented" ? "selected" : ""}" data-fidelity-choice="${item.id}" data-score="not_implemented">Not Implemented<br>as Written</button>
      </div>
    `;
  }).join("");

  const scored = targets.filter((item) => Boolean(attempt.fidelityScores[item.id])).length;
  els["fidelity-progress"].textContent = `${scored}/${targets.length}`;
}

function hideOutcomePrompt() {
  pendingOutcomeItemId = null;
  els["outcome-prompt"].hidden = true;
}

function showOutcomePrompt(itemId) {
  const item = fidelityTargets().find((target) => target.id === itemId);
  if (!item) return;
  pendingOutcomeItemId = itemId;
  els["outcome-prompt-item"].textContent = item.short;
  els["outcome-prompt-definition"].textContent = `Desired outcome: ${item.desiredOutcome}`;
  els["outcome-prompt"].hidden = false;
}

function scoreFidelity(itemId, score) {
  const attempt = currentAttempt();
  const item = fidelityTargets().find((target) => target.id === itemId);
  if (!attempt || !item) return;
  attempt.fidelityScores[itemId] = score;
  if (score !== "implemented") delete attempt.fidelityOutcomes[itemId];
  saveState();
  renderFidelity();
  if (score === "implemented") showOutcomePrompt(itemId);
  else if (pendingOutcomeItemId === itemId) hideOutcomePrompt();
}

function saveOutcome(choice) {
  const attempt = currentAttempt();
  if (!attempt || !pendingOutcomeItemId) return;
  attempt.fidelityOutcomes[pendingOutcomeItemId] = choice;
  saveState();
  hideOutcomePrompt();
  renderFidelity();
}

function initializeAttempt() {
  const caseData = currentCase();
  if (!caseData) return;
  ensureAudio();
  state.currentAttempt = {
    caseId: caseData.id,
    attemptType: caseData.id === "nora" ? "practice" : "qualification",
    status: "armed",
    intervals: Array(caseIntervalCount(caseData)).fill(null),
    fidelityScores: {},
    fidelityOutcomes: {},
    notes: "",
    videoTime: 0,
    continuingBehavior: false,
    studentUnobservable: false,
    startedAt: new Date().toISOString(),
    submittedAt: null
  };
  state.screen = "active";
  lastPromptedInterval = 0;
  saveState();
  showActive();
  beep();
}

function showActive() {
  const caseData = currentCase();
  const attempt = currentAttempt();
  if (!caseData || !attempt) return showModule();

  hideAllViews();
  state.screen = "active";
  saveState();
  els["active-view"].hidden = false;
  els["active-behavior-name"].textContent = caseData.behaviorName;
  els["active-behavior-definition"].textContent = caseData.behaviorDefinition;
  els["active-case-chip"].textContent = caseData.name;
  els["observation-notes"].value = attempt.notes || "";
  renderFidelity();
  hideOutcomePrompt();
  renderTimer();
  mountPlayer(caseData);
}

function markTargetOccurred() {
  const attempt = currentAttempt();
  if (!attempt || attempt.status !== "running" || !videoIsPlaying || attempt.studentUnobservable) return;
  attempt.intervals[currentIntervalIndex()] = "occurred";
  saveState();
  renderTimer();
}

function toggleContinuing() {
  const attempt = currentAttempt();
  if (!attempt || attempt.status !== "running" || !videoIsPlaying || attempt.studentUnobservable) return;
  attempt.continuingBehavior = !attempt.continuingBehavior;
  if (attempt.continuingBehavior) attempt.intervals[currentIntervalIndex()] = "occurred";
  saveState();
  renderTimer();
}

function toggleObservable() {
  const attempt = currentAttempt();
  if (!attempt || attempt.status !== "running" || !videoIsPlaying) return;
  attempt.studentUnobservable = !attempt.studentUnobservable;
  if (attempt.studentUnobservable) {
    attempt.continuingBehavior = false;
    attempt.intervals[currentIntervalIndex()] = "not_observed";
  }
  saveState();
  renderTimer();
}

function completeObservation() {
  const attempt = currentAttempt();
  const caseData = currentCase();
  if (!attempt || !caseData || attempt.status === "review" || attempt.status === "submitted") return;
  stopTimer();
  pausePlayer();
  finalizeIntervals();
  attempt.videoTime = caseData.videoDurationSeconds;
  attempt.continuingBehavior = false;
  attempt.studentUnobservable = false;
  attempt.status = "review";
  state.screen = "review";
  saveState();
  beep();
  showReview();
}

function missingFidelityItems() {
  const attempt = currentAttempt();
  return fidelityTargets().filter((item) => !attempt?.fidelityScores?.[item.id]);
}

function missingOutcomeItems() {
  const attempt = currentAttempt();
  return fidelityTargets().filter(
    (item) => attempt?.fidelityScores?.[item.id] === "implemented" && !attempt?.fidelityOutcomes?.[item.id]
  );
}

function reviewRow(item, index) {
  const attempt = currentAttempt();
  const score = attempt.fidelityScores[item.id] || "";
  const outcome = attempt.fidelityOutcomes[item.id] || "";
  const scoreButton = (value, label) =>
    `<button class="review-score-button ${score === value ? "selected" : ""}" type="button" data-review-score="${item.id}" data-score="${value}">${label}</button>`;

  const outcomeControls = score === "implemented" ? `
    <div class="review-outcome">
      <small>Desired outcome:</small>
      <div class="review-score-actions">
        <button class="review-score-button ${outcome === "yes" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="yes">Yes</button>
        <button class="review-score-button ${outcome === "no" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="no">No</button>
        <button class="review-score-button ${outcome === "unclear" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="unclear">Not clear</button>
      </div>
    </div>
  ` : "";

  return `
    <div class="review-fidelity-row">
      <div>
        <strong>${index + 1}. ${item.short}</strong>
        <small>${item.detail}</small>
        ${outcomeControls}
      </div>
      <div class="review-score-actions">
        ${scoreButton("implemented","Implemented")}
        ${scoreButton("not_implemented","Not Implemented")}
        ${scoreButton("no_opportunity","No Opportunity")}
      </div>
    </div>
  `;
}

function renderReviewWarning() {
  const missingScores = missingFidelityItems();
  const missingOutcomes = missingOutcomeItems();
  const parts = [];
  if (missingScores.length) parts.push(`${missingScores.length} fidelity item${missingScores.length === 1 ? "" : "s"} still need a score`);
  if (missingOutcomes.length) parts.push(`${missingOutcomes.length} implemented item${missingOutcomes.length === 1 ? "" : "s"} still need an outcome rating`);

  els["review-warning"].hidden = parts.length === 0;
  els["review-warning-text"].textContent = parts.length ? parts.join(" and ") + "." : "";
  els["mark-remaining-no-opportunity"].hidden = missingScores.length === 0;
  els["submit-attempt"].disabled = parts.length > 0;
}

function showReview() {
  const caseData = currentCase();
  const attempt = currentAttempt();
  if (!caseData || !attempt) return showModule();

  stopTimer();
  pausePlayer();
  hideAllViews();
  state.screen = "review";
  saveState();
  els["review-view"].hidden = false;

  const fidelity = calculateFidelity(attempt.fidelityScores);
  const student = calculateStudentBehavior(attempt.intervals);

  els["summary-fidelity"].textContent = percentLabel(fidelity.percent);
  els["summary-fidelity-detail"].textContent = `${fidelity.implemented} implemented / ${fidelity.scoreable} scoreable; ${fidelity.noOpportunity} no opportunity`;
  els["summary-student"].textContent = percentLabel(student.percent);
  els["summary-student-detail"].textContent = `${student.occurred} occurrence intervals / ${student.observed} observed`;
  els["summary-observed"].textContent = String(student.observed);
  els["summary-not-observed"].textContent = `${student.notObserved} not observed`;
  els["summary-duration"].textContent = formatClock(caseData.videoDurationSeconds);
  els["summary-case-name"].textContent = caseData.title;
  els["review-fidelity"].innerHTML = fidelityTargets().map(reviewRow).join("");
  renderReviewWarning();
}

function markRemainingNoOpportunity() {
  const attempt = currentAttempt();
  for (const item of missingFidelityItems()) attempt.fidelityScores[item.id] = "no_opportunity";
  saveState();
  showReview();
}

function submitAttempt() {
  const attempt = currentAttempt();
  const caseData = currentCase();
  if (!attempt || !caseData || missingFidelityItems().length || missingOutcomeItems().length) return;

  attempt.status = "submitted";
  attempt.submittedAt = new Date().toISOString();
  state.attempts[caseData.id] = JSON.parse(JSON.stringify(attempt));
  if (caseData.id === "nora") state.module.noraCompleted = true;
  if (caseData.id === "kai") state.module.kaiCompleted = true;
  state.screen = "results";
  saveState();
  showResults(caseData.id);
}

function answerKeyRow(item, attempt) {
  const user = attempt.fidelityScores[item.id];
  const correct = item.trainingKey;
  const match = user === correct;
  const label = (value) => value === "implemented" ? "Implemented as Written" : value === "not_implemented" ? "Not Implemented as Written" : "No Opportunity";
  return `
    <div class="answer-key-row ${match ? "match" : "mismatch"}">
      <div>
        <strong>${item.short}</strong>
        <small>${match ? "Matched the training key" : "Review this item at the follow-up if it was unclear."}</small>
      </div>
      <div><span>Your score</span><strong>${label(user)}</strong></div>
      <div><span>Training key</span><strong>${label(correct)}</strong></div>
    </div>
  `;
}

function showResults(caseId = state.currentCaseId) {
  const caseData = getTrainingCase(caseId);
  const attempt = state.attempts[caseId];
  if (!attempt) return showModule();

  stopTimer();
  pausePlayer();
  state.currentCaseId = caseId;
  state.currentAttempt = null;
  state.screen = "results";
  saveState();
  hideAllViews();
  els["results-view"].hidden = false;

  const agreement = fidelityAgreementFor(attempt, caseData);
  const isNora = caseId === "nora";

  els["results-eyebrow"].textContent = isNora ? "Nora guided practice" : "Kai independent qualification";
  els["results-title"].textContent = `${caseData.name} Results`;
  els["results-copy"].textContent = isNora
    ? "Use the item-level comparison below as practice feedback. Then tell Jess what the form was like to use."
    : "This attempt is retained as your independent qualification record. Student interval agreement will be calculated from the final master-coded interval key.";
  els["training-fidelity-agreement"].textContent = percentLabel(agreement.percent);

  const outcomeDetail = agreement.outcomeTotal
    ? ` Desired-outcome agreement: ${agreement.outcomeAgreements}/${agreement.outcomeTotal} (${percentLabel(agreement.outcomePercent)}).`
    : "";
  els["training-fidelity-agreement-detail"].textContent =
    `${agreement.agreements}/${agreement.total} fidelity scores matched the training key.${outcomeDetail}`;

  els["training-interval-agreement"].textContent = caseData.masterIntervals ? "Ready to calculate" : "Master key pending";
  els["practice-feedback-key"].hidden = !isNora;
  if (isNora) {
    els["answer-key-list"].innerHTML = caseData.fidelityTargets.map((item) => answerKeyRow(item, attempt)).join("");
    els["continue-after-results"].textContent = state.module.noraFeedbackComplete ? "Return to Module" : "Give Feedback on the Form";
  } else {
    els["continue-after-results"].textContent = state.module.questionsComplete ? "Return to Module" : "Submit Questions for the Team Meeting";
  }
}

function ratingOptions(name, selected = "") {
  return [1,2,3,4,5].map((value) => `
    <label>
      <input type="radio" name="${name}" value="${value}" ${String(value) === String(selected) ? "checked" : ""} required>
      <span>${value}</span>
    </label>
  `).join("") + '<div class="rating-anchors"><span>Hard</span><span>Easy</span></div>';
}

function showFeedback() {
  hideAllViews();
  state.screen = "feedback";
  saveState();
  els["feedback-view"].hidden = false;
  const saved = state.feedback.nora || {};

  document.querySelectorAll("[data-rating-name]").forEach((container) => {
    const name = container.dataset.ratingName;
    container.innerHTML = ratingOptions(name, saved[name] || "");
  });

  const form = els["feedback-form"];
  for (const [key,value] of Object.entries(saved)) {
    const field = form.elements.namedItem(key);
    if (field && field instanceof HTMLElement && field.type !== "radio") field.value = value ?? "";
  }
}

function submitFeedback(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const feedback = {
    manageability: data.get("manageability"),
    fidelity_ease: data.get("fidelity_ease"),
    behavior_ease: data.get("behavior_ease"),
    cue_helpfulness: data.get("cue_helpfulness"),
    could_not_enter: data.get("could_not_enter"),
    hard_definitions: String(data.get("hard_definitions") || "").trim(),
    first_change: String(data.get("first_change") || "").trim(),
    questions: String(data.get("questions") || "").trim(),
    submittedAt: new Date().toISOString()
  };
  state.feedback.nora = feedback;
  state.module.noraFeedbackComplete = true;
  saveState();
  openCaseReady("kai");
}

function showQuestions() {
  hideAllViews();
  state.screen = "questions";
  saveState();
  els["questions-view"].hidden = false;
  const saved = state.questions || {};
  const form = els["questions-form"];
  for (const [key,value] of Object.entries(saved)) {
    const field = form.elements.namedItem(key);
    if (field && field instanceof HTMLElement) field.value = value ?? "";
  }
}

function submitQuestions(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.questions = {
    scoring_questions: String(data.get("scoring_questions") || "").trim(),
    practice_requests: String(data.get("practice_requests") || "").trim(),
    other_notes: String(data.get("other_notes") || "").trim(),
    submittedAt: new Date().toISOString()
  };
  state.module.questionsComplete = true;
  state.module.completedAt = new Date().toISOString();
  saveState();
  showComplete();
}

function showComplete() {
  hideAllViews();
  state.screen = "complete";
  saveState();
  els["complete-view"].hidden = false;
  els["complete-title"].textContent = `${state.observer}, you’re done for now`;

  const nora = fidelityAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  const kai = fidelityAgreementFor(state.attempts.kai, TRAINING_CASES.kai);
  els["completion-summary"].innerHTML = `
    <div><span>Nora fidelity agreement</span><strong>${percentLabel(nora?.percent)}</strong></div>
    <div><span>Kai fidelity agreement</span><strong>${percentLabel(kai?.percent)}</strong></div>
    <div><span>Student interval agreement</span><strong>Pending master keys</strong></div>
    <div><span>Feedback + questions</span><strong>Submitted</strong></div>
  `;
}

function moduleAction(action) {
  switch (action) {
    case "instruction": showInstruction(); break;
    case "nora-ready": openCaseReady("nora"); break;
    case "nora-results": showResults("nora"); break;
    case "feedback": showFeedback(); break;
    case "kai-ready": openCaseReady("kai"); break;
    case "kai-results": showResults("kai"); break;
    case "questions": showQuestions(); break;
  }
}

function restore() {
  if (!state) return showLogin();
  switch (state.screen) {
    case "module": showModule(); break;
    case "instruction": showInstruction(); break;
    case "ready":
      if (state.currentCaseId) openCaseReady(state.currentCaseId);
      else showModule();
      break;
    case "active":
      if (state.currentCaseId && state.currentAttempt) showActive();
      else showModule();
      break;
    case "review":
      if (state.currentCaseId && state.currentAttempt) showReview();
      else showModule();
      break;
    case "results":
      if (state.currentCaseId && state.attempts[state.currentCaseId]) showResults(state.currentCaseId);
      else showModule();
      break;
    case "feedback": showFeedback(); break;
    case "questions": showQuestions(); break;
    case "complete": showComplete(); break;
    default: showModule();
  }
}

els["preview-login-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const observer = String(data.get("observer") || "").trim();
  if (!observer) return;
  state = blankModuleState(observer);
  saveState();
  showModule();
});

els["preview-sign-out"].addEventListener("click", () => {
  clearState();
  showLogin();
});

document.querySelectorAll(".back-module").forEach((button) => {
  button.addEventListener("click", showModule);
});

els["module-steps"].addEventListener("click", (event) => {
  const button = event.target.closest("[data-module-action]");
  if (button && !button.disabled) moduleAction(button.dataset.moduleAction);
});

els["complete-instruction"].addEventListener("click", () => {
  state.module.instructionComplete = true;
  saveState();
  openCaseReady("nora");
});

els["start-observation"].addEventListener("click", initializeAttempt);
els["target-occurred"].addEventListener("click", markTargetOccurred);
els["continuing-toggle"].addEventListener("click", toggleContinuing);
els["observable-toggle"].addEventListener("click", toggleObservable);

els["fidelity-list"].addEventListener("click", (event) => {
  const scoreButton = event.target.closest("[data-fidelity-choice]");
  if (scoreButton) {
    scoreFidelity(scoreButton.dataset.fidelityChoice, scoreButton.dataset.score);
    return;
  }
  const outcomeButton = event.target.closest("[data-outcome-edit]");
  if (outcomeButton) showOutcomePrompt(outcomeButton.dataset.outcomeEdit);
});

els["outcome-prompt"].addEventListener("click", (event) => {
  const button = event.target.closest("[data-outcome-choice]");
  if (button) saveOutcome(button.dataset.outcomeChoice);
});

els["observation-notes"].addEventListener("input", (event) => {
  const attempt = currentAttempt();
  if (!attempt) return;
  attempt.notes = event.target.value;
  saveState();
});

els["mark-remaining-no-opportunity"].addEventListener("click", markRemainingNoOpportunity);

els["review-fidelity"].addEventListener("click", (event) => {
  const attempt = currentAttempt();
  const scoreButton = event.target.closest("[data-review-score]");
  if (scoreButton) {
    const itemId = scoreButton.dataset.reviewScore;
    const score = scoreButton.dataset.score;
    attempt.fidelityScores[itemId] = score;
    if (score !== "implemented") delete attempt.fidelityOutcomes[itemId];
    saveState();
    showReview();
    return;
  }
  const outcomeButton = event.target.closest("[data-review-outcome]");
  if (outcomeButton) {
    attempt.fidelityOutcomes[outcomeButton.dataset.reviewOutcome] = outcomeButton.dataset.outcome;
    saveState();
    showReview();
  }
});

els["submit-attempt"].addEventListener("click", submitAttempt);

els["continue-after-results"].addEventListener("click", () => {
  if (state.currentCaseId === "nora") {
    if (state.module.noraFeedbackComplete) showModule();
    else showFeedback();
  } else {
    if (state.module.questionsComplete) showModule();
    else showQuestions();
  }
});

els["feedback-form"].addEventListener("submit", submitFeedback);
els["questions-form"].addEventListener("submit", submitQuestions);

window.addEventListener("beforeunload", saveState);

restore();
