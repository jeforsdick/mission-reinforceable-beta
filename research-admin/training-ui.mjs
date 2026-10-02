const OBSERVERS = ["Austen","Casey","Melissa","Kathleen","Jess"];

function latest(rows, observer, caseId) {
  return rows
    .filter((row) => row.observer_name === observer && row.case_id === caseId)
    .sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0] || null;
}

function pct(value) {
  return value == null ? "—" : `${Math.round(Number(value) * 10) / 10}%`;
}

function intervalAgreement(a = [], b = []) {
  const count = Math.min(a.length, b.length);
  let agreements = 0;
  let disagreements = 0;
  let excluded = 0;
  for (let i = 0; i < count; i += 1) {
    if (!a[i] || !b[i] || a[i] === "not_observed" || b[i] === "not_observed") {
      excluded += 1;
      continue;
    }
    if (a[i] === b[i]) agreements += 1;
    else disagreements += 1;
  }
  const compared = agreements + disagreements;
  return {
    agreements,
    disagreements,
    excluded,
    compared,
    percent: compared ? (agreements / compared) * 100 : null
  };
}

function fidelityAgreement(a = {}, b = {}) {
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
  let agreements = 0;
  let disagreements = 0;
  for (const key of keys) {
    if (!a[key] || !b[key]) continue;
    if (a[key] === b[key]) agreements += 1;
    else disagreements += 1;
  }
  const compared = agreements + disagreements;
  return {
    agreements,
    disagreements,
    compared,
    percent: compared ? (agreements / compared) * 100 : null
  };
}

function intervalCode(intervals = []) {
  return intervals.map((value) =>
    value === "occurred" ? "X" : value === "not_observed" ? "O" : value === "did_not_occur" ? "·" : "?"
  ).join("");
}

function scoreLabel(value) {
  if (value === "implemented") return "Implemented";
  if (value === "not_implemented") return "Not Implemented";
  if (value === "no_opportunity") return "No Opportunity";
  return "—";
}

function caseCell(attempt, reference) {
  if (!attempt) return '<span class="training-empty">Not submitted</span>';
  const student = reference && reference.client_submission_id !== attempt.client_submission_id
    ? intervalAgreement(attempt.intervals || [], reference.intervals || [])
    : null;
  const fidelity = reference && reference.client_submission_id !== attempt.client_submission_id
    ? fidelityAgreement(attempt.fidelity_scores || {}, reference.fidelity_scores || {})
    : null;
  return `
    <div class="training-case-summary">
      <strong>Key: ${pct(attempt.teacher_fidelity_agreement)}</strong>
      <span>${reference && reference.client_submission_id !== attempt.client_submission_id
        ? `vs Jess — student ${pct(student?.percent)} · fidelity ${pct(fidelity?.percent)}`
        : "Jess/reference attempt"}</span>
      <small>${new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(attempt.submitted_at))}</small>
    </div>
  `;
}

function feedbackCell(feedback) {
  if (!feedback) return '<span class="training-empty">Not submitted</span>';
  return `
    <div class="training-feedback-summary">
      <strong>Manageability ${feedback.manageability ?? "—"}/5</strong>
      <span>Fidelity ease ${feedback.fidelity_ease ?? "—"}/5 · Behavior ease ${feedback.behavior_ease ?? "—"}/5</span>
      ${feedback.first_change ? `<small>First change: ${feedback.first_change}</small>` : ""}
    </div>
  `;
}

function questionsCell(row) {
  if (!row) return '<span class="training-empty">Not submitted</span>';
  const text = row.scoring_questions || row.practice_requests || row.other_notes || "No questions submitted.";
  return `<span class="training-question-preview">${text}</span>`;
}

