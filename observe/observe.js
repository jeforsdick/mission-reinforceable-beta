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
const STORAGE_KEY = "mr-observe-preview-v1";

const FIDELITY_GROUPS = [
  {
    label: "Prevent Strategies",
    items: [
      {
        id: "prevent_01",
        text: "Prior to independent math, pre-correct the student by verbally stating task expectations and available support options (for example, remind the student that a break card or help request is available)."
      },
      {
        id: "prevent_02",
        text: "Provide a modified task or reduce the number of problems presented during independent work to match the student’s current skill level."
      },
      {
        id: "prevent_03",
        text: "Deliver noncontingent attention or a brief positive interaction within the first 2 minutes of the independent-work period before problem behavior can occur."
      }
    ]
  },
  {
    label: "Teach Strategies",
    items: [
      {
        id: "teach_01",
        text: "When the student begins to show early signs of frustration, prompt the student to use the break request card by pointing to it or verbally cueing its use."
      },
      {
        id: "teach_02",
        text: "Explicitly model and practice the break-request procedure at the start of the observation session, with at least one brief practice trial before independent work begins."
      },
      {
        id: "teach_03",
        text: "Provide specific behavior-contingent acknowledgment within 5 seconds when the student uses the replacement behavior."
      }
    ]
  },
  {
    label: "Reinforce Strategies",
    items: [
      {
        id: "reinforce_01",
        text: "Honor appropriate break or help requests within 5 seconds and provide a 2-minute break before returning the student to the task."
      },
      {
        id: "reinforce_02",
        text: "Following work refusal, withhold escape from the task and redirect the student using a neutral tone without extended verbal engagement or removal of materials."
      },
      {
        id: "reinforce_03",
        text: "Deliver specific praise contingent on task engagement or task completion at least 3 times during the 30-minute observation."
      }
    ]
  }
];

const ALL_FIDELITY_ITEMS = FIDELITY_GROUPS.flatMap((group) => group.items);
const els = Object.fromEntries(
  [
    "login-view","assignment-view","ready-view","active-view","review-view","submitted-view",
    "preview-login-form","preview-sign-out","assignment-observer","assignment-role","assignment-date",
    "open-ready","back-assignment","start-observation","elapsed-clock","remaining-clock",
    "interval-number","interval-total","interval-clock","pause-observation","test-mode-badge",
    "behavior-tab","fidelity-tab","fidelity-progress","behavior-panel","fidelity-panel",
    "current-interval-status","occurred-count","not-observed-count","interval-grid","fidelity-list",
    "observation-notes","summary-fidelity","summary-fidelity-detail","summary-student",
    "summary-student-detail","summary-observed","summary-not-observed","summary-duration",
    "review-warning","review-fidelity","return-fidelity","submit-preview","reset-preview",
    "pause-dialog","pause-form","pause-reason","cancel-pause"
  ].map((id) => [id, document.getElementById(id)])
);

let state = loadState();
let timerHandle = null;
let lastPromptedInterval = -1;
let audioContext = null;

function newBaseState(observer, role) {
  return {
    version: 1,
    observer: observer.trim() || "Test Observer",
    role,
    status: "assignment",
    caseCode: "MR-TEST-01",
    sessionMode: TEST_MODE ? "test" : "real",
    intervals: [],
    fidelityScores: {},
    fidelityNotes: {},
    notes: "",
    startedAt: null,
    completedAt: null,
    pausedTotalMs: 0,
    pauseStartedAt: null,
    pauses: []
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 1) return null;
    if ((parsed.sessionMode === "test") !== TEST_MODE) return null;
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

function showReady() {
  stopTimer();
  hideAllViews();
  els["ready-view"].hidden = false;
  const button = els["start-observation"];
  button.textContent = TEST_MODE ? "Start 60-Second Timer Test" : "Start 30-Minute Observation";
}

function elapsedMs() {
  if (!state?.startedAt) return 0;
  const end = state.status === "paused" && state.pauseStartedAt ? state.pauseStartedAt : Date.now();
  return Math.max(0, end - state.startedAt - (state.pausedTotalMs || 0));
}

function currentIntervalIndex() {
  return Math.min(
    SESSION.intervalCount - 1,
    Math.floor(elapsedMs() / (SESSION.intervalSeconds * 1000))
  );
}

function ensurePassedIntervalsScored(activeIndex) {
  let changed = false;
  for (let index = 0; index < activeIndex; index += 1) {
    if (!state.intervals[index]) {
      state.intervals[index] = "did_not_occur";
      changed = true;
    }
  }
  if (changed) saveState();
}

function finalizeIntervals() {
  for (let index = 0; index < SESSION.intervalCount; index += 1) {
    if (!state.intervals[index]) state.intervals[index] = "did_not_occur";
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
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
    if (navigator.vibrate) navigator.vibrate(40);
  } catch {
    // Audio/vibration is a convenience cue only.
  }
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
    cell.title = `Interval ${index + 1}: ${value ? value.replaceAll("_", " ") : index === activeIndex ? "current" : "not yet scored"}`;
    fragment.appendChild(cell);
  });
  els["interval-grid"].appendChild(fragment);
}

