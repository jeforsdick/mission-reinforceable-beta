import {
  REAL_SESSION,
  TEST_SESSION,
  calculateFidelity,
  calculateStudentBehavior,
  formatClock
} from "./observation-model.mjs";

const params = new URLSearchParams(window.location.search);
const TEST_MODE = params.get("test") === "1";
const SESSION = TEST_MODE ? TEST_SESSION : REAL_SESSION;
const STORAGE_KEY = "mr-observe-preview-v3";

const FIDELITY_GROUPS = [
  {
    label: "Prevent Strategies",
    items: [
      {
        id: "prevent_01",
        short: "Pre-correct before math",
        detail: "State expectations and available support options before independent math.",
        full: "Prior to independent math, pre-correct the student by verbally stating task expectations and available support options (for example, remind the student that a break card or help request is available)."
      },
      {
        id: "prevent_02",
        short: "Modified task provided",
        detail: "Match task amount/difficulty to current skill level.",
        full: "Provide a modified task or reduce the number of problems presented during independent work to match the student’s current skill level."
      },
      {
        id: "prevent_03",
        short: "Attention within first 2 min",
        detail: "Brief positive interaction before problem behavior.",
        full: "Deliver noncontingent attention or a brief positive interaction within the first 2 minutes of the independent-work period before problem behavior can occur."
      }
    ]
  },
  {
    label: "Teach Strategies",
    items: [
      {
        id: "teach_01",
        short: "Prompt break request",
        detail: "Prompt card/use when early frustration appears.",
        full: "When the student begins to show early signs of frustration, prompt the student to use the break request card by pointing to it or verbally cueing its use."
      },
      {
        id: "teach_02",
        short: "Model/practice break request",
        detail: "At least one brief practice trial before independent work.",
        full: "Explicitly model and practice the break-request procedure at the start of the observation session, with at least one brief practice trial before independent work begins."
      },
      {
        id: "teach_03",
        short: "Acknowledge appropriate request",
        detail: "Specific acknowledgment within 5 seconds.",
        full: "Provide specific behavior-contingent acknowledgment within 5 seconds when the student uses the replacement behavior."
      }
    ]
  },
  {
    label: "Reinforce Strategies",
    items: [
      {
        id: "reinforce_01",
        short: "Honor break/help request",
        detail: "Within 5 seconds; 2-minute break before return.",
        full: "Honor appropriate break or help requests within 5 seconds and provide a 2-minute break before returning the student to the task."
      },
      {
        id: "reinforce_02",
        short: "Respond to refusal as written",
        detail: "Neutral redirect; no extended engagement/removal.",
        full: "Following work refusal, withhold escape from the task and redirect the student using a neutral tone without extended verbal engagement or removal of materials."
      },
      {
        id: "reinforce_03",
        short: "Specific praise ≥3 times",
        detail: "Praise contingent on engagement/task completion.",
        full: "Deliver specific praise contingent on task engagement or task completion at least 3 times during the 30-minute observation."
      }
    ]
  }
];

const ALL_FIDELITY_ITEMS = FIDELITY_GROUPS.flatMap((group) => group.items);
const ITEM_BY_ID = Object.fromEntries(ALL_FIDELITY_ITEMS.map((item) => [item.id, item]));

const ids = [
  "login-view","assignment-view","ready-view","active-view","review-view","submitted-view",
  "preview-login-form","preview-sign-out","assignment-observer","assignment-role","assignment-date",
  "open-ready","back-assignment","start-observation","preflight-fidelity-list",
  "elapsed-clock","remaining-clock","interval-number","interval-total","interval-clock",
  "pause-observation","test-mode-badge","target-occurred","continuing-toggle","observable-toggle",
  "current-interval-status","fidelity-progress","occurred-count","not-observed-count","interval-grid",
  "fidelity-list","outcome-prompt","outcome-prompt-label","outcome-prompt-item","observation-notes",
  "summary-fidelity","summary-fidelity-detail","summary-student","summary-student-detail","summary-observed",
  "summary-not-observed","summary-duration","review-warning","review-warning-title","review-warning-text",
  "mark-remaining-no-opportunity","review-fidelity","return-fidelity","submit-preview","reset-preview",
  "pause-dialog","pause-form","pause-reason","cancel-pause"
];
const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