function attemptDetail(attempt, title, escapeHtml) {
  if (!attempt) return "";
  const scores = Object.entries(attempt.fidelity_scores || {})
    .map(([key,value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(scoreLabel(value))}</td><td>${escapeHtml(attempt.fidelity_outcomes?.[key] || "—")}</td></tr>`)
    .join("");
  return `
    <section class="training-detail-case">
      <h4>${escapeHtml(title)}</h4>
      <p><strong>Stored training-key fidelity agreement:</strong> ${escapeHtml(pct(attempt.teacher_fidelity_agreement))}</p>
      <p><strong>Intervals:</strong> <code class="training-interval-code">${escapeHtml(intervalCode(attempt.intervals || []))}</code></p>
      <table>
        <thead><tr><th>Target</th><th>Score</th><th>Outcome</th></tr></thead>
        <tbody>${scores}</tbody>
      </table>
      ${attempt.notes ? `<p><strong>Note:</strong> ${escapeHtml(attempt.notes)}</p>` : ""}
    </section>
  `;
}

export function renderObserverTrainingDashboard(data = {}, escapeHtml = (value) => String(value ?? "")) {
  const attempts = data.attempts || [];
  const feedback = data.feedback || [];
  const questions = data.questions || [];
  const jessNora = latest(attempts, "Jess", "nora");
  const jessKai = latest(attempts, "Jess", "kai");

  const rows = OBSERVERS.map((observer) => {
    const nora = latest(attempts, observer, "nora");
    const kai = latest(attempts, observer, "kai");
    const fb = feedback.filter((row) => row.observer_name === observer).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))[0] || null;
    const q = questions.filter((row) => row.observer_name === observer).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))[0] || null;
    const totalAttempts = attempts.filter((row) => row.observer_name === observer).length;

    return `
      <tr>
        <td><strong>${escapeHtml(observer)}</strong><small>${totalAttempts} saved attempt${totalAttempts === 1 ? "" : "s"}</small></td>
        <td>${caseCell(nora, jessNora)}</td>
        <td>${caseCell(kai, jessKai)}</td>
        <td>${feedbackCell(fb)}</td>
        <td>${questionsCell(q)}</td>
      </tr>
      <tr class="training-detail-row">
        <td colspan="5">
          <details>
            <summary>View ${escapeHtml(observer)} raw training data</summary>
            <div class="training-detail-grid">
              ${attemptDetail(nora, "Nora", escapeHtml)}
              ${attemptDetail(kai, "Kai", escapeHtml)}
              <section class="training-detail-case">
                <h4>Usability feedback</h4>
                ${fb ? `
                  <p><strong>Manageability:</strong> ${escapeHtml(fb.manageability ?? "—")}/5</p>
                  <p><strong>Could not enter fast enough:</strong> ${fb.could_not_enter ? "Yes" : "No"}</p>
                  <p><strong>Hard definitions:</strong> ${escapeHtml(fb.hard_definitions || "—")}</p>
                  <p><strong>First screen change:</strong> ${escapeHtml(fb.first_change || "—")}</p>
                  <p><strong>Questions from Nora:</strong> ${escapeHtml(fb.questions || "—")}</p>
                ` : "<p>No feedback submitted.</p>"}
              </section>
              <section class="training-detail-case">
                <h4>Q&A questions</h4>
                ${q ? `
                  <p><strong>Ambiguous/difficult:</strong> ${escapeHtml(q.scoring_questions || "—")}</p>
                  <p><strong>Practice request:</strong> ${escapeHtml(q.practice_requests || "—")}</p>
                  <p><strong>Other notes:</strong> ${escapeHtml(q.other_notes || "—")}</p>
                ` : "<p>No questions submitted.</p>"}
              </section>
            </div>
          </details>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <section class="panel observer-training-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Observer Training</p>
          <h2>Asynchronous Agreement & Form Feedback</h2>
        </div>
        <p>Training-only data. This is separate from dissertation participant observation records.</p>
      </div>
      <div class="training-legend">
        <span><strong>Key</strong> = agreement with the built-in fidelity training key</span>
        <span><strong>vs Jess</strong> = pairwise agreement with Jess's latest attempt for the same case</span>
      </div>
      <div class="table-wrap">
        <table class="training-admin-table">
          <thead><tr><th>Observer</th><th>Nora Practice</th><th>Kai Qualification</th><th>Form Feedback</th><th>Q&A</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}
