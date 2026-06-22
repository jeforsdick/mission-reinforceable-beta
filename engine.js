/**********************************************************
 * Mission: Reinforceable — SHARED ENGINE
 * Load this BEFORE content.js.
 * content.js fills GAME_CONFIG and POOL, then this engine
 * runs the game using those values.
 *
 * Features:
 *  - GAME_CONFIG: per-teacher endpoint, student, fidelity text
 *  - POOL: daily/crisis/wild scenarios (filled by content.js)
 *  - Heart / Life system (item 4)
 *  - Uniform button formatting (item 7)
 *  - Classic UI + wizard pod
 *  - Three modes: Daily Drill / Emergency Sim / Shuffle Quest
 *  - Daily-seeded randomness, shuffled choices 
 **********************************************************/

/* -------- Per-teacher config (defaults, overridden by content.js) -------- */
var GAME_CONFIG = {
  resultEndpoint: '',
  defaultStudent: 'student',
  fidelityHigh: "Nice work! Your decisions closely matched the Behavior Intervention Plan. You consistently used proactive supports, taught/prompted replacement behaviors, and reinforced the right moves.",
  fidelityMid:  "Some of your moves aligned with the plan, but key supports were missed. Revisit early prompts, clear expectations, and high-frequency reinforcement, then try again.",
  fidelityLow:  "This run drifted from the plan. Focus on: (a) proactive setup, (b) prompting & reinforcing the replacement behavior, and (c) using the crisis steps as written. Replay to improve fidelity to the plan.",
  actionHigh: `<ul>
      <li>Continue using strong proactive cues before transitions.</li>
      <li>Maintain clear reinforcement for replacement behaviors.</li>
      <li>Keep prompting early signs — your timing is working!</li>
    </ul>`,
  actionMid: `<ul>
      <li>Increase pre-corrections before predictable triggers.</li>
      <li>Prompt the replacement behavior earlier in the escalation cycle.</li>
      <li>Deliver reinforcement immediately when the replacement occurs.</li>
    </ul>`,
  actionLow: `<ul>
      <li>Revisit the proactive setup steps — these prevent most escape attempts.</li>
      <li>Practice the replacement behavior script outside of crises.</li>
      <li>Follow the crisis plan exactly (no blocking, no chasing).</li>
    </ul>`
};

/* -------- Scenario pool (filled by content.js) -------- */
var POOL = { daily: [], crisis: [], wild: [] };

/* -------- DOM refs -------- */
const storyText      = document.getElementById('story-text');
const choicesDiv     = document.getElementById('choices');
const scenarioTitle  = document.getElementById('scenario-title');
const pointsEl       = document.getElementById('points');
const scoreBadgeEl   = document.getElementById('score-badge');
const questProgressEl = document.querySelector('.quest-progress-stat');
const questProgressValueEl = document.getElementById('quest-progress-value');
const questProgressFillEl = document.querySelector('.quest-progress-meter i');
const feedbackEl     = document.getElementById('feedback');
const feedbackTextEl = document.getElementById('feedback-text');
const coachImgEl     = document.getElementById('coach-img');

/* -------- Wizard sprites -------- */
const WIZ = {
  plus:  '../mr-wizard-plus10.png',
  meh:   '../mr-wizard-0.png',
  minus: '../mr-wizard-minus10.png'
};
function setWizardSprite(state) {
  const src = state === 'plus' ? WIZ.plus : state === 'minus' ? WIZ.minus : WIZ.meh;
  if (coachImgEl) coachImgEl.src = `${src}?v=${Date.now()}`;
}
setWizardSprite('meh');

let currentScenario = null;
let currentMode     = null;

function scoreLevel(score) {
  if (score >= 10) return 'plus';
  if (score >= 5) return 'meh';
  return 'minus';
}

/* -------- Hearts system -------- */
const HEARTS_START = 5;

let hearts = HEARTS_START;
let maxHearts = HEARTS_START;

function renderHearts() {
  const el = document.getElementById('hearts-display');
  if (!el) return;

  let html = '';

  for (let i = 0; i < maxHearts; i++) {
    const fill = Math.max(0, Math.min(1, hearts - i));
    const fillPercent = Math.round(fill * 100);

    html += `
      <span class="zelda-heart ${fill >= 1 ? 'is-full' : fill > 0 ? 'is-partial' : 'is-empty'}" aria-hidden="true" data-fill="${fill}" style="--heart-fill: ${fillPercent}%">
        <img class="heart-icon heart-icon-empty" src="../assets/ui/heart-icon.png" alt="">
        <span class="heart-icon-fill">
          <img class="heart-icon" src="../assets/ui/heart-icon.png" alt="">
        </span>
      </span>
    `;
  }

  el.innerHTML = html;
  el.setAttribute('aria-label', `${hearts} out of ${maxHearts} hearts`);
  el.dataset.hearts = String(hearts);
  el.dataset.maxHearts = String(maxHearts);

  el.classList.remove('flash-hearts');
  requestAnimationFrame(() => el.classList.add('flash-hearts'));
}

