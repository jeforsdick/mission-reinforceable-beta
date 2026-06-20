/**********************************************************
 * Mission: Reinforceable - Shared Dashboard
 * Reads session history from Google Apps Script and renders
 * a teacher-facing progress dashboard inside the game.
 **********************************************************/

const DASH_WIZ = {
  plus:  "../mr-wizard-plus10.png",
  meh:   "../mr-wizard-0.png",
  minus: "../mr-wizard-minus10.png"
};

function dashboardStateFromAccuracy(accuracy) {
  const pct = Number(accuracy) || 0;

  if (pct >= 80) {
    return {
      state: "plus",
      img: DASH_WIZ.plus,
      title: "The Wise Wizard Celebrates!",
      message: "Strong implementation pattern. Your choices suggest the BIP pathway is becoming more fluent: prevent early, prompt the replacement behavior, and reinforce re-entry quickly."
    };
  }

  if (pct >= 50) {
    return {
      state: "meh",
      img: DASH_WIZ.meh,
      title: "The Wise Wizard Thinks...",
      message: "The pattern shows some plan-aligned moves, but fidelity is still uneven. Focus on making the first step observable, reducing language during activation, and reinforcing the replacement response sooner."
    };
  }

  return {
    state: "minus",
    img: DASH_WIZ.minus,
    title: "The Wise Wizard Sounds the Alarm!",
    message: "The pattern suggests this plan needs more active support during the earliest signs of escalation. Start with structure, reduce language, and reinforce the replacement response as soon as it appears."
  };
}

function dashboardResultLabel(delta) {
  const n = Number(delta);

  if (n >= 10) return "Correct";
  if (n >= 5) return "Review";
  return "Missed";
}

function dashboardFeedbackFromPercent(percent) {
  const pct = Number(percent) || 0;

  if (pct >= 80) return GAME_CONFIG.fidelityHigh || "Strong fidelity.";
  if (pct >= 50) return GAME_CONFIG.fidelityMid || "Getting there.";
  return GAME_CONFIG.fidelityLow || "Not aligned yet.";
}

function dashboardMakeCoachSummary(sessions, decisions) {
  if (!sessions.length) {
    return "No missions have been completed yet. Once you complete a mission, I will summarize your patterns here.";
  }

  const avg = dashboardAveragePercent(sessions);
  const allDecisions = decisions || [];

  const incorrect = allDecisions.filter(d => Number(d.delta) < 5).length;
  const neutral = allDecisions.filter(d => Number(d.delta) >= 5 && Number(d.delta) < 10).length;
  const correct = allDecisions.filter(d => Number(d.delta) >= 10).length;

  if (avg >= 90 && correct >= neutral + incorrect) {
    return "You are showing strong plan alignment. Your responses are consistently keeping language brief, reducing attention to problem behavior, and reinforcing the replacement behavior quickly.";
  }

  if (neutral > incorrect && neutral > 0) {
    return "You are often keeping the situation calm, but some opportunities to strengthen the replacement behavior are being missed. Your next growth area is faster reinforcement when the student starts to re-engage.";
  }

  if (incorrect > 0) {
    return "Your biggest growth area is reducing responses that add attention, pressure, or public correction. Focus on brief prompts, clear choices, and reinforcing the first safe or appropriate response.";
  }

  if (avg >= 70) {
    return "You are building good momentum. Keep focusing on early prompts, private feedback, and quick reinforcement so the plan works before behavior escalates.";
  }

  return "The pattern suggests this plan needs more active support during the earliest signs of escalation. Start with structure, reduce language, and reinforce the replacement response as soon as it appears.";
}

