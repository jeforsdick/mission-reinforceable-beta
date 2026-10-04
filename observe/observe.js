import {
  calculateFidelity,
  calculateStudentBehavior,
  calculateIntervalIOA,
  formatClock
} from "./observation-model.mjs";
import {
  TRAINING_CASES,
  getTrainingCase,
  intervalCountForDuration
} from "./training-cases.mjs";

const INTERVAL_SECONDS = 15;
const STORAGE_KEY = "mr-observer-training-module-v5";
const SUPABASE_URL = "https://vyiwwwmcoahwkgiictmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mp2ASOgrx0Yx8Bp-Fz3AAg_V5Gl0I4W";
const SOURCE_ENVIRONMENT = location.hostname === "missionreinforceable.com" || location.hostname === "www.missionreinforceable.com" ? "production" : "preview";
let trainingDb = null;

const ids = [
  "login-view","module-view","instruction-view","walkthrough-view","ready-view","active-view","review-view","results-view",
  "feedback-view","questions-view","complete-view","preview-login-form","preview-sign-out","module-welcome",
  "module-steps","complete-instruction","walkthrough-cards","walkthrough-test-sound","complete-walkthrough","ready-part-label","ready-case-title","ready-case-source","ready-duration",
  "case-purpose","ready-routine","ready-behavior-name","ready-behavior-definition","ready-replacement","ready-hypothesis",
  "behavior-examples-list","behavior-nonexamples-list",
  "bip-prevent","bip-teach","bip-reinforce","bip-respond","preflight-fidelity-list","start-observation",
  "active-behavior-name","active-behavior-definition","active-case-chip","video-loading","elapsed-clock","interval-number",
  "interval-total","interval-clock","target-occurred","continuing-toggle","observable-toggle","current-interval-status",
  "occurred-count","not-observed-count","interval-grid","fidelity-progress","fidelity-list","outcome-prompt",
  "outcome-prompt-item","outcome-prompt-definition","observation-notes","summary-fidelity","summary-fidelity-detail",
  "summary-student","summary-student-detail","summary-observed","summary-not-observed","summary-duration",
  "summary-case-name","review-warning","review-warning-text","mark-remaining-no-opportunity","review-fidelity","review-back-home",
  "submit-attempt","results-eyebrow","results-title","results-copy","training-fidelity-agreement",
  "training-fidelity-agreement-detail","training-interval-agreement","practice-feedback-key","answer-key-list",
  "continue-after-results","repeat-case","feedback-form","questions-form","complete-title","completion-summary","test-sound",
  "attempt-storage-message","feedback-storage-message","questions-storage-message"
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
let ignoreEndedUntilPlaying = false;

function blankModuleState(observer) {
  return {
    version: 5,
    observer,
    screen: "module",
    module: {
      instructionComplete: false,
      walkthroughComplete: false,
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

function submissionId(existing) {
  if (existing) return existing;
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function getTrainingDb() {
  if (trainingDb) return trainingDb;
  if (!window.supabase) throw new Error("The secure training database did not load.");
  trainingDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return trainingDb;
}

async function insertTrainingRecord(table, payload) {
  const client = getTrainingDb();
  const { error } = await client.from(table).insert(payload);
  if (error && error.code !== "23505") throw error;
}

async function syncCachedAttempts() {
  if (!state?.attempts) return;
  for (const caseId of ["nora", "kai"]) {
    const attempt = state.attempts[caseId];
    const caseData = TRAINING_CASES[caseId];
    if (!attempt || attempt.remoteSaved || attempt.status !== "submitted") continue;
    try {
      attempt.clientSubmissionId = submissionId(attempt.clientSubmissionId);
      attempt.submittedAt ||= new Date().toISOString();
      const agreement = fidelityAgreementFor(attempt, caseData);
      await insertTrainingRecord("observer_training_attempts", {
        client_submission_id: attempt.clientSubmissionId,
        observer_name: state.observer,
        case_id: caseId,
        attempt_type: attempt.attemptType || (caseId === "nora" ? "practice" : "qualification"),
        module_version: "v5",
        case_version: 1,
        started_at: attempt.startedAt || null,
        submitted_at: attempt.submittedAt,
        video_duration_seconds: caseData.videoDurationSeconds,
        interval_seconds: INTERVAL_SECONDS,
        intervals: attempt.intervals || [],
        fidelity_scores: attempt.fidelityScores || {},
        fidelity_outcomes: attempt.fidelityOutcomes || {},
        notes: attempt.notes || null,
        teacher_fidelity_agreement: roundedPercent(agreement?.percent),
        desired_outcome_agreement: roundedPercent(agreement?.outcomePercent),
        student_behavior_agreement: null,
        qualified: null,
        source_environment: SOURCE_ENVIRONMENT
      });
      attempt.remoteSaved = true;
      saveState();
    } catch {
      // Keep the local recovery copy and try again the next time the module opens.
    }
  }
}

function setStorageMessage(id, message, isError = false) {
  const el = els[id];
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function roundedPercent(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function clearState() {
  state = null;
  localStorage.removeItem(STORAGE_KEY);
}

function hideAllViews() {
  [
    "login-view","module-view","instruction-view","walkthrough-view","ready-view","active-view","review-view",
    "results-view","feedback-view","questions-view","complete-view"
  ].forEach((id) => { els[id].hidden = true; });
}

function resetScrollPosition() {
  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));
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
  resetScrollPosition();
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

function studentAgreementFor(attempt, caseData) {
  if (!attempt || !caseData?.masterIntervals) return null;
  return calculateIntervalIOA(caseData.masterIntervals, attempt.intervals || []);
}

function trainingQualified(attempt, caseData) {
  const fidelity = fidelityAgreementFor(attempt, caseData);
  const student = studentAgreementFor(attempt, caseData);
  if (!fidelity || !student || fidelity.percent == null || student.percent == null) return null;
  return fidelity.percent >= 90 && student.percent >= 90;
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

function resumableAttempt(caseId) {
  const attempt = state?.currentAttempt;
  return Boolean(
    attempt &&
    attempt.caseId === caseId &&
    ["armed","running","review"].includes(attempt.status)
  );
}

function resumeAttempt(caseId) {
  const attempt = state?.currentAttempt;
  if (!attempt || attempt.caseId !== caseId) return openCaseReady(caseId);
  state.currentCaseId = caseId;
  if (attempt.status === "review") showReview();
  else showActive();
}

function renderModuleSteps() {
  const m = state.module;
  const noraAgreement = fidelityAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  const noraStudentAgreement = studentAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  const noraDetail = state.attempts.nora
    ? `Fidelity agreement: <strong>${percentLabel(noraAgreement?.percent)}</strong> · Student interval agreement: <strong>${percentLabel(noraStudentAgreement?.percent)}</strong>`
    : "";
  const kaiDetail = state.attempts.kai
    ? "Qualification submitted. Agreement is held for team review."
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
      title:"Meet the data collection screen",
      description:"Take a quick guided tour of the timer, student behavior button, fidelity controls, and end-of-session review.",
      done:Boolean(m.walkthroughComplete),
      locked:!m.instructionComplete,
      buttonLabel:m.walkthroughComplete ? "Review Tour" : "Take Screen Tour",
      action:"walkthrough"
    }),
    stepCard({
      number:3,
      title:"Nora guided practice",
      description:"Review a fictional BIP, collect both measures during the Nora clip, then compare your fidelity scoring with the training key.",
      done:Boolean(m.noraCompleted),
      locked:!m.walkthroughComplete,
      buttonLabel:m.noraCompleted ? "Review Results" : (resumableAttempt("nora") ? (state.currentAttempt.status === "review" ? "Resume Review" : "Resume Nora") : "Practice with Nora"),
      action:m.noraCompleted ? "nora-results" : (resumableAttempt("nora") ? "nora-resume" : "nora-ready"),
      detail:noraDetail
    }),
    stepCard({
      number:4,
      title:"Tell us what needs fixing",
      description:"Rate how manageable the form felt and tell Jess exactly what should change before live classroom observations.",
      done:Boolean(m.noraFeedbackComplete),
      locked:!m.noraCompleted,
      buttonLabel:m.noraFeedbackComplete ? "Review Feedback" : "Give Feedback",
      action:"feedback"
    }),
    stepCard({
      number:5,
      title:"Kai independent qualification",
      description:"Complete the second case independently. No answer-key coaching is shown while you collect.",
      done:Boolean(m.kaiCompleted),
      locked:!m.noraFeedbackComplete,
      buttonLabel:m.kaiCompleted ? "Review Results" : (resumableAttempt("kai") ? (state.currentAttempt.status === "review" ? "Resume Review" : "Resume Kai") : "Start Qualification"),
      action:m.kaiCompleted ? "kai-results" : (resumableAttempt("kai") ? "kai-resume" : "kai-ready"),
      detail:kaiDetail
    }),
    stepCard({
      number:6,
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
  els["module-welcome"].textContent = `Hi ${state.observer}. Complete the training at your own pace—you can stop and come back later.`;
  renderModuleSteps();
  resetScrollPosition();
}

function showInstruction() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  state.screen = "instruction";
  saveState();
  els["instruction-view"].hidden = false;
  resetScrollPosition();
}

function activateTourStep(step) {
  document.querySelectorAll("[data-tour-step]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.tourStep) === Number(step));
  });
  document.querySelectorAll("[data-tour-target]").forEach((target) => {
    target.classList.toggle("active", Number(target.dataset.tourTarget) === Number(step));
  });
}

function showWalkthrough() {
  stopTimer();
  pausePlayer();
  hideAllViews();
  state.screen = "walkthrough";
  saveState();
  els["walkthrough-view"].hidden = false;
  activateTourStep(0);
  resetScrollPosition();
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
  els["behavior-examples-list"].innerHTML = caseData.behaviorExamples
    .map((example) => `<li>${example}</li>`)
    .join("");
  els["behavior-nonexamples-list"].innerHTML = caseData.behaviorNonExamples
    .map((example) => `<li>${example}</li>`)
    .join("");
  els["bip-prevent"].textContent = caseData.bip.prevent;
  els["bip-teach"].textContent = caseData.bip.teach;
  els["bip-reinforce"].textContent = caseData.bip.reinforce;
  els["bip-respond"].textContent = caseData.bip.respond;
  els["preflight-fidelity-list"].innerHTML = caseData.fidelityTargets.map((item, index) => `
    <div class="preflight-item">
      <span>${item.area}</span>
      <strong>${index + 1}. ${item.short}</strong>
      <p class="preflight-definition">${item.detail}</p>
      <div class="preflight-example counts">
        <b>✓ Counts</b>
        <span>${item.example}</span>
      </div>
      <div class="preflight-example does-not-count">
        <b>✕ Does not count</b>
        <span>${item.nonExample}</span>
      </div>
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
  resetScrollPosition();
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
        try { player.stopVideo(); } catch {}
        player.cueVideoById({ videoId: caseData.videoId, startSeconds: 0 });
        try { player.seekTo(0, true); } catch {}
        playerCaseId = caseData.id;
      } else {
        player.seekTo(attempt.videoTime, true);
      }
      videoIsPlaying = false;
      els["video-loading"].hidden = true;
      renderTimer();
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
            ignoreEndedUntilPlaying = false;
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
            if (!ignoreEndedUntilPlaying && state.currentAttempt.status === "running") {
              completeObservation();
            }
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

function configurePlaybackAudioSession() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== "playback") {
      navigator.audioSession.type = "playback";
    }
  } catch {}
}

async function ensureAudio() {
  configurePlaybackAudioSession();
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
  if (audioContext && audioContext.state !== "running") {
    try { await audioContext.resume(); } catch {}
  }
  return audioContext;
}

async function beep() {
  try {
    const ctx = await ensureAudio();
    if (!ctx || ctx.state !== "running") return false;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    gain.connect(ctx.destination);

    const first = ctx.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(740, now);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.10);

    const second = ctx.createOscillator();
    second.type = "sine";
    second.frequency.setValueAtTime(880, now + 0.11);
    second.connect(gain);
    second.start(now + 0.11);
    second.stop(now + 0.22);
    return true;
  } catch {
    return false;
  }
}

async function testCue(button) {
  const original = button.textContent;
  const played = await beep();
  button.textContent = played ? "✓ Cue played" : "Audio unavailable";
  window.setTimeout(() => { button.textContent = original; }, 1400);
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
  ignoreEndedUntilPlaying = true;
  videoIsPlaying = false;
  stopTimer();
  try {
    if (playerReady && player) {
      player.stopVideo();
      player.cueVideoById({ videoId: caseData.videoId, startSeconds: 0 });
      player.seekTo(0, true);
      playerCaseId = caseData.id;
    }
  } catch {}
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
  resetScrollPosition();
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
      <small>Did it have the desired outcome?</small>
      <div class="review-score-actions">
        <button class="review-score-button ${outcome === "yes" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="yes">Yes</button>
        <button class="review-score-button ${outcome === "no" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="no">No</button>
        <button class="review-score-button ${outcome === "unclear" ? "selected" : ""}" type="button" data-review-outcome="${item.id}" data-outcome="unclear">Not clear</button>
      </div>
    </div>
  ` : "";

  const needsOutcome = score === "implemented" && !outcome;
  return `
    <div class="review-fidelity-row ${needsOutcome ? "needs-outcome" : ""}">
      <div>
        <strong>${index + 1}. ${item.short}</strong>
        <small>${item.detail}</small>
        ${needsOutcome ? '<span class="review-needs-outcome">Finish desired-outcome rating</span>' : ""}
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
  resetScrollPosition();
}

function markRemainingNoOpportunity() {
  const attempt = currentAttempt();
  for (const item of missingFidelityItems()) attempt.fidelityScores[item.id] = "no_opportunity";
  saveState();
  showReview();
}

async function submitAttempt() {
  const attempt = currentAttempt();
  const caseData = currentCase();
  if (!attempt || !caseData || missingFidelityItems().length || missingOutcomeItems().length) return;

  const button = els["submit-attempt"];
  button.disabled = true;
  setStorageMessage("attempt-storage-message", "Saving training attempt…");

  try {
    attempt.clientSubmissionId = submissionId(attempt.clientSubmissionId);
    attempt.submittedAt ||= new Date().toISOString();

    const agreement = fidelityAgreementFor(attempt, caseData);
    const studentAgreement = studentAgreementFor(attempt, caseData);
    const qualified = trainingQualified(attempt, caseData);
    await insertTrainingRecord("observer_training_attempts", {
      client_submission_id: attempt.clientSubmissionId,
      observer_name: state.observer,
      case_id: caseData.id,
      attempt_type: attempt.attemptType,
      module_version: "v5",
      case_version: 1,
      started_at: attempt.startedAt,
      submitted_at: attempt.submittedAt,
      video_duration_seconds: caseData.videoDurationSeconds,
      interval_seconds: INTERVAL_SECONDS,
      intervals: attempt.intervals,
      fidelity_scores: attempt.fidelityScores,
      fidelity_outcomes: attempt.fidelityOutcomes,
      notes: attempt.notes || null,
      teacher_fidelity_agreement: roundedPercent(agreement?.percent),
      desired_outcome_agreement: roundedPercent(agreement?.outcomePercent),
      student_behavior_agreement: roundedPercent(studentAgreement?.percent),
      qualified,
      source_environment: SOURCE_ENVIRONMENT
    });

    attempt.remoteSaved = true;
    attempt.status = "submitted";
    state.attempts[caseData.id] = JSON.parse(JSON.stringify(attempt));
    if (caseData.id === "nora") state.module.noraCompleted = qualified === true;
    if (caseData.id === "kai") state.module.kaiCompleted = true;
    state.screen = "results";
    saveState();
    showResults(caseData.id);
  } catch (error) {
    console.error("Training attempt save failed", error);
    setStorageMessage("attempt-storage-message", "We couldn’t save this submission. Your work is still saved on this device—please try Submit again.", true);
    button.disabled = false;
  }
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
  const studentAgreement = studentAgreementFor(attempt, caseData);
  const qualified = trainingQualified(attempt, caseData);
  const isNora = caseId === "nora";

  els["results-eyebrow"].textContent = isNora ? "Nora guided practice" : "Kai independent qualification";
  els["results-title"].textContent = `${caseData.name} Results`;
  els["results-copy"].textContent = isNora
    ? (qualified
        ? "Nora practice passed. Your student intervals were compared with Jess’s reference coding, and your fidelity scoring was compared with the training key."
        : "Nora practice needs another attempt. Reach at least 90% agreement on both student intervals and fidelity scoring before moving on. The goal is 100%.")
    : "Kai is your independent qualification attempt. Your responses were saved and will be reviewed after the observer team completes training.";

  if (isNora) {
    els["training-fidelity-agreement"].textContent = percentLabel(agreement.percent);
    const outcomeDetail = agreement.outcomeTotal
      ? ` Desired-outcome agreement: ${agreement.outcomeAgreements}/${agreement.outcomeTotal} (${percentLabel(agreement.outcomePercent)}).`
      : "";
    els["training-fidelity-agreement-detail"].textContent =
      `${agreement.agreements}/${agreement.total} fidelity scores matched the training key.${outcomeDetail}`;
    els["training-interval-agreement"].textContent = studentAgreement ? percentLabel(studentAgreement.percent) : "Not scored yet";
  } else {
    els["training-fidelity-agreement"].textContent = "Pending team review";
    els["training-fidelity-agreement-detail"].textContent = "Your fidelity responses were saved. Agreement will be reviewed after all observers complete training.";
    els["training-interval-agreement"].textContent = "Pending team review";
  }
  els["practice-feedback-key"].hidden = !isNora;
  if (isNora) {
    els["answer-key-list"].innerHTML = caseData.fidelityTargets.map((item) => answerKeyRow(item, attempt)).join("");
    els["continue-after-results"].textContent = qualified
      ? (state.module.noraFeedbackComplete ? "Return to Module" : "Give Feedback on the Form")
      : "Return to Module";
    els["repeat-case"].textContent = qualified ? "Practice Nora Again" : "Repeat Nora Practice";
  } else {
    els["continue-after-results"].textContent = state.module.questionsComplete ? "Return to Module" : "Submit Questions for the Team Meeting";
    els["repeat-case"].textContent = "Repeat Kai Attempt";
  }
  resetScrollPosition();
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
  resetScrollPosition();
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const feedback = {
    clientSubmissionId: submissionId(state.feedback.nora?.clientSubmissionId),
    manageability: Number(data.get("manageability")),
    fidelity_ease: Number(data.get("fidelity_ease")),
    behavior_ease: Number(data.get("behavior_ease")),
    cue_helpfulness: Number(data.get("cue_helpfulness")),
    could_not_enter: data.get("could_not_enter") === "yes",
    hard_definitions: String(data.get("hard_definitions") || "").trim(),
    first_change: String(data.get("first_change") || "").trim(),
    questions: String(data.get("questions") || "").trim(),
    submittedAt: new Date().toISOString()
  };

  button.disabled = true;
  setStorageMessage("feedback-storage-message", "Saving feedback…");
  state.feedback.nora = feedback;
  saveState();

  try {
    await insertTrainingRecord("observer_training_feedback", {
      client_submission_id: feedback.clientSubmissionId,
      observer_name: state.observer,
      case_id: "nora",
      manageability: feedback.manageability,
      fidelity_ease: feedback.fidelity_ease,
      behavior_ease: feedback.behavior_ease,
      cue_helpfulness: feedback.cue_helpfulness,
      could_not_enter: feedback.could_not_enter,
      hard_definitions: feedback.hard_definitions || null,
      first_change: feedback.first_change || null,
      questions: feedback.questions || null,
      submitted_at: feedback.submittedAt,
      source_environment: SOURCE_ENVIRONMENT
    });
    feedback.remoteSaved = true;
    state.module.noraFeedbackComplete = true;
    saveState();
    openCaseReady("kai");
  } catch (error) {
    setStorageMessage("feedback-storage-message", "We couldn’t save your feedback. Your answers are still saved on this device—please try again.", true);
    button.disabled = false;
  }
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
  resetScrollPosition();
}

async function submitQuestions(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const questions = {
    clientSubmissionId: submissionId(state.questions?.clientSubmissionId),
    scoring_questions: String(data.get("scoring_questions") || "").trim(),
    practice_requests: String(data.get("practice_requests") || "").trim(),
    other_notes: String(data.get("other_notes") || "").trim(),
    submittedAt: new Date().toISOString()
  };

  button.disabled = true;
  setStorageMessage("questions-storage-message", "Saving questions…");
  state.questions = questions;
  saveState();

  try {
    await insertTrainingRecord("observer_training_questions", {
      client_submission_id: questions.clientSubmissionId,
      observer_name: state.observer,
      scoring_questions: questions.scoring_questions || null,
      practice_requests: questions.practice_requests || null,
      other_notes: questions.other_notes || null,
      submitted_at: questions.submittedAt,
      source_environment: SOURCE_ENVIRONMENT
    });
    questions.remoteSaved = true;
    state.module.questionsComplete = true;
    state.module.completedAt = new Date().toISOString();
    saveState();
    showComplete();
  } catch (error) {
    setStorageMessage("questions-storage-message", "We couldn’t save your questions. Your answers are still saved on this device—please try again.", true);
    button.disabled = false;
  }
}

function showComplete() {
  hideAllViews();
  state.screen = "complete";
  saveState();
  els["complete-view"].hidden = false;
  els["complete-title"].textContent = `${state.observer}, you’re done for now`;

  const nora = fidelityAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  const noraStudent = studentAgreementFor(state.attempts.nora, TRAINING_CASES.nora);
  els["completion-summary"].innerHTML = `
    <div><span>Nora fidelity agreement</span><strong>${percentLabel(nora?.percent)}</strong></div>
    <div><span>Nora student interval agreement</span><strong>${percentLabel(noraStudent?.percent)}</strong></div>
    <div><span>Kai qualification</span><strong>Pending team review</strong></div>
    <div><span>Feedback + questions</span><strong>Submitted</strong></div>
  `;
  resetScrollPosition();
}

function moduleAction(action) {
  switch (action) {
    case "instruction": showInstruction(); break;
    case "walkthrough": showWalkthrough(); break;
    case "nora-ready": openCaseReady("nora"); break;
    case "nora-resume": resumeAttempt("nora"); break;
    case "nora-results": showResults("nora"); break;
    case "feedback": showFeedback(); break;
    case "kai-ready": openCaseReady("kai"); break;
    case "kai-resume": resumeAttempt("kai"); break;
    case "kai-results": showResults("kai"); break;
    case "questions": showQuestions(); break;
  }
}

function restore() {
  if (!state) return showLogin();
  switch (state.screen) {
    case "module": showModule(); break;
    case "instruction": showInstruction(); break;
    case "walkthrough": showWalkthrough(); break;
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
  showWalkthrough();
});

els["walkthrough-cards"].addEventListener("click", (event) => {
  const button = event.target.closest("[data-tour-step]");
  if (button) activateTourStep(button.dataset.tourStep);
});

els["walkthrough-test-sound"].addEventListener("click", async () => {
  await testCue(els["walkthrough-test-sound"]);
});

els["complete-walkthrough"].addEventListener("click", () => {
  state.module.walkthroughComplete = true;
  saveState();
  openCaseReady("nora");
});

els["test-sound"].addEventListener("click", async () => {
  await testCue(els["test-sound"]);
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
els["review-back-home"].addEventListener("click", showModule);

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

els["repeat-case"].addEventListener("click", () => {
  openCaseReady(state.currentCaseId);
});

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