function updateHearts(delta, countsForHearts = true) {
  if (typeof delta !== 'number') return;
  if (!countsForHearts) return;

  const before = hearts;

  if (delta >= 10) {
    // Correct answer: restore half a heart, up to the five-heart maximum.
    hearts = Math.min(maxHearts, hearts + 0.5);
  } else if (delta >= 5) {
    // Partial answer: lose one quarter heart.
    hearts = Math.max(0, hearts - 0.25);
  } else {
    // Incorrect answer: lose half a heart.
    hearts = Math.max(0, hearts - 0.5);
  }

  hearts = Math.min(maxHearts, Math.max(0, Math.round(hearts * 4) / 4));

  console.log(`HEARTS: ${before} → ${hearts}, score: ${delta}`);

  renderHearts();
}
/* -------- Scoring -------- */
let points     = 0;
let maxPossible = 0;
let completedDecisionNodes = 0;
let totalDecisionNodes = 0;

function countMissionDecisionNodes(scn) {
  if (!scn || !scn.start || !scn.steps) return 0;

  const memo = new Map();
  const visiting = new Set();

  function longestPathFrom(stepKey) {
    if (!stepKey || !scn.steps[stepKey]) return 0;
    if (memo.has(stepKey)) return memo.get(stepKey);
    if (visiting.has(stepKey)) return 0;

    visiting.add(stepKey);
    const choices = Object.values(scn.steps[stepKey].choices || {});
    const longestRemaining = choices.reduce((longest, choice) => {
      const nextLength = choice.next ? longestPathFrom(choice.next) : 0;
      return Math.max(longest, nextLength);
    }, 0);
    visiting.delete(stepKey);

    const pathLength = 1 + longestRemaining;
    memo.set(stepKey, pathLength);
    return pathLength;
  }

  return longestPathFrom(scn.start);
}

function updateGameplayHud(isComplete = false) {
  const completed = isComplete
    ? totalDecisionNodes
    : Math.min(completedDecisionNodes, totalDecisionNodes);
  const questPercent = totalDecisionNodes > 0
    ? Math.round((completed / totalDecisionNodes) * 100)
    : 0;
  const behaviorXpPercent = maxPossible > 0
    ? Math.round((points / maxPossible) * 100)
    : 0;
  const hudVisible = document.body.classList.contains('playing-mission')
    || document.body.classList.contains('summary-screen');

  if (questProgressEl) {
    questProgressEl.hidden = !hudVisible;
    questProgressEl.dataset.completedDecisions = String(completed);
    questProgressEl.dataset.totalDecisions = String(totalDecisionNodes);
    questProgressEl.dataset.progress = String(questPercent);
    questProgressEl.setAttribute('aria-label', `Quest Progress ${questPercent}%`);
  }
  if (questProgressValueEl) questProgressValueEl.textContent = `${questPercent}%`;
  if (questProgressFillEl) questProgressFillEl.style.width = `${questPercent}%`;

  if (scoreBadgeEl) {
    scoreBadgeEl.dataset.behaviorXp = String(behaviorXpPercent);
    scoreBadgeEl.dataset.behaviorXpLabel = `${behaviorXpPercent}%`;
    scoreBadgeEl.style.setProperty('--behavior-xp-percent', `${behaviorXpPercent}%`);
    scoreBadgeEl.setAttribute('aria-label', `Behavior XP ${behaviorXpPercent}%`);
  }
}

function setPoints(v) {
  points = v;
  if (pointsEl) {
    pointsEl.textContent = points;
    pointsEl.classList.remove('flash');
    requestAnimationFrame(() => pointsEl.classList.add('flash'));
  }
}
function addPoints(delta) {
  if (typeof delta === 'number') {
    maxPossible += 10;
    setPoints(points + delta);
  }
}

function resetGame() {
  points = 0;
  maxPossible = 0;
  completedDecisionNodes = 0;
  totalDecisionNodes = 0;

  hearts = HEARTS_START;
  maxHearts = HEARTS_START;

  events = [];
  sentThisRun = false;
  SESSION_ID = newSessionId();

  setPoints(0);
  renderHearts();
  document.body.classList.remove(
    'modal-open',
    'bip-briefing',
    'feedback-open',
    'dashboard-screen',
    'same-day-screen',
    'summary-screen'
  );
  updateGameplayHud();
  showFeedback('', null, 5);

  if (scenarioTitle) scenarioTitle.textContent = "Behavior Intervention Simulator";

  const old = document.getElementById('summary-panel');
  if (old) old.remove();
}