function setSelectedBehavior(score) {
  document.querySelectorAll("[data-interval-score]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.intervalScore === score);
  });
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

  if (state.status === "running") {
    ensurePassedIntervalsScored(index);
    if (index > lastPromptedInterval) {
      if (lastPromptedInterval >= 0) beep();
      lastPromptedInterval = index;
    }
  }

  const behavior = state.intervals[index];
  setSelectedBehavior(behavior);
  els["current-interval-status"].textContent = behavior
    ? `Current interval: ${behavior === "occurred" ? "Target occurred" : behavior === "not_observed" ? "Not observed" : "Did not occur"}.`
    : "No mark yet — this interval will default to Did Not Occur.";

  const behaviorSummary = calculateStudentBehavior(state.intervals);
  els["occurred-count"].textContent = String(behaviorSummary.occurred);
  els["not-observed-count"].textContent = String(behaviorSummary.notObserved);
  renderIntervalGrid(index);

  if (elapsedSeconds >= SESSION.durationSeconds && state.status === "running") {
    completeObservation();
  }
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
  els["fidelity-list"].innerHTML = "";
  for (const group of FIDELITY_GROUPS) {
    const section = document.createElement("section");
    section.className = "fidelity-group";
    section.innerHTML = `<h3>${group.label}</h3>`;

    for (const item of group.items) {
      const card = document.createElement("article");
      card.className = "fidelity-item";
      const current = state.fidelityScores[item.id] || "";
      const note = state.fidelityNotes[item.id] || "";
      card.innerHTML = `
        <p>${item.text}</p>
        <div class="score-options" role="radiogroup" aria-label="${group.label}: ${item.text}">
          <label class="score-option"><input type="radio" name="fidelity-${item.id}" value="implemented" data-fidelity-id="${item.id}" ${current === "implemented" ? "checked" : ""}><span>Implemented as Written</span></label>
          <label class="score-option"><input type="radio" name="fidelity-${item.id}" value="not_implemented" data-fidelity-id="${item.id}" ${current === "not_implemented" ? "checked" : ""}><span>Not Implemented as Written</span></label>
          <label class="score-option"><input type="radio" name="fidelity-${item.id}" value="no_opportunity" data-fidelity-id="${item.id}" ${current === "no_opportunity" ? "checked" : ""}><span>No Opportunity</span></label>
        </div>
        <details class="item-note">
          <summary>Add outcome/context note</summary>
          <input type="text" data-fidelity-note="${item.id}" value="${escapeAttribute(note)}" placeholder="Optional note about outcome or context">
        </details>
      `;
      section.appendChild(card);
    }
    els["fidelity-list"].appendChild(section);
  }
  renderFidelityProgress();
}

function escapeAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderFidelityProgress() {
  const scored = ALL_FIDELITY_ITEMS.filter((item) => Boolean(state.fidelityScores[item.id])).length;
  els["fidelity-progress"].textContent = `${scored}/${ALL_FIDELITY_ITEMS.length}`;
}

function selectTab(panelId) {
  const fidelity = panelId === "fidelity-panel";
  els["behavior-panel"].hidden = fidelity;
  els["fidelity-panel"].hidden = !fidelity;
  els["behavior-tab"].classList.toggle("active", !fidelity);
  els["fidelity-tab"].classList.toggle("active", fidelity);
  els["behavior-tab"].setAttribute("aria-selected", String(!fidelity));
  els["fidelity-tab"].setAttribute("aria-selected", String(fidelity));
}

