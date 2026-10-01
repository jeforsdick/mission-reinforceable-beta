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
const STORAGE_KEY = "mr-observe-training-preview-v4";

const ids = [
  "login-view","assignment-view","ready-view","active-view","review-view","submitted-view",
  "preview-login-form","preview-sign-out","training-case-list","back-assignment","start-observation",
  "ready-case-title","ready-case-source","ready-duration","ready-routine","ready-behavior-name",
  "ready-behavior-definition","ready-replacement","ready-hypothesis","bip-prevent","bip-teach",
  "bip-reinforce","bip-respond","preflight-fidelity-list","active-behavior-name","active-behavior-definition",
  "active-case-chip","video-loading","elapsed-clock","interval-number","interval-total","interval-clock",
  "target-occurred","continuing-toggle","observable-toggle","current-interval-status",
  "occurred-count","not-observed-count","interval-grid","fidelity-progress","fidelity-list",
  "outcome-prompt","outcome-prompt-item","outcome-prompt-definition","observation-notes",
  "summary-fidelity","summary-fidelity-detail","summary-student","summary-student-detail",
  "summary-observed","summary-not-observed","summary-duration","summary-case-name",
  "review-warning","review-warning-text","mark-remaining-no-opportunity","review-fidelity",
  "submit-preview","submitted-title","training-fidelity-agreement","training-fidelity-agreement-detail",
  "training-interval-agreement","another-case","reset-preview"
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

function newBaseState(observer, role) {
  return {
    version: 4,
    observer: observer.trim() || "Test Observer",
    role,
    status: "assignment",
    caseId: null,
    intervals: [],
    fidelityScores: {},
    fidelityOutcomes: {},
    notes: "",
    videoTime: 0,
    continuingBehavior: false,
    studentUnobservable: false,
    submittedAt: null
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 4) return null;
    parsed.fidelityScores ||= {};
    parsed.fidelityOutcomes ||= {};
    parsed.intervals ||= [];
    parsed.videoTime ||= 0;
    parsed.continuingBehavior ||= false;
    parsed.studentUnobservable ||= false;
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

function currentCase() {
  return state?.caseId ? getTrainingCase(state.caseId) : null;
}

function caseIntervalCount(caseData = currentCase()) {
  return caseData ? intervalCountForDuration(caseData.videoDurationSeconds, INTERVAL_SECONDS) : 0;
}

function allViews() {
  return ["login-view","assignment-view","ready-view","active-view","review-view","submitted-view"];
}

function hideAllViews() {
  allViews().forEach((id) => { els[id].hidden = true; });
}

function showLogin() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  els["login-view"].hidden = false;
}

function caseCard(caseData) {
  return `
    <article class="training-case-card">
      <div class="case-top">
        <div>
          <p class="eyebrow">IRIS staged practice</p>
          <h2>${caseData.title}</h2>
          <p>${caseData.routine}</p>
        </div>
        <span class="case-duration">${formatClock(caseData.videoDurationSeconds)}</span>
      </div>
      <div class="case-meta">
        <div><strong>Student behavior</strong><span>${caseData.behaviorName}</span></div>
        <div><strong>Teacher fidelity</strong><span>${caseData.fidelityTargets.length} individualized targets</span></div>
        <div><strong>Replacement</strong><span>${caseData.replacement}</span></div>
      </div>
      <button class="case-select-button" type="button" data-case-id="${caseData.id}">Use ${caseData.name} Training Case</button>
    </article>
  `;
}

function renderTrainingCases() {
  els["training-case-list"].innerHTML = Object.values(TRAINING_CASES).map(caseCard).join("");
}

function showAssignment() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  renderTrainingCases();
  els["assignment-view"].hidden = false;
}