let state = loadState();
let timerHandle = null;
let lastPromptedInterval = -1;
let audioContext = null;
let pendingOutcomeItemId = null;

function newBaseState(observer, role) {
  return {
    version: 3,
    observer: observer.trim() || "Test Observer",
    role,
    status: "assignment",
    caseCode: "MR-TEST-01",
    sessionMode: TEST_MODE ? "test" : "real",
    intervals: [],
    fidelityScores: {},
    fidelityOutcomes: {},
    notes: "",
    startedAt: null,
    completedAt: null,
    pausedTotalMs: 0,
    pauseStartedAt: null,
    pauses: [],
    continuingBehavior: false,
    studentUnobservable: false
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 3) return null;
    if ((parsed.sessionMode === "test") !== TEST_MODE) return null;
    parsed.fidelityOutcomes ||= {};
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

function hideAllViews() {
  ["login-view","assignment-view","ready-view","active-view","review-view","submitted-view"]
    .forEach((id) => { els[id].hidden = true; });
}

function roleLabel(role) {
  return role === "secondary" ? "IOA observer" : "Primary observer";
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date());
}

function showLogin() {
  stopTimer();
  hideAllViews();
  els["login-view"].hidden = false;
}

function showAssignment() {
  stopTimer();
  hideAllViews();
  els["assignment-view"].hidden = false;
  els["assignment-observer"].textContent = state.observer;
  els["assignment-role"].textContent = roleLabel(state.role);
  els["assignment-date"].textContent = todayLabel();
}

function renderPreflight() {
  els["preflight-fidelity-list"].innerHTML = FIDELITY_GROUPS.map((group) =>
    group.items.map((item) =>
      `<div class="preflight-item"><strong>${group.label.replace(" Strategies","")}</strong>${item.full}</div>`
    ).join("")
  ).join("");
}

function showReady() {
  stopTimer();
  hideAllViews();
  els["ready-view"].hidden = false;
  renderPreflight();
  els["start-observation"].textContent = TEST_MODE ? "Start 60-Second Timer Test" : "Start 30-Minute Observation";
}

function elapsedMs() {
  if (!state?.startedAt) return 0;
  const end = state.status === "paused" && state.pauseStartedAt ? state.pauseStartedAt : Date.now();
  return Math.max(0, end - state.startedAt - (state.pausedTotalMs || 0));
}

function currentIntervalIndex() {
  return Math.min(SESSION.intervalCount - 1, Math.floor(elapsedMs() / (SESSION.intervalSeconds * 1000)));
}

function automaticScoreForCurrentMode() {
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

  const fallback = automaticScoreForCurrentMode();
  for (let index = lastPromptedInterval; index < activeIndex; index += 1) {
    if (!state.intervals[index]) state.intervals[index] = fallback;
  }
  if (state.studentUnobservable) state.intervals[activeIndex] = "not_observed";
  else if (state.continuingBehavior) state.intervals[activeIndex] = "occurred";

  beep();
  lastPromptedInterval = activeIndex;
  saveState();
}