function showActive(preferredPanel = "behavior-panel") {
  hideAllViews();
  els["active-view"].hidden = false;
  els["test-mode-badge"].hidden = !TEST_MODE;
  els["observation-notes"].value = state.notes || "";
  renderFidelity();
  selectTab(preferredPanel);

  const editingCompleted = state.status === "review_edit";
  els["pause-observation"].textContent = editingCompleted ? "Back to Review" : state.status === "paused" ? "Paused" : "Pause";
  els["pause-observation"].disabled = state.status === "paused";
  document.querySelectorAll("[data-interval-score]").forEach((button) => {
    button.disabled = editingCompleted;
  });

  if (editingCompleted) {
    renderTimer();
    stopTimer();
  } else if (state.status === "running") {
    lastPromptedInterval = currentIntervalIndex();
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
  state.status = "review";
  state.completedAt = Date.now();
  saveState();
  showReview();
}

function percentLabel(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function showReview() {
  stopTimer();
  hideAllViews();
  els["review-view"].hidden = false;

  const fidelity = calculateFidelity(state.fidelityScores);
  const student = calculateStudentBehavior(state.intervals);
  const missing = ALL_FIDELITY_ITEMS.filter((item) => !state.fidelityScores[item.id]);

  els["summary-fidelity"].textContent = percentLabel(fidelity.percent);
  els["summary-fidelity-detail"].textContent = `${fidelity.implemented} implemented / ${fidelity.scoreable} scoreable; ${fidelity.noOpportunity} no opportunity`;
  els["summary-student"].textContent = percentLabel(student.percent);
  els["summary-student-detail"].textContent = `${student.occurred} occurrence intervals / ${student.observed} observed`;
  els["summary-observed"].textContent = String(student.observed);
  els["summary-not-observed"].textContent = `${student.notObserved} not observed`;
  els["summary-duration"].textContent = formatClock(SESSION.durationSeconds);

  els["review-warning"].hidden = missing.length === 0;
  els["review-warning"].textContent = missing.length
    ? `Complete ${missing.length} remaining fidelity item${missing.length === 1 ? "" : "s"} before submitting.`
    : "";
  els["submit-preview"].disabled = missing.length > 0;

  els["review-fidelity"].innerHTML = ALL_FIDELITY_ITEMS.map((item) => {
    const score = state.fidelityScores[item.id];
    const label = score === "implemented"
      ? "Implemented as Written"
      : score === "not_implemented"
        ? "Not Implemented as Written"
        : score === "no_opportunity"
          ? "No Opportunity"
          : "Not scored";
    return `<div class="review-fidelity-row"><span>${item.text}</span><strong>${label}</strong></div>`;
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
  state.fidelityNotes = {};
  state.notes = "";
  state.startedAt = Date.now();
  state.completedAt = null;
  state.pausedTotalMs = 0;
  state.pauseStartedAt = null;
  state.pauses = [];
  state.status = "running";
  saveState();
  showActive("behavior-panel");
  beep();
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
  showActive(document.querySelector("#fidelity-tab.active") ? "fidelity-panel" : "behavior-panel");
}

function resumeObservation(reason = null) {
  if (state.status !== "paused" || !state.pauseStartedAt) return;
  const now = Date.now();
  const durationMs = now - state.pauseStartedAt;
  state.pausedTotalMs = (state.pausedTotalMs || 0) + durationMs;
  if (reason) {
    state.pauses.push({ reason, startedAt: state.pauseStartedAt, durationMs });
  }
  state.pauseStartedAt = null;
  state.status = "running";
  saveState();
  if (els["pause-dialog"].open) els["pause-dialog"].close();
  showActive(document.querySelector("#fidelity-tab.active") ? "fidelity-panel" : "behavior-panel");
}

function restore() {
  if (!state) {
    showLogin();
    return;
  }
  switch (state.status) {
    case "assignment": showAssignment(); break;
    case "ready": showReady(); break;
    case "running":
      if (elapsedMs() >= SESSION.durationSeconds * 1000) completeObservation();
      else showActive("behavior-panel");
      break;
    case "paused": showActive("behavior-panel"); break;
    case "review": showReview(); break;
    case "review_edit": showActive("fidelity-panel"); break;
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

els["open-ready"].addEventListener("click", () => {
  state.status = "ready";
  saveState();
  showReady();
});

els["back-assignment"].addEventListener("click", () => {
  state.status = "assignment";
  saveState();
  showAssignment();
});

els["start-observation"].addEventListener("click", beginObservation);

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.panel));
});

document.querySelectorAll("[data-interval-score]").forEach((button) => {
  button.addEventListener("click", () => {
    if (state.status !== "running") return;
    const index = currentIntervalIndex();
    state.intervals[index] = button.dataset.intervalScore;
    saveState();
    renderTimer();
  });
});

els["fidelity-list"].addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-fidelity-id]")) {
    state.fidelityScores[target.dataset.fidelityId] = target.value;
    saveState();
    renderFidelityProgress();
  }
});

els["fidelity-list"].addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-fidelity-note]")) {
    state.fidelityNotes[target.dataset.fidelityNote] = target.value;
    saveState();
  }
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

els["cancel-pause"].addEventListener("click", () => {
  els["pause-reason"].value = "";
  resumeObservation(null);
});

els["pause-dialog"].addEventListener("cancel", (event) => {
  event.preventDefault();
  resumeObservation(null);
});

els["return-fidelity"].addEventListener("click", () => {
  state.status = "review_edit";
  saveState();
  showActive("fidelity-panel");
});

els["submit-preview"].addEventListener("click", () => {
  const fidelity = calculateFidelity(state.fidelityScores);
  if (fidelity.scoreable + fidelity.noOpportunity < ALL_FIDELITY_ITEMS.length) return;
  state.status = "submitted";
  state.submittedAt = Date.now();
  saveState();
  showSubmitted();
});

els["reset-preview"].addEventListener("click", () => {
  clearState();
  window.location.reload();
});

window.addEventListener("beforeunload", saveState);

restore();