function renderReady(caseData) {
  els["ready-case-title"].textContent = `${caseData.name}: Know What You’re Watching For`;
  els["ready-case-source"].innerHTML = `${caseData.sourceLabel} · <a href="${caseData.sourceUrl}" target="_blank" rel="noopener">view source context</a>`;
  els["ready-duration"].textContent = formatClock(caseData.videoDurationSeconds);
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

function showReady() {
  const caseData = currentCase();
  if (!caseData) return showAssignment();
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

    if (player && playerReady) {
      if (playerCaseId !== caseData.id) {
        player.cueVideoById(caseData.videoId);
        playerCaseId = caseData.id;
      }
      if (state.videoTime > 0) player.seekTo(state.videoTime, true);
      els["video-loading"].hidden = true;
      return;
    }

    playerCaseId = caseData.id;
    player = new window.YT.Player("training-player", {
      width: "100%",
      height: "100%",
      videoId: caseData.videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady(event) {
          playerReady = true;
          els["video-loading"].hidden = true;
          if (state.videoTime > 0) event.target.seekTo(state.videoTime, true);
          renderTimer();
        },
        onStateChange(event) {
          if (!window.YT) return;
          if (event.data === window.YT.PlayerState.PLAYING) {
            videoIsPlaying = true;
            if (state.status === "armed") state.status = "running";
            saveState();
            startTimer();
          } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.BUFFERING) {
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
    els["video-loading"].textContent = "Could not load the embedded video. Open the source video in another tab and retry.";
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
  return Number(state?.videoTime || 0);
}

function currentIntervalIndex() {
  const caseData = currentCase();
  const count = caseIntervalCount(caseData);
  if (!count) return 0;
  const time = Math.min(getVideoTime(), caseData.videoDurationSeconds);
  return Math.min(count - 1, Math.floor(time / INTERVAL_SECONDS));
}

function automaticScoreForMode() {
  if (state.studentUnobservable) return "not_observed";
  if (state.continuingBehavior) return "occurred";
  return "did_not_occur";
}

function advanceIntervalsTo(activeIndex) {
  if (lastPromptedInterval < 0) {
    lastPromptedInterval = activeIndex;
    if (state.studentUnobservable) state.intervals[activeIndex] = "not_observed";
    else if (state.continuingBehavior) state.intervals[activeIndex] = "occurred";
    return;
  }
  if (activeIndex <= lastPromptedInterval) return;

  for (let index = lastPromptedInterval; index < activeIndex; index += 1) {
    if (!state.intervals[index]) state.intervals[index] = automaticScoreForMode();
  }
  if (state.studentUnobservable) state.intervals[activeIndex] = "not_observed";
  else if (state.continuingBehavior) state.intervals[activeIndex] = "occurred";

  lastPromptedInterval = activeIndex;
  beep();
  saveState();
}

function finalizeIntervals() {
  for (let index = 0; index < state.intervals.length; index += 1) {
    if (!state.intervals[index]) state.intervals[index] = automaticScoreForMode();
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
  els["interval-grid"].innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.intervals.forEach((value, index) => {
    const cell = document.createElement("span");
    cell.className = "interval-cell";
    if (value) cell.classList.add(value);
    else if (index > activeIndex) cell.classList.add("future");
    if (index === activeIndex && state.status === "running") cell.classList.add("current");
    cell.title = `Interval ${index + 1}: ${value ? value.replaceAll("_"," ") : index === activeIndex ? "current" : "not yet scored"}`;
    fragment.appendChild(cell);
  });
  els["interval-grid"].appendChild(fragment);
}

function renderModeButtons() {
  els["continuing-toggle"].setAttribute("aria-pressed", String(Boolean(state.continuingBehavior)));
  els["observable-toggle"].setAttribute("aria-pressed", String(Boolean(state.studentUnobservable)));
  els["continuing-toggle"].querySelector("strong").textContent = state.continuingBehavior ? "↔ Continuing — tap when stopped" : "↔ Behavior continuing";
  els["observable-toggle"].querySelector("strong").textContent = state.studentUnobservable ? "👁 Student observable again" : "👁 Not observable";
}

function intervalStatusText(index) {
  if (state.status === "armed") return "Press play. The observation clock follows the training video.";
  if (!videoIsPlaying && state.status === "running") return "Video paused. Scoring controls are paused with it.";
  if (state.studentUnobservable) return "Not observable is ON. Current/new intervals are excluded until you turn it off.";
  if (state.continuingBehavior) return "Behavior continuing is ON. New intervals are automatically marked as occurrences.";
  if (state.intervals[index] === "occurred") return "Target behavior marked for this interval. Keep watching.";
  return "No target behavior marked. No action needed if it does not occur.";
}

function renderTimer() {
  const caseData = currentCase();
  if (!caseData) return;
  const duration = caseData.videoDurationSeconds;
  const time = Math.max(0, Math.min(getVideoTime(), duration));
  state.videoTime = time;

  const count = caseIntervalCount(caseData);
  const index = currentIntervalIndex();
  const withinInterval = time % INTERVAL_SECONDS;
  const nextBoundary = Math.min(INTERVAL_SECONDS - withinInterval, Math.max(0, duration - time));

  if (state.status === "running") advanceIntervalsTo(index);

  els["elapsed-clock"].textContent = formatClock(time);
  els["interval-number"].textContent = String(index + 1);
  els["interval-total"].textContent = String(count);
  els["interval-clock"].textContent = formatClock(Math.ceil(nextBoundary));

  els["target-occurred"].classList.toggle("marked", state.intervals[index] === "occurred");
  els["current-interval-status"].textContent = intervalStatusText(index);
  renderModeButtons();

  const canScoreStudent = state.status === "running" && videoIsPlaying;
  els["target-occurred"].disabled = !canScoreStudent || state.studentUnobservable;
  els["continuing-toggle"].disabled = !canScoreStudent || state.studentUnobservable;
  els["observable-toggle"].disabled = !canScoreStudent;

  const summary = calculateStudentBehavior(state.intervals);
  els["occurred-count"].textContent = String(summary.occurred);
  els["not-observed-count"].textContent = String(summary.notObserved);
  renderIntervalGrid(index);
  saveState();
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
  const targets = fidelityTargets();
  els["fidelity-list"].innerHTML = targets.map((item, index) => {
    const score = state.fidelityScores[item.id] || "";
    const outcome = state.fidelityOutcomes[item.id] || "";
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

  const scored = targets.filter((item) => Boolean(state.fidelityScores[item.id])).length;
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
  const item = fidelityTargets().find((target) => target.id === itemId);
  if (!item) return;
  state.fidelityScores[itemId] = score;
  if (score !== "implemented") delete state.fidelityOutcomes[itemId];
  saveState();
  renderFidelity();
  if (score === "implemented") showOutcomePrompt(itemId);
  else if (pendingOutcomeItemId === itemId) hideOutcomePrompt();
}

function saveOutcome(choice) {
  if (!pendingOutcomeItemId) return;
  state.fidelityOutcomes[pendingOutcomeItemId] = choice;
  saveState();
  hideOutcomePrompt();
  renderFidelity();
}

function showActive() {
  const caseData = currentCase();
  if (!caseData) return showAssignment();

  hideAllViews();
  els["active-view"].hidden = false;
  els["active-behavior-name"].textContent = caseData.behaviorName;
  els["active-behavior-definition"].textContent = caseData.behaviorDefinition;
  els["active-case-chip"].textContent = caseData.name;
  els["observation-notes"].value = state.notes || "";
  renderFidelity();
  hideOutcomePrompt();
  renderTimer();
  mountPlayer(caseData);
}

function initializeAttempt() {
  const caseData = currentCase();
  if (!caseData) return;
  ensureAudio();
  state.status = "armed";
  state.intervals = Array(caseIntervalCount(caseData)).fill(null);
  state.fidelityScores = {};
  state.fidelityOutcomes = {};
  state.notes = "";
  state.videoTime = 0;
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  state.submittedAt = null;
  lastPromptedInterval = 0;
  saveState();
  showActive();
}

function markTargetOccurred() {
  if (state.status !== "running" || !videoIsPlaying || state.studentUnobservable) return;
  state.intervals[currentIntervalIndex()] = "occurred";
  saveState();
  renderTimer();
}

function toggleContinuing() {
  if (state.status !== "running" || !videoIsPlaying || state.studentUnobservable) return;
  state.continuingBehavior = !state.continuingBehavior;
  if (state.continuingBehavior) state.intervals[currentIntervalIndex()] = "occurred";
  saveState();
  renderTimer();
}

function toggleObservable() {
  if (state.status !== "running" || !videoIsPlaying) return;
  state.studentUnobservable = !state.studentUnobservable;
  if (state.studentUnobservable) {
    state.continuingBehavior = false;
    state.intervals[currentIntervalIndex()] = "not_observed";
  }
  saveState();
  renderTimer();
}

function completeObservation() {
  if (state.status === "review" || state.status === "submitted") return;
  stopTimer();
  finalizeIntervals();
  state.videoTime = currentCase()?.videoDurationSeconds || state.videoTime;
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  state.status = "review";
  saveState();
  beep();
  showReview();
}

function percentLabel(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function missingFidelityItems() {
  return fidelityTargets().filter((item) => !state.fidelityScores[item.id]);
}

function missingOutcomeItems() {
  return fidelityTargets().filter((item) => state.fidelityScores[item.id] === "implemented" && !state.fidelityOutcomes[item.id]);
}

function reviewRow(item, index) {
  const score = state.fidelityScores[item.id] || "";
  const outcome = state.fidelityOutcomes[item.id] || "";
  const scoreButton = (value, label) => `<button class="review-score-button ${score === value ? "selected" : ""}" type="button" data-review-score="${item.id}" data-score="${value}">${label}</button>`;
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
  els["submit-preview"].disabled = parts.length > 0;
}

function showReview() {
  const caseData = currentCase();
  if (!caseData) return showAssignment();
  stopTimer();
  pausePlayer();
  hideAllViews();
  els["review-view"].hidden = false;

  const fidelity = calculateFidelity(state.fidelityScores);
  const student = calculateStudentBehavior(state.intervals);

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
  for (const item of missingFidelityItems()) state.fidelityScores[item.id] = "no_opportunity";
  saveState();
  showReview();
}

function calculateTrainingFidelityAgreement() {
  const targets = fidelityTargets();
  const agreements = targets.filter((item) => state.fidelityScores[item.id] === item.trainingKey).length;
  const scorePercent = targets.length ? (agreements / targets.length) * 100 : null;

  const keyedOutcomes = targets.filter((item) => item.trainingOutcomeKey);
  const outcomeAgreements = keyedOutcomes.filter((item) => state.fidelityOutcomes[item.id] === item.trainingOutcomeKey).length;
  const outcomePercent = keyedOutcomes.length ? (outcomeAgreements / keyedOutcomes.length) * 100 : null;

  return { agreements, total: targets.length, scorePercent, outcomeAgreements, outcomeTotal: keyedOutcomes.length, outcomePercent };
}

function showSubmitted() {
  const caseData = currentCase();
  if (!caseData) return showAssignment();
  stopTimer();
  pausePlayer();
  hideAllViews();
  els["submitted-view"].hidden = false;
  els["submitted-title"].textContent = `${caseData.name} Training Complete`;

  const agreement = calculateTrainingFidelityAgreement();
  els["training-fidelity-agreement"].textContent = percentLabel(agreement.scorePercent);
  const outcomeText = agreement.outcomeTotal
    ? ` Desired-outcome agreement: ${agreement.outcomeAgreements}/${agreement.outcomeTotal} (${percentLabel(agreement.outcomePercent)}).`
    : "";
  els["training-fidelity-agreement-detail"].textContent = `${agreement.agreements}/${agreement.total} fidelity items matched the training key.${outcomeText}`;

  els["training-interval-agreement"].textContent = caseData.masterIntervals ? "Ready" : "Key pending";
}

function chooseCase(caseId) {
  if (!TRAINING_CASES[caseId]) return;
  state.caseId = caseId;
  state.status = "ready";
  state.intervals = [];
  state.fidelityScores = {};
  state.fidelityOutcomes = {};
  state.notes = "";
  state.videoTime = 0;
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  saveState();
  showReady();
}

function repeatCase() {
  state.status = "ready";
  state.intervals = [];
  state.fidelityScores = {};
  state.fidelityOutcomes = {};
  state.notes = "";
  state.videoTime = 0;
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  saveState();
  showReady();
}

function anotherCase() {
  state.status = "assignment";
  state.caseId = null;
  state.intervals = [];
  state.fidelityScores = {};
  state.fidelityOutcomes = {};
  state.videoTime = 0;
  saveState();
  showAssignment();
}

function restore() {
  if (!state) return showLogin();
  switch (state.status) {
    case "assignment": showAssignment(); break;
    case "ready": showReady(); break;
    case "armed":
    case "running": showActive(); break;
    case "review": showReview(); break;
    case "submitted": showSubmitted(); break;
    default: showLogin();
  }
}

els["preview-login-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state = newBaseState(String(data.get("observer") || ""), String(data.get("role") || "primary"));
  saveState();
  showAssignment();
});

els["preview-sign-out"].addEventListener("click", () => {
  clearState();
  showLogin();
});

els["training-case-list"].addEventListener("click", (event) => {
  const button = event.target.closest("[data-case-id]");
  if (button) chooseCase(button.dataset.caseId);
});

els["back-assignment"].addEventListener("click", anotherCase);
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
  state.notes = event.target.value;
  saveState();
});

els["mark-remaining-no-opportunity"].addEventListener("click", markRemainingNoOpportunity);

els["review-fidelity"].addEventListener("click", (event) => {
  const scoreButton = event.target.closest("[data-review-score]");
  if (scoreButton) {
    const itemId = scoreButton.dataset.reviewScore;
    const score = scoreButton.dataset.score;
    state.fidelityScores[itemId] = score;
    if (score !== "implemented") delete state.fidelityOutcomes[itemId];
    saveState();
    showReview();
    return;
  }
  const outcomeButton = event.target.closest("[data-review-outcome]");
  if (outcomeButton) {
    state.fidelityOutcomes[outcomeButton.dataset.reviewOutcome] = outcomeButton.dataset.outcome;
    saveState();
    showReview();
  }
});

els["submit-preview"].addEventListener("click", () => {
  if (missingFidelityItems().length || missingOutcomeItems().length) return;
  state.status = "submitted";
  state.submittedAt = Date.now();
  saveState();
  showSubmitted();
});

els["another-case"].addEventListener("click", anotherCase);
els["reset-preview"].addEventListener("click", repeatCase);
window.addEventListener("beforeunload", saveState);

restore();