function percentScore() {
  if (maxPossible === 0) return 0;
  return Math.max(0, (points / maxPossible) * 100);
}

function fidelityMessage() {
  const pct = percentScore();
  if (pct >= 80) return GAME_CONFIG.fidelityHigh;
  if (pct >= 50) return GAME_CONFIG.fidelityMid;
  return GAME_CONFIG.fidelityLow;
}

/* -------- Feedback UI -------- */
function showFeedback(text, type, scoreHint) {
  if (!feedbackEl || !feedbackTextEl) return;

  let state = 'meh';

  if (typeof scoreHint === 'number') {
    state = scoreLevel(scoreHint);
  } else if (type === 'correct') {
    state = 'plus';
  }

  setWizardSprite(state);

  feedbackEl.classList.remove('state-plus', 'state-meh', 'state-minus', 'flash');
  feedbackEl.classList.add(`state-${state}`);
  feedbackTextEl.textContent = text || '';
  requestAnimationFrame(() => feedbackEl.classList.add('flash'));
}

/* -------- Wizard Pop-Up Feedback -------- */
function escapeHTML(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function wizardStateFromDelta(delta) {
  return scoreLevel(delta);
}

function wizardTitleFromDelta(delta) {
  if (delta >= 10) return 'The Wizard nods approvingly!';
  if (delta >= 5) return 'The Wizard pauses...';
  return 'The Wizard sounds the alarm!';
}

function wizardButtonTextFromDelta(delta) {
  if (delta >= 10) return 'Lock in the good move ▶';
  if (delta >= 5) return 'I read it. Continue carefully ▶';
  return 'I read it. Recover the mission ▶';
}

function buildWizardFeedback(opt) {
  const base = opt.feedback || '';

  // If you later add custom wizard text in content.js, it will use that first.
  if (opt.wizard) return opt.wizard;

  if (opt.delta >= 10) {
    return `Strong move. The classroom stays steady because you gave the student a clear path forward.

The student knows exactly what to do next, the peer audience stays quiet, and the routine keeps moving.

${base}`;
  }

  if (opt.delta >= 5) {
    return `The moment wobbles. The student is not fully escalated, but the support is not strong enough yet.

The student pauses, scans for peer attention, and the routine starts to lose momentum. You still have a chance to tighten the next move.

${base}`;
  }

  return `Uh oh. That choice feeds the problem.

The student gets more attention, peers start watching, and the routine begins to unravel. The next response matters because you now need to repair momentum and reduce escalation risk.

${base}`;
}

function showWizardPopup(opt, onContinue) {
  // Jump to the top of the game immediately so the modal opens cleanly
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    gameContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  const state = wizardStateFromDelta(opt.delta);
  const title = wizardTitleFromDelta(opt.delta);
  const body = buildWizardFeedback(opt);
  const buttonText = wizardButtonTextFromDelta(opt.delta);

  setWizardSprite(state);

  const old = document.getElementById('wizard-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'wizard-modal';
  modal.className = `wizard-modal state-${state}`;

  modal.innerHTML = `
    <div class="wizard-modal-card" role="dialog" aria-modal="true" aria-labelledby="wizard-modal-title">
      <div class="wizard-modal-top">
        <div class="wizard-modal-icon">
          <img src="${state === 'plus' ? WIZ.plus : state === 'minus' ? WIZ.minus : WIZ.meh}" alt="MR Wizard">
        </div>
        <div>
          <h2 id="wizard-modal-title">${escapeHTML(title)}</h2>
          <div class="wizard-modal-tag">
            ${state === 'plus' ? 'Fidelity strengthened' : state === 'minus' ? 'Mission risk increased' : 'Partial support'}
          </div>
        </div>
      </div>

      <div class="wizard-modal-body">
        ${escapeHTML(body).replaceAll('\n', '<br>')}
      </div>

      <button id="wizard-continue-btn" class="wizard-continue-btn">
        ${escapeHTML(buttonText)}
      </button>
    </div>
  `;

  document.body.classList.remove('bip-briefing');
  document.body.classList.add('modal-open', 'feedback-open');
  document.body.appendChild(modal);

  const continueBtn = document.getElementById('wizard-continue-btn');
  const continueFromWizard = () => {
    if (!modal.isConnected) return;
    modal.remove();
    document.body.classList.remove('modal-open', 'feedback-open');
    onContinue();
  };

  if (continueBtn) {
    continueBtn.focus();
    continueBtn.addEventListener('click', continueFromWizard);
  }

  modal.querySelector('.wizard-modal-icon')?.addEventListener('click', continueFromWizard);
  modal.querySelector('.wizard-modal-body')?.addEventListener('click', continueFromWizard);
}

function showBipBriefingPopup(scn, briefingText, onContinue) {
  const gameContainer = document.getElementById('game-container');

  if (gameContainer) {
    gameContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Use the +10 wizard sprite in the toolbar too
  setWizardSprite('plus');

  const old = document.getElementById('wizard-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'wizard-modal';

  // Keep your blue/correct styling
  modal.className = 'wizard-modal state-correct';

  const missionTitle = scn?.title || 'Mission';
  const missionFocus = scn?.focus || '';

  modal.innerHTML = `
    <div class="wizard-modal-card" role="dialog" aria-modal="true" aria-labelledby="wizard-modal-title">
      <div class="wizard-modal-top">
        <div class="wizard-modal-icon">
          <img src="../assets/characters/wizard-guide.png" alt="MR Wizard">
        </div>
        <div>
          <h2 id="wizard-modal-title">BIP Briefing</h2>
          <div class="wizard-modal-tag">
            ${escapeHTML(missionTitle)}
          </div>
        </div>
      </div>

      <div class="wizard-modal-body">
        ${missionFocus ? `
          <div class="bip-focus-block">
            <strong>Mission Focus</strong>
            <span>${escapeHTML(missionFocus)}</span>
          </div>
        ` : ''}
        <div class="bip-briefing-copy">
          ${escapeHTML(briefingText).replaceAll('\n', '<br>')}
        </div>
      </div>

      <button id="wizard-continue-btn" class="wizard-continue-btn">
        Begin Mission ▶
      </button>
    </div>
  `;

  document.body.classList.remove('feedback-open');
  document.body.classList.add('modal-open', 'bip-briefing');
  document.body.appendChild(modal);

  const continueBtn = document.getElementById('wizard-continue-btn');

  if (continueBtn) {
    continueBtn.focus();

    continueBtn.addEventListener('click', () => {
      modal.remove();
      document.body.classList.remove('modal-open', 'bip-briefing');
      onContinue();
    });
  }
}

/* -------- Results → Google Apps Script -------- */
function getTeacherCode() {
  const u = new URL(window.location.href);
  return (u.searchParams.get("teacher")
       || document.getElementById("teacher-code")?.textContent
       || "—").trim();
}
function setTeacherBadge(code) {
  const el = document.getElementById("teacher-code");
  if (el && code && el.textContent !== code) el.textContent = code;
}
function newSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let SESSION_ID  = newSessionId();
let events      = [];
let sentThisRun = false;

function resultLabelFromDelta(delta) {
  if (delta >= 10) return "Correct";
  if (delta >= 5) return "Partial";
  return "Incorrect";
}

function getCorrectAnswerForNode(node) {
  if (!node || !Array.isArray(node.options)) return "";

  const correct = node.options.find(o => typeof o.delta === "number" && o.delta >= 10);
  return correct ? correct.text : "";
}

function logDecision(nodeId, opt) {
  const node = getNode(nodeId);

  events.push({
    t: new Date().toISOString(),

    // Existing fields — keep these so your current sheet does not break
    nodeId,
    delta: typeof opt.delta === 'number' ? opt.delta : null,
    choice: opt.text,
    meta: opt.meta || null,

    // Mission/context fields you already started collecting
    mission_id: currentScenario?.id || null,
    mission_title: currentScenario?.title || null,
    mission_focus: currentScenario?.focus || null,
    routine: currentScenario?.routine || null,
    function_pressure: currentScenario?.functionPressure || null,
    bip_targets: currentScenario?.bipTargets || null,

    // NEW coaching/context fields
    result_label: resultLabelFromDelta(typeof opt.delta === 'number' ? opt.delta : 0),
    scenario_title: node?.scenario || currentScenario?.title || "",
    scenario_text: node?.text || "",
    scene_text: node?.scene || "",
    question_prompt: node?.prompt || "",
    selected_answer: opt.text || "",
    selected_score: typeof opt.delta === 'number' ? opt.delta : null,
    correct_answer: getCorrectAnswerForNode(node),
    wizard_feedback: opt.feedback || "",
    wizard_narration: buildWizardFeedback(opt) || ""
  });
}
/* -------- Same-Day Completion / Return Screen -------- */
function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayStorageKey() {
  return `mr-today-result:${getTeacherCode()}:${GAME_CONFIG.defaultStudent}:${todayKey()}`;
}

function saveTodayResult(payload) {
  try {
    localStorage.setItem(todayStorageKey(), JSON.stringify(payload));
  } catch (e) {
    console.warn("Could not save today's result:", e);
  }
}

function getTodayResult() {
  try {
    const raw = localStorage.getItem(todayStorageKey());
    if (!raw) return null;

    const data = JSON.parse(raw);

    if (data.date !== todayKey()) return null;

    return data;
  } catch (e) {
    console.warn("Could not read today's result:", e);
    return null;
  }
}

function sendResultsOnce() {
  if (sentThisRun) return;
  sentThisRun = true;

  let mode = "Wildcard";
  if (currentScenario && currentScenario.title) {
    if (currentScenario.title.includes("Daily")) mode = "Daily";
    else if (currentScenario.title.includes("Crisis") || currentScenario.title.includes("Emergency")) mode = "Crisis";
  }

  const url     = new URL(window.location.href);
  const student = url.searchParams.get("student") || GAME_CONFIG.defaultStudent;

  const payload = {
  teacher_code: getTeacherCode(),
  session_id:   SESSION_ID,
  points,
  max_possible: maxPossible,
  percent:      percentScore(),
  timestamp:    new Date().toISOString(),
  date:         todayKey(),
  log:          events,
  mode,
  student,
  feedback_message: fidelityMessage()
};
saveTodayResult(payload);
  
  if (!GAME_CONFIG.resultEndpoint) return;
  try {
    fetch(GAME_CONFIG.resultEndpoint, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(payload)
    })
    .then(() => console.log("Results sent"))
    .catch(err => console.error("Send failed:", err));
  } catch (e) {
    console.error("Fetch threw:", e);
  }
}
function setPlayMode(isPlaying) {
  document.body.classList.toggle("playing-mission", !!isPlaying);
  if (isPlaying) document.body.classList.remove('summary-screen');
}
/* -------- Utilities -------- */
function shuffledOptions(options) { return (options || []).map(o => ({...o})).sort(() => Math.random() - 0.5); }
function shuffle(a, rnd = Math.random) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
function sample(pool, k, rnd = Math.random) { return shuffle(pool, rnd).slice(0, Math.min(k, pool.length)); }
function seedFromDate() {
  const d   = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) { h = (h << 5) - h + key.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function srandom(seed) {
  let x = (seed >>> 0) || 1234567;
  return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967295; };
}
function extractBipBriefingFromText(text) {
  const raw = String(text || '');

  // Looks for:
  // BIP Briefing: ...
  //
  // Scene: ...
  const match = raw.match(/^BIP Briefing:\s*([\s\S]*?)\n\nScene:\s*([\s\S]*)$/);

  if (!match) {
    return {
      briefing: null,
      storyText: raw
    };
  }

  return {
    briefing: match[1].trim(),
    storyText: `Scene: ${match[2].trim()}`
  };
}
function buildStepDisplayText(step) {
  if (step.scene || step.prompt) {
    return [step.scene, step.prompt].filter(Boolean).join('\n\n');
  }

  return step.text || '';
}
/* ============================================================
   DYNAMIC MISSION BUILDER
   ============================================================ */
function pickScenario(pool, rnd) { return sample(pool, 1, rnd)[0]; }

function renderIntroCards() {
  setPlayMode(false);
  document.body.classList.remove('dashboard-screen', 'same-day-screen');
  document.body.classList.add('start-screen');
  const useQuestHub = document.body.classList.contains('skin-quest-hub');
  
  if (storyText) storyText.classList.remove('same-day-return');
  if (storyText) storyText.style.display = 'block';
  const oldSummary = document.getElementById('summary-panel');
  if (oldSummary) oldSummary.remove();
  if (scenarioTitle) scenarioTitle.textContent = "Behavior Intervention Simulator";

  if (storyText) {
    storyText.innerHTML = useQuestHub
      ? `
      <section class="quest-hero" aria-labelledby="quest-hero-title">
        <div class="quest-hero-art">
          <img class="quest-map-background" src="../assets/ui/map-quest-background.png" alt="Magical classroom kingdom quest map">
          <img class="quest-map-wizard-guide" src="../assets/ui/wizard-start.png" alt="The Wizard will chime in after every move.">
          <div class="quest-map-caption">
            <h3 id="quest-hero-title">Your Classroom Kingdom</h3>
            <button type="button" class="quest-hero-cta">Start Daily Quest</button>
          </div>
        </div>
      </section>`
      : `
      <div class="landing-welcome">
        <div class="landing-wizard-portrait">
          <img src="${WIZ.meh}" alt="MR Wizard">
        </div>
        <div class="landing-welcome-copy">
          <strong class="landing-welcome-heading">Welcome to Mission: Reinforceable.</strong>
          <span class="landing-welcome-body">You'll step through short scenarios based on your student's Behavior Plan.</span>
          <strong class="landing-mission-prompt">Choose your mission below.</strong>
          <em class="landing-wizard-line">*The Wizard will chime in after every move.*</em>
        </div>
      </div>`;
  }

  const menu = document.createElement('div');
  menu.className = useQuestHub ? 'quest-grid' : 'mission-grid';
  menu.innerHTML = useQuestHub
    ? `
    <article class="quest-card quest-card-daily">
      <div class="quest-card-icon"><img src="../assets/ui/daily-mission-icon.png" alt=""></div>
      <div class="quest-card-copy">
        <span class="quest-card-kicker">Plan Your Day</span>
        <h3>Daily Quest</h3>
        <p>Practice plan-aligned support decisions.</p>
      </div>
      <div class="action"><button id="btn-drill">View Quest</button></div>
    </article>
    <article class="quest-card quest-card-crisis">
      <div class="quest-card-icon"><img src="../assets/ui/crisis-mission-icon.png" alt=""></div>
      <div class="quest-card-copy">
        <span class="quest-card-kicker">Steady the Moment</span>
        <h3>Crisis Mission</h3>
        <p>Practice calm responses during higher-intensity classroom moments.</p>
      </div>
      <div class="action"><button id="btn-crisis">View Quest</button></div>
    </article>
    <article class="quest-card quest-card-mystery">
      <div class="quest-card-icon"><img src="../assets/ui/mystery-mission-icon.png" alt=""></div>
      <div class="quest-card-copy">
        <span class="quest-card-kicker">Wildcard Challenge</span>
        <h3>Mystery Quest</h3>
        <p>Try randomized classroom scenarios.</p>
      </div>
      <div class="action"><button id="btn-random">View Quest</button></div>
    </article>`
    : `
    <div class="mission-card">
      <h3>Daily Mission</h3>
      <div class="action"><button id="btn-drill">Start Daily Practice ▶</button></div>
    </div>
    <div class="mission-card">
      <h3>Red Alert</h3>
      <div class="action"><button id="btn-crisis">Start Crisis Drill ▶</button></div>
    </div>
    <div class="mission-card">
      <h3>Wildcard</h3>
      <div class="action"><button id="btn-random">Start Mystery Mission ▶</button></div>
    </div>`;

  const container = document.createElement('div');
  container.className = 'mission-intro';
  container.appendChild(menu);

  if (choicesDiv) {
    choicesDiv.innerHTML = '';
    choicesDiv.appendChild(container);
  }

  showFeedback("The Wizard will chime in after every move.", "correct", 10);

  const rnd = srandom(seedFromDate());

  document.getElementById('btn-drill')?.addEventListener('click', () => {
    resetGame();
    currentMode = "Daily";
    startDynamicMission('Daily Drill', pickScenario(POOL.daily, rnd));
  });
  document.getElementById('btn-crisis')?.addEventListener('click', () => {
    resetGame();
    currentMode = "Crisis";
    startDynamicMission('Emergency Sim', pickScenario(POOL.crisis, rnd));
  });
  document.getElementById('btn-random')?.addEventListener('click', () => {
    resetGame();
    currentMode = "Wildcard";
    startDynamicMission('Shuffle Quest', pickScenario(POOL.wild, rnd));
  });

  document.querySelector('.quest-hero-cta')?.addEventListener('click', () => {
    document.getElementById('btn-drill')?.click();
  });
}
function startMissionByType(type) {
  resetGame();

  const rnd = srandom(seedFromDate());

  if (type === "Daily") {
    currentMode = "Daily";
    startDynamicMission('Daily Drill', pickScenario(POOL.daily, rnd));
  } else if (type === "Crisis") {
    currentMode = "Crisis";
    startDynamicMission('Emergency Sim', pickScenario(POOL.crisis, rnd));
  } else {
    currentMode = "Wildcard";
    startDynamicMission('Shuffle Quest', pickScenario(POOL.wild, rnd));
  }
}

function renderSameDayReturnScreen(result) {
  setPlayMode(false);
  document.body.classList.add('same-day-screen');

  if (storyText) storyText.style.display = 'block';

  const oldSummary = document.getElementById('summary-panel');
  if (oldSummary) oldSummary.remove();

  if (scenarioTitle) {
    scenarioTitle.textContent = "Mission Already Completed Today";
  }

  const pct = Math.round(result.percent || 0);
  const completedTime = result.timestamp
    ? new Date(result.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : "earlier today";

  if (storyText) {
  storyText.classList.add('same-day-return');

  storyText.innerHTML = `
    <div class="same-day-lead">
      You already completed a Mission: Reinforceable session today.
    </div>

    <div class="same-day-recap">
      <strong>Today's recap:</strong><br>
      Mission type: ${result.mode || "Mission"}<br>
      Score: ${result.points} / ${result.max_possible} (${pct}%)<br>
      Completed: ${completedTime}
    </div>

    <div class="same-day-feedback">
      ${result.feedback_message || ""}
    </div>

    <div class="same-day-next">
      <strong>What would you like to do next?</strong>
    </div>
  `;
}

  if (!choicesDiv) return;

  choicesDiv.innerHTML = `
    <div class="mission-intro">
      <div class="mission-grid">
        <div class="mission-card">
          <h3>Daily Mission</h3>
          <p>Replay today's regular skill practice mission.</p>
          <div class="action">
            <button id="same-day-daily">Play the Daily Mission again ▶</button>
          </div>
        </div>

        <div class="mission-card">
          <h3>Wildcard Mission</h3>
          <p>Try a less predictable classroom situation.</p>
          <div class="action">
            <button id="same-day-wildcard">Play a Wildcard Mission ▶</button>
          </div>
        </div>

        <div class="mission-card">
          <h3>Crisis Mission</h3>
          <p>Practice a higher-intensity response scenario.</p>
          <div class="action">
            <button id="same-day-crisis">Play a Crisis Mission ▶</button>
          </div>
        </div>
      </div>
    </div>
  `;

  showFeedback("Welcome back. You already completed today's mission, but you can keep practicing.", "correct", 10);

  document.getElementById('same-day-daily')?.addEventListener('click', () => {
    startMissionByType("Daily");
  });

  document.getElementById('same-day-wildcard')?.addEventListener('click', () => {
    startMissionByType("Wildcard");
  });

  document.getElementById('same-day-crisis')?.addEventListener('click', () => {
    startMissionByType("Crisis");
  });
}
let DYN     = { nodes: [], ids: [] };
let NEXT_ID = 1000;
function newId() { return NEXT_ID++; }

function startDynamicMission(modeLabel, scn) {
  if (!scn) return;

  document.body.classList.remove('start-screen');
  setPlayMode(true);

  currentScenario = scn;
  DYN = { nodes: [], ids: [] };
  completedDecisionNodes = 0;
  totalDecisionNodes = countMissionDecisionNodes(scn);
  updateGameplayHud();

  const stepIds   = {};
  const endingIds = {};
  for (let k in scn.steps)   stepIds[k]   = newId();
  for (let k in scn.endings) endingIds[k] = newId();

let missionBriefing = scn.bipBriefing || scn.briefing || null;

for (let stepKey in scn.steps) {
  const step = scn.steps[stepKey];

  let displayText = buildStepDisplayText(step);
  let sceneText = step.scene || null;
  let promptText = step.prompt || null;

  if (stepKey === scn.start) {
    if (!missionBriefing && step.briefing) {
      missionBriefing = step.briefing;
    }

    // Backward compatibility for older content using one big text block
    if (!step.briefing && !step.scene && !step.prompt) {
      const extracted = extractBipBriefingFromText(step.text);

      if (!missionBriefing && extracted.briefing) {
        missionBriefing = extracted.briefing;
      }

      displayText = extracted.storyText;
    }
  }

  const node = {
    id: stepIds[stepKey],
    scenario: scn.title || modeLabel,
    text: displayText,
    scene: sceneText,
    prompt: promptText,
    options: []
  };
    for (let chKey in step.choices) {
      const ch  = step.choices[chKey];
const opt = {
  text:         ch.text,
  delta:        ch.score,
  feedback:     ch.feedback,
  wizard:       ch.wizard || '',
  meta:         ch.meta || null,
feedbackType: ch.score >= 10 ? 'correct' : 'coach',
  nextId:       ch.next ? stepIds[ch.next] : (ch.ending ? endingIds[ch.ending] : 901)
};
      node.options.push(opt);
    }
    DYN.nodes.push(node);
  }

  for (let endKey in scn.endings) {
    const end  = scn.endings[endKey];
    const node = {
      id: endingIds[endKey],
      feedback: true,
      customTitle: end.title,
      customMsg:   end.text,
      text:        end.text,
      options:     [{ text: "Play again", nextId: 'home' }]
    };
    DYN.nodes.push(node);
  }

  const launchMission = () => {
    showNode(stepIds[scn.start]);
    showFeedback("Mission launched! Good luck.", "correct", +10);
  };

  if (missionBriefing) {
    showBipBriefingPopup(scn, missionBriefing, launchMission);
  } else {
    launchMission();
  }
}

/* -------- Static fallback summary node -------- */
const NODES = [
  { id: 901, feedback: true, text: "Session Summary",
    options: [{ text: "Play again", nextId: 'home' }] }
];

function getNode(id) {
  return DYN.nodes.find(n => n.id === id) || NODES.find(n => n.id === id) || null;
}

function showNode(id) {
  const node = getNode(id);
  if (!node) return;

  if (scenarioTitle) {
    scenarioTitle.textContent = node.feedback
      ? "Fidelity Feedback"
      : node.scenario || "Choose Your Next Move";
  }

if (node.feedback) {
  setPlayMode(false);
  document.body.classList.add('summary-screen');
  completedDecisionNodes = totalDecisionNodes;
  updateGameplayHud(true);
  if (storyText) storyText.style.display = 'none';

    const pct = percentScore();
    const msg = fidelityMessage();

    const actionSteps = pct >= 80
      ? GAME_CONFIG.actionHigh
      : pct >= 50
        ? GAME_CONFIG.actionMid
        : GAME_CONFIG.actionLow;

    const old = document.getElementById('summary-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'summary-panel';
    panel.innerHTML = `
      <div class="summary-score">
        Score: <strong>${points}</strong> / ${maxPossible} (${Math.round(pct)}%)
      </div>
      <div class="summary-section">
        <strong>Overall feedback:</strong><br>${msg}${node.customMsg ? '<br><br>' + node.customMsg : ''}
      </div>
      <div class="summary-section">
        <strong>Action steps for teachers:</strong>
        ${actionSteps}
      </div>`;

    if (storyText && storyText.parentNode) {
      storyText.insertAdjacentElement('afterend', panel);
    }

    let scoreHint;
    let coachLine;

    if (pct >= 80) {
  scoreHint = 10;
  coachLine = "Mission complete. Results have been sent to the team. Review your overall feedback below.";
} else if (pct >= 50) {
  scoreHint = 5;
  coachLine = "Mission incomplete. Results have been sent to the team. Review your overall feedback below.";
} else {
  scoreHint = 0;
  coachLine = "Mission failed. Results have been sent to the team. Review your overall feedback below.";
}

    showFeedback(coachLine, null, scoreHint);
    sendResultsOnce();

  } else {
    if (storyText) {
  storyText.classList.remove('same-day-return');
  storyText.style.display = 'block';
  storyText.textContent = node.text;
}

    const old = document.getElementById('summary-panel');
    if (old) old.remove();
  }

  if (!choicesDiv) return;

choicesDiv.innerHTML = '';

if (!node.feedback) {
  const wizardPrompt = document.createElement('div');
  wizardPrompt.className = 'choice-wizard-card';
  wizardPrompt.innerHTML = `
    <div class="choice-wizard-icon">
      <img src="../assets/characters/wizard-guide.png" alt="MR Wizard">
    </div>
    <div class="choice-wizard-text">
      <strong>Wizard Check</strong>
      <span>Choose your move carefully. Your decision changes what happens next.</span>
    </div>
  `;
  choicesDiv.appendChild(wizardPrompt);
}

const options = shuffledOptions(node.options);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    ['scenario-btn', 'primary', 'big', 'option-btn'].forEach(c => btn.classList.add(c));

   btn.addEventListener('click', () => {
  if (node.feedback && opt.nextId === 'home') {
    resetGame();

    const todayResult =
      typeof getTodayResult === 'function'
        ? getTodayResult()
        : null;

    if (todayResult && typeof renderSameDayReturnScreen === 'function') {
      renderSameDayReturnScreen(todayResult);
    } else {
      renderIntroCards();
    }

    return;
  }

  if (!node.feedback && typeof opt.delta === 'number') {
    addPoints(opt.delta);
    completedDecisionNodes = Math.min(completedDecisionNodes + 1, totalDecisionNodes);
    updateGameplayHud();

    const isContinueButton = /^continue\.?$/i.test((opt.text || '').trim());

    const countsForHearts =
      node.options.length > 1 &&
      !isContinueButton;

    updateHearts(opt.delta, countsForHearts);
    logDecision(node.id, opt);
  }

  if (opt.feedback) {
    showFeedback(opt.feedback, opt.feedbackType || 'coach', opt.delta);
  } else if (!node.feedback) {
    showFeedback('', null, 5);
  }

  const goToNextNode = () => {
    if (opt.nextId === 'home') {
      resetGame();
      renderIntroCards();
    } else {
      showNode(opt.nextId);
    }
  };

  if (!node.feedback && opt.feedback) {
    showWizardPopup(opt, goToNextNode);
  } else {
    goToNextNode();
  }
});

    choicesDiv.appendChild(btn);
  });
}

/* -------- INIT -------- */
document.addEventListener('DOMContentLoaded', () => {
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      resetGame();
      renderIntroCards();
    });
  }
  setTeacherBadge(getTeacherCode());
resetGame();

const todayResult = getTodayResult();

if (todayResult) {
  renderSameDayReturnScreen(todayResult);
} else {
  renderIntroCards();
  showFeedback("The Wizard will chime in after every move.", "correct", +10);
}
  });