function finalizeIntervals() {
  for (let index = 0; index < SESSION.intervalCount; index += 1) {
    if (!state.intervals[index]) state.intervals[index] = automaticScoreForCurrentMode();
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
    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
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
  for (let index = 0; index < SESSION.intervalCount; index += 1) {
    const value = state.intervals[index];
    const cell = document.createElement("span");
    cell.className = "interval-cell";
    if (value) cell.classList.add(value);
    else if (index > activeIndex) cell.classList.add("future");
    if (index === activeIndex && state.status === "running") cell.classList.add("current");
    cell.title = `Interval ${index + 1}: ${value ? value.replaceAll("_", " ") : index === activeIndex ? "current" : "not yet scored"}`;
    fragment.appendChild(cell);
  }
  els["interval-grid"].appendChild(fragment);
}

function renderModeButtons() {
  const continuing = Boolean(state.continuingBehavior);
  const unobservable = Boolean(state.studentUnobservable);
  els["continuing-toggle"].setAttribute("aria-pressed", String(continuing));
  els["observable-toggle"].setAttribute("aria-pressed", String(unobservable));
  els["continuing-toggle"].querySelector("strong").textContent = continuing ? "↔ Continuing — tap when stopped" : "↔ Behavior continuing";
  els["observable-toggle"].querySelector("strong").textContent = unobservable ? "👁 Student observable again" : "👁 Not observable";
}

function intervalStatusText(index) {
  const value = state.intervals[index];
  if (state.studentUnobservable) return "Not observable is ON. Current/new intervals are excluded until you turn it off.";
  if (state.continuingBehavior) return "Behavior continuing is ON. New intervals are automatically marked as occurrences.";
  if (value === "occurred") return "Target behavior marked for this interval. Keep watching.";
  return "No target behavior marked. No action needed if it does not occur.";
}

function renderTimer() {
  const elapsedSeconds = Math.min(SESSION.durationSeconds, elapsedMs() / 1000);
  const remainingSeconds = Math.max(0, SESSION.durationSeconds - elapsedSeconds);
  const index = currentIntervalIndex();
  const intervalElapsed = elapsedSeconds % SESSION.intervalSeconds;
  const intervalRemaining = remainingSeconds <= 0 ? 0 : Math.max(0, SESSION.intervalSeconds - intervalElapsed);

  els["elapsed-clock"].textContent = formatClock(elapsedSeconds);
  els["remaining-clock"].textContent = formatClock(remainingSeconds);
  els["interval-number"].textContent = String(Math.min(index + 1, SESSION.intervalCount));
  els["interval-total"].textContent = String(SESSION.intervalCount);
  els["interval-clock"].textContent = formatClock(Math.ceil(intervalRemaining));
  els["summary-duration"].textContent = formatClock(SESSION.durationSeconds);

  if (state.status === "running") advanceIntervalsTo(index);

  const value = state.intervals[index];
  els["target-occurred"].classList.toggle("marked", value === "occurred");
  els["current-interval-status"].textContent = intervalStatusText(index);
  renderModeButtons();

  const behaviorSummary = calculateStudentBehavior(state.intervals);
  els["occurred-count"].textContent = String(behaviorSummary.occurred);
  els["not-observed-count"].textContent = String(behaviorSummary.notObserved);
  renderIntervalGrid(index);

  if (elapsedSeconds >= SESSION.durationSeconds && state.status === "running") completeObservation();
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

function renderFidelity() {
  els["fidelity-list"].innerHTML = FIDELITY_GROUPS.map((group) => {
    const rows = group.items.map((item) => {
      const score = state.fidelityScores[item.id] || "";
      const outcome = state.fidelityOutcomes[item.id] || "";
      const outcomeLabel = outcome === "yes" ? "Outcome: Yes" : outcome === "no" ? "Outcome: No" : outcome === "unclear" ? "Outcome: Not clear" : "";
      return `
        <div class="compact-row" data-fidelity-row="${item.id}">
          <div class="compact-label" title="${item.full.replaceAll('"',"&quot;")}">
            <strong>${item.short}</strong>
            <small>${item.detail}</small>
            ${outcomeLabel ? `<button type="button" class="outcome-badge" data-outcome-edit="${item.id}">${outcomeLabel}</button>` : ""}
          </div>
          <button type="button" class="fidelity-choice ${score === "implemented" ? "selected" : ""}" data-fidelity-choice="${item.id}" data-score="implemented">Implemented as Written</button>
          <button type="button" class="fidelity-choice not-implemented ${score === "not_implemented" ? "selected" : ""}" data-fidelity-choice="${item.id}" data-score="not_implemented">Not Implemented as Written</button>
        </div>
      `;
    }).join("");
    return `<section class="compact-group"><h3>${group.label}</h3>${rows}</section>`;
  }).join("");
  renderFidelityProgress();
}

function renderFidelityProgress() {
  const scored = ALL_FIDELITY_ITEMS.filter((item) => Boolean(state.fidelityScores[item.id])).length;
  els["fidelity-progress"].textContent = `${scored}/${ALL_FIDELITY_ITEMS.length}`;
}

function showOutcomePrompt(itemId) {
  const item = ITEM_BY_ID[itemId];
  if (!item) return;
  pendingOutcomeItemId = itemId;
  els["outcome-prompt-item"].textContent = item.short;
  els["outcome-prompt"].hidden = false;
}

function hideOutcomePrompt() {
  pendingOutcomeItemId = null;
  els["outcome-prompt"].hidden = true;
}

function showActive() {
  hideAllViews();
  els["active-view"].hidden = false;
  els["test-mode-badge"].hidden = !TEST_MODE;
  els["observation-notes"].value = state.notes || "";
  renderFidelity();
  hideOutcomePrompt();

  const editingCompleted = state.status === "review_edit";
  els["pause-observation"].textContent = editingCompleted ? "Back to Review" : state.status === "paused" ? "Paused" : "Pause";
  els["pause-observation"].disabled = state.status === "paused";

  [els["target-occurred"], els["continuing-toggle"], els["observable-toggle"]].forEach((button) => {
    button.disabled = editingCompleted || state.status === "paused";
  });

  if (editingCompleted) {
    renderTimer();
    els["current-interval-status"].textContent = "Student interval recording is complete and locked. Finish fidelity scoring.";
    stopTimer();
  } else if (state.status === "running") {
    lastPromptedInterval = currentIntervalIndex();
    if (state.studentUnobservable) state.intervals[lastPromptedInterval] = "not_observed";
    else if (state.continuingBehavior) state.intervals[lastPromptedInterval] = "occurred";
    saveState();
    startTimer();
  } else if (state.status === "paused") {
    renderTimer();
    stopTimer();
    setTimeout(() => {
      if (!els["pause-dialog"].open) els["pause-dialog"].showModal();
    }, 0);
  }
}

function completeObservation() {
  stopTimer();
  finalizeIntervals();
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  state.status = "review";
  state.completedAt = Date.now();
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
  return ALL_FIDELITY_ITEMS.filter((item) => !state.fidelityScores[item.id]);
}

function showReview() {
  stopTimer();
  hideAllViews();
  els["review-view"].hidden = false;

  const fidelity = calculateFidelity(state.fidelityScores);
  const student = calculateStudentBehavior(state.intervals);
  const missing = missingFidelityItems();

  els["summary-fidelity"].textContent = percentLabel(fidelity.percent);
  els["summary-fidelity-detail"].textContent = `${fidelity.implemented} implemented / ${fidelity.scoreable} scoreable; ${fidelity.noOpportunity} no opportunity`;
  els["summary-student"].textContent = percentLabel(student.percent);
  els["summary-student-detail"].textContent = `${student.occurred} occurrence intervals / ${student.observed} observed`;
  els["summary-observed"].textContent = String(student.observed);
  els["summary-not-observed"].textContent = `${student.notObserved} not observed`;
  els["summary-duration"].textContent = formatClock(SESSION.durationSeconds);

  els["review-warning"].hidden = missing.length === 0;
  els["review-warning-text"].textContent = missing.length
    ? `${missing.length} item${missing.length === 1 ? " was" : "s were"} not scored during the observation. Confirm they had no opportunity, or review the fidelity checklist individually.`
    : "";
  els["submit-preview"].disabled = missing.length > 0;

  els["review-fidelity"].innerHTML = ALL_FIDELITY_ITEMS.map((item) => {
    const score = state.fidelityScores[item.id];
    const label = score === "implemented" ? "Implemented as Written" : score === "not_implemented" ? "Not Implemented as Written" : score === "no_opportunity" ? "No Opportunity" : "Unresolved";
    const outcome = state.fidelityOutcomes[item.id];
    const outcomeLabel = outcome ? `Desired outcome: ${outcome === "yes" ? "Yes" : outcome === "no" ? "No" : "Not clear"}` : "";
    return `<div class="review-fidelity-row"><div><span>${item.short}</span>${outcomeLabel ? `<small>${outcomeLabel}</small>` : ""}</div><strong>${label}</strong></div>`;
  }).join("");
}

function showSubmitted() {
  stopTimer();
  hideAllViews();
  els["submitted-view"].hidden = false;
}

function beginObservation() {
  ensureAudio();
  state.intervals = Array(SESSION.intervalCount).fill(null);
  state.fidelityScores = {};
  state.fidelityOutcomes = {};
  state.notes = "";
  state.startedAt = Date.now();
  state.completedAt = null;
  state.pausedTotalMs = 0;
  state.pauseStartedAt = null;
  state.pauses = [];
  state.continuingBehavior = false;
  state.studentUnobservable = false;
  state.status = "running";
  lastPromptedInterval = 0;
  saveState();
  showActive();
  beep();
}

function markTargetOccurred() {
  if (state.status !== "running" || state.studentUnobservable) return;
  const index = currentIntervalIndex();
  state.intervals[index] = "occurred";
  saveState();
  renderTimer();
}

function toggleContinuing() {
  if (state.status !== "running" || state.studentUnobservable) return;
  state.continuingBehavior = !state.continuingBehavior;
  if (state.continuingBehavior) state.intervals[currentIntervalIndex()] = "occurred";
  saveState();
  renderTimer();
}

function toggleObservable() {
  if (state.status !== "running") return;
  state.studentUnobservable = !state.studentUnobservable;
  if (state.studentUnobservable) {
    state.continuingBehavior = false;
    state.intervals[currentIntervalIndex()] = "not_observed";
  }
  saveState();
  renderTimer();
}

function scoreFidelity(itemId, score) {
  if (!ITEM_BY_ID[itemId]) return;
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

function markRemainingNoOpportunity() {
  for (const item of missingFidelityItems()) state.fidelityScores[item.id] = "no_opportunity";
  saveState();
  showReview();
}

function pauseObservation() {
  if (state.status === "review_edit") {
    state.status = "review";
    saveState();
    showReview();
    return;
  }
  if (state.status !== "running") return;
  state.status = "paused";
  state.pauseStartedAt = Date.now();
  saveState();
  showActive();
}

function resumeObservation(reason = null) {
  if (state.status !== "paused" || !state.pauseStartedAt) return;
  const now = Date.now();
  const durationMs = now - state.pauseStartedAt;
  state.pausedTotalMs = (state.pausedTotalMs || 0) + durationMs;
  if (reason) state.pauses.push({ reason, startedAt: state.pauseStartedAt, durationMs });
  state.pauseStartedAt = null;
  state.status = "running";
  saveState();
  if (els["pause-dialog"].open) els["pause-dialog"].close();
  showActive();
}

function restore() {
  if (!state) return showLogin();
  switch (state.status) {
    case "assignment": showAssignment(); break;
    case "ready": showReady(); break;
    case "running":
      if (elapsedMs() >= SESSION.durationSeconds * 1000) completeObservation();
      else showActive();
      break;
    case "paused": showActive(); break;
    case "review": showReview(); break;
    case "review_edit": showActive(); break;
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
els["preview-sign-out"].addEventListener("click", () => { clearState(); showLogin(); });
els["open-ready"].addEventListener("click", () => { state.status = "ready"; saveState(); showReady(); });
els["back-assignment"].addEventListener("click", () => { state.status = "assignment"; saveState(); showAssignment(); });
els["start-observation"].addEventListener("click", beginObservation);
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

els["pause-observation"].addEventListener("click", pauseObservation);
els["pause-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  const reason = els["pause-reason"].value;
  if (!reason) return;
  els["pause-reason"].value = "";
  resumeObservation(reason);
});
els["cancel-pause"].addEventListener("click", () => { els["pause-reason"].value = ""; resumeObservation(null); });
els["pause-dialog"].addEventListener("cancel", (event) => { event.preventDefault(); resumeObservation(null); });

els["mark-remaining-no-opportunity"].addEventListener("click", markRemainingNoOpportunity);
els["return-fidelity"].addEventListener("click", () => { state.status = "review_edit"; saveState(); showActive(); });
els["submit-preview"].addEventListener("click", () => {
  if (missingFidelityItems().length) return;
  state.status = "submitted";
  state.submittedAt = Date.now();
  saveState();
  showSubmitted();
});
els["reset-preview"].addEventListener("click", () => { clearState(); window.location.reload(); });
window.addEventListener("beforeunload", saveState);

restore();