function dashboardAveragePercent(sessions) {
  const scores = sessions
    .map(s => Number(s.percent))
    .filter(n => !Number.isNaN(n));

  if (!scores.length) return 0;

  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

function dashboardBestPercent(sessions) {
  const scores = sessions
    .map(s => Number(s.percent))
    .filter(n => !Number.isNaN(n));

  return scores.length ? Math.round(Math.max(...scores)) : 0;
}

function dashboardUniqueDates(sessions) {
  return [...new Set(
    sessions
      .map(s => String(s.date || s.timestamp || "").slice(0, 10))
      .filter(Boolean)
  )].sort();
}

function dashboardCurrentStreak(sessions) {
  const dates = dashboardUniqueDates(sessions);
  const dateSet = new Set(dates);

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 45; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const day = d.getDay();

    // Skip weekends for a school-day streak
    if (day === 0 || day === 6) continue;

    const key = d.toISOString().slice(0, 10);

    if (dateSet.has(key)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function dashboardFormatDate(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return String(dateString).slice(0, 10);

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

function dashboardFormatTime(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function dashboardEscape(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hideDashboardTopFeedback() {
  const feedbackBox = document.getElementById("feedback");
  if (feedbackBox) feedbackBox.style.display = "none";
}

function showDashboardTopFeedback() {
  const feedbackBox = document.getElementById("feedback");
  if (feedbackBox) feedbackBox.style.display = "";
}

async function dashboardFetchHistory() {
  const endpoint = GAME_CONFIG.resultEndpoint;

  if (!endpoint) {
    throw new Error("No result endpoint is set in GAME_CONFIG.");
  }

  const url = new URL(endpoint);
  url.searchParams.set("action", "history");
  url.searchParams.set("teacher", getTeacherCode());
  url.searchParams.set("student", GAME_CONFIG.defaultStudent || "");

  const res = await fetch(url.toString(), {
    method: "GET"
  });

  if (!res.ok) {
    throw new Error(`Dashboard history request failed: ${res.status}`);
  }

  return await res.json();
}

function dashboardGroupDecisionsBySession(decisions) {
  const grouped = {};

  (decisions || []).forEach(d => {
    const id = String(d.session_id || d.sessionId || d["Session ID"] || "");
    if (!id) return;

    if (!grouped[id]) grouped[id] = [];
    grouped[id].push(d);
  });

  return grouped;
}

function dashboardNormalizeSession(row) {
  return {
    timestamp: row.timestamp || row.Timestamp || row["Timestamp"] || row.date || row.Date || "",
    date: row.date || row.Date || String(row.timestamp || row.Timestamp || "").slice(0, 10),
    teacher: row.teacher || row.teacher_code || row.Teacher || "",
    student: row.student || row.Student || "",
    mode: row.mode || row.Mode || "Mission",
    session_id: String(row.session_id || row.sessionId || row["Session ID"] || row["Session ID "] || ""),
    points: Number(row.points ?? row.Points ?? row.Score ?? 0),
    max_possible: Number(row.max_possible ?? row.maxPossible ?? row["Max Possible"] ?? row["Max"] ?? 0),
    percent: Number(row.percent ?? row.Percent ?? row.Pct ?? 0),
    feedback_message: row.feedback_message || row.Feedback || ""
  };
}

function dashboardNormalizeDecision(row) {
  const delta = Number(row.delta ?? row.Delta ?? row.score ?? row.Score ?? 0);

  return {
    step: row.step || row.Step || row.choice || row.Choice || "",
    result: row.result || row.Result || dashboardResultLabel(delta),
    teacher: row.teacher || row.Teacher || "",
    student: row.student || row.Student || "",
    mode: row.mode || row.Mode || "",
    session_id: String(row.session_id || row.sessionId || row["Session ID"] || ""),
    timestamp: row.timestamp || row.Timestamp || "",
    decision_time: row.decision_time || row["Decision Time"] || row.DecisionTime || "",
    delta: delta,
    score: delta,
    node_id: row.node_id || row["Node ID"] || ""
  };
}

function renderProgressDashboardFromHistory(history) {
  const storyText = document.getElementById("story-text");
  const choicesDiv = document.getElementById("choices");
  const scenarioTitle = document.getElementById("scenario-title");

  hideDashboardTopFeedback();

  if (!choicesDiv) return;
  if (storyText) storyText.style.display = "none";

  const oldSummary = document.getElementById("summary-panel");
  if (oldSummary) oldSummary.remove();

  if (scenarioTitle) scenarioTitle.textContent = "My Mission Progress";

  const sessions = (history.sessions || [])
    .map(dashboardNormalizeSession)
    .filter(s => s.session_id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const decisions = (history.decisions || [])
    .map(dashboardNormalizeDecision);

  const decisionsBySession = dashboardGroupDecisionsBySession(decisions);

  const avg = dashboardAveragePercent(sessions);
  const best = dashboardBestPercent(sessions);
  const streak = dashboardCurrentStreak(sessions);
  const total = sessions.length;
  const coachSummary = dashboardMakeCoachSummary(sessions, decisions);
  const wizard = dashboardStateFromAccuracy(avg);

  const recentSessionCards = sessions.length
    ? sessions.slice(0, 12).map(session => {
        const sessionDecisions = decisionsBySession[session.session_id] || [];
        const scoreText = `${session.points}/${session.max_possible}`;
        const pctText = `${Math.round(session.percent)}%`;

        return `
          <button class="dashboard-session-card" data-session-id="${dashboardEscape(session.session_id)}">
            <div class="dashboard-session-date">${dashboardEscape(dashboardFormatDate(session.timestamp || session.date))}</div>
            <div class="dashboard-session-main">
              <strong>${dashboardEscape(session.mode || "Mission")}</strong>
              <span>Score: ${dashboardEscape(scoreText)} (${dashboardEscape(pctText)})</span>
              <small>${dashboardEscape(sessionDecisions.length)} choices reviewed</small>
            </div>
            <div class="dashboard-session-link">Details ▶</div>
          </button>
        `;
      }).join("")
    : `<div class="dashboard-empty">No missions completed yet.</div>`;

  choicesDiv.innerHTML = `
    <div id="progress-dashboard">
      <div class="wizard-summary-bubble wizard-summary-${dashboardEscape(wizard.state)}">
        <div class="wizard-summary-icon">
          <img src="${dashboardEscape(wizard.img)}" alt="MR Wizard">
        </div>
        <div class="wizard-summary-text">
          <h3>${dashboardEscape(wizard.title)}</h3>
          <p>${dashboardEscape(coachSummary)}</p>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="dashboard-number">${dashboardEscape(avg)}%</div>
          <div class="dashboard-label">Overall Accuracy</div>
        </div>

        <div class="dashboard-card">
          <div class="dashboard-number">${dashboardEscape(streak)}</div>
          <div class="dashboard-label">School-Day Streak</div>
        </div>

        <div class="dashboard-card">
          <div class="dashboard-number">${dashboardEscape(total)}</div>
          <div class="dashboard-label">Missions Completed</div>
        </div>

        <div class="dashboard-card">
          <div class="dashboard-number">${dashboardEscape(best)}%</div>
          <div class="dashboard-label">Best Score</div>
        </div>
      </div>

      <div class="dashboard-section">
        <h3>Past Missions</h3>
        <p class="dashboard-hint">Tap a session to review your score, choices, and overall feedback.</p>
        <div class="dashboard-session-list">
          ${recentSessionCards}
        </div>
      </div>

      <button id="dashboard-back-btn" class="scenario-btn primary big option-btn">
        Back to Missions
      </button>
    </div>
  `;

  document.getElementById("dashboard-back-btn")?.addEventListener("click", () => {
    showDashboardTopFeedback();
    renderIntroCards();
  });

  document.querySelectorAll(".dashboard-session-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-session-id");
      const session = sessions.find(s => s.session_id === id);
      const sessionDecisions = decisionsBySession[id] || [];
      renderSessionDetails(session, sessionDecisions, history);
    });
  });
}

function renderSessionDetails(session, decisions, fullHistory) {
  const storyText = document.getElementById("story-text");
  const choicesDiv = document.getElementById("choices");
  const scenarioTitle = document.getElementById("scenario-title");

  hideDashboardTopFeedback();

  if (!choicesDiv || !session) return;
  if (storyText) storyText.style.display = "none";
  if (scenarioTitle) scenarioTitle.textContent = "Mission Details";

  const feedback = session.feedback_message || dashboardFeedbackFromPercent(session.percent);
  const wizard = dashboardStateFromAccuracy(session.percent);

  const decisionRows = decisions.length
    ? decisions.map((d, index) => {
        const label = d.result || dashboardResultLabel(d.delta);
        const score = Number(d.delta);

        const className =
          score >= 10 ? "correct" :
          score >= 5 ? "meh" :
          "wrong";

        return `
          <div class="decision-review-card ${className}">
            <div class="decision-review-top">
              <strong>Decision ${index + 1}</strong>
              <span>${dashboardEscape(label)}</span>
            </div>
            <div class="decision-review-choice">
              ${dashboardEscape(d.step)}
            </div>
            <div class="decision-review-meta">
              Score: ${dashboardEscape(d.delta)}
              ${d.node_id ? ` | Node: ${dashboardEscape(d.node_id)}` : ""}
            </div>
          </div>
        `;
      }).join("")
    : `<div class="dashboard-empty">No item-level details were found for this session.</div>`;

  choicesDiv.innerHTML = `
    <div id="session-details">
      <div class="session-detail-header">
        <h3>${dashboardEscape(session.mode || "Mission")}</h3>
        <p>
          ${dashboardEscape(dashboardFormatDate(session.timestamp || session.date))}
          ${dashboardFormatTime(session.timestamp) ? ` at ${dashboardEscape(dashboardFormatTime(session.timestamp))}` : ""}
        </p>
        <div class="session-score-large">
          ${dashboardEscape(session.points)}/${dashboardEscape(session.max_possible)}
          <span>(${Math.round(Number(session.percent) || 0)}%)</span>
        </div>
      </div>

      <div class="wizard-summary-bubble wizard-summary-${dashboardEscape(wizard.state)}">
        <div class="wizard-summary-icon">
          <img src="${dashboardEscape(wizard.img)}" alt="MR Wizard">
        </div>
        <div class="wizard-summary-text">
          <h3>Overall Feedback</h3>
          <p>${dashboardEscape(feedback)}</p>
        </div>
      </div>

      <div class="dashboard-section">
        <h3>Choice-by-Choice Review</h3>
        ${decisionRows}
      </div>

      <button id="details-back-btn" class="scenario-btn primary big option-btn">
        Back to Progress
      </button>
    </div>
  `;

  document.getElementById("details-back-btn")?.addEventListener("click", () => {
    renderProgressDashboardFromHistory(fullHistory);
  });
}

async function openProgressDashboard() {
  const choicesDiv = document.getElementById("choices");
  const storyText = document.getElementById("story-text");
  const scenarioTitle = document.getElementById("scenario-title");

  hideDashboardTopFeedback();

  if (storyText) storyText.style.display = "none";
  if (scenarioTitle) scenarioTitle.textContent = "Loading Progress";

  if (choicesDiv) {
    choicesDiv.innerHTML = `
      <div id="progress-dashboard">
        <div class="dashboard-empty">Loading your mission history...</div>
      </div>
    `;
  }

  try {
    const history = await dashboardFetchHistory();
    renderProgressDashboardFromHistory(history);
  } catch (err) {
    console.error(err);

    if (choicesDiv) {
      choicesDiv.innerHTML = `
        <div id="progress-dashboard">
          <div class="dashboard-empty">
            I could not load the dashboard yet. The game needs the Google Apps Script history endpoint added.
          </div>
          <button id="dashboard-back-btn" class="scenario-btn primary big option-btn">
            Back to Missions
          </button>
        </div>
      `;

      document.getElementById("dashboard-back-btn")?.addEventListener("click", () => {
        showDashboardTopFeedback();
        renderIntroCards();
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const progressBtn = document.getElementById("progress-btn");

  if (progressBtn) {
    progressBtn.addEventListener("click", () => {
      openProgressDashboard();
    });
  }
});
