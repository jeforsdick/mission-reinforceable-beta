const TEAM_OBSERVERS = ["Austen","Casey","Melissa","Kathleen","Jakob"];
const REFERENCE_OBSERVER = "Jess";
const PASS_CRITERION = 90;

function attemptsFor(rows, observer, caseId) {
  return rows
    .filter((row) => row.observer_name === observer && row.case_id === caseId)
    .sort((a,b) => new Date(a.submitted_at) - new Date(b.submitted_at));
}

function latest(rows, observer, caseId) {
  const matches = attemptsFor(rows, observer, caseId);
  const production = matches.filter((row) => row.source_environment === "production");
  const source = production.length ? production : matches;
  return source[source.length - 1] || null;
}

function latestFor(rows, observer) {
  return rows
    .filter((row) => row.observer_name === observer)
    .sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))[0] || null;
}

function pct(value) {
  return value == null ? "—" : `${Math.round(Number(value) * 10) / 10}%`;
}

function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
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
  return { agreements, disagreements, excluded, compared, percent: compared ? (agreements / compared) * 100 : null };
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
  return { agreements, disagreements, compared, percent: compared ? (agreements / compared) * 100 : null };
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

function statusBadge(label, tone="neutral") {
  return `<span class="training-status ${tone}">${label}</span>`;
}

function noraSummary(attempt, reference) {
  if (!attempt) return { html:'<span class="training-empty">Not submitted</span>', passed:false };
  const student = reference && reference.client_submission_id !== attempt.client_submission_id
    ? intervalAgreement(attempt.intervals || [], reference.intervals || [])
    : { percent: 100 };
  const fidelity = Number(attempt.teacher_fidelity_agreement);
  const passed = fidelity >= PASS_CRITERION && Number(student.percent) >= PASS_CRITERION;
  return {
    passed,
    html:`
      <div class="training-case-clean">
        <div class="training-case-title-row"><strong>Nora practice</strong>${statusBadge(passed ? "Passed" : "Repeat needed", passed ? "pass" : "needs")}</div>
        <span>Fidelity ${pct(fidelity)} · Student ${pct(student.percent)}</span>
        <small>${dateTime(attempt.submitted_at)}</small>
      </div>`
  };
}

function kaiSummary(attempt) {
  if (!attempt) return '<div class="training-case-clean"><strong>Kai qualification</strong><span class="training-empty">Not submitted</span></div>';
  return `
    <div class="training-case-clean">
      <div class="training-case-title-row"><strong>Kai qualification</strong>${statusBadge("Submitted","submitted")}</div>
      <span>Agreement held for team review</span>
      <small>${dateTime(attempt.submitted_at)}</small>
    </div>`;
}

function attemptDetail(attempt, title, escapeHtml, {hideAgreement=false}={}) {
  if (!attempt) return "";
  const scores = Object.entries(attempt.fidelity_scores || {})
    .map(([key,value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(scoreLabel(value))}</td><td>${escapeHtml(attempt.fidelity_outcomes?.[key] || "—")}</td></tr>`)
    .join("");
  return `
    <section class="training-detail-case">
      <h4>${escapeHtml(title)}</h4>
      ${hideAgreement ? '<p><strong>Agreement:</strong> Held for team review</p>' : `<p><strong>Training-key fidelity agreement:</strong> ${escapeHtml(pct(attempt.teacher_fidelity_agreement))}</p>`}
      <p><strong>Intervals:</strong> <code class="training-interval-code">${escapeHtml(intervalCode(attempt.intervals || []))}</code></p>
      <table>
        <thead><tr><th>Target</th><th>Score</th><th>Outcome</th></tr></thead>
        <tbody>${scores}</tbody>
      </table>
      ${attempt.notes ? `<p><strong>Observer note:</strong> ${escapeHtml(attempt.notes)}</p>` : ""}
    </section>
  `;
}

function attemptHistory(rows, observer, caseId, reference, escapeHtml, {hideAgreement=false}={}) {
  const matches = attemptsFor(rows, observer, caseId);
  if (!matches.length) return "<p>No attempts submitted.</p>";
  return matches.map((attempt,index)=>{
    const student = reference && reference.client_submission_id !== attempt.client_submission_id
      ? intervalAgreement(attempt.intervals || [], reference.intervals || [])
      : null;
    const fidelity = reference && reference.client_submission_id !== attempt.client_submission_id
      ? fidelityAgreement(attempt.fidelity_scores || {}, reference.fidelity_scores || {})
      : null;
    return `
      <article class="training-history-item">
        <div><strong>Attempt ${index+1}</strong><small>${escapeHtml(dateTime(attempt.submitted_at))}</small></div>
        ${hideAgreement
          ? '<div class="history-pending"><span>Agreement</span><strong>Held for review</strong></div>'
          : `<div><span>Training key</span><strong>${escapeHtml(pct(attempt.teacher_fidelity_agreement))}</strong></div>
             <div><span>vs Jess student</span><strong>${escapeHtml(reference && reference.client_submission_id !== attempt.client_submission_id ? pct(student?.percent) : "—")}</strong></div>
             <div><span>vs Jess fidelity</span><strong>${escapeHtml(reference && reference.client_submission_id !== attempt.client_submission_id ? pct(fidelity?.percent) : "—")}</strong></div>`}
      </article>`;
  }).join("");
}

function observerCard(observer, attempts, feedbackRows, questionRows, jessNora, escapeHtml) {
  const nora=latest(attempts,observer,"nora");
  const kai=latest(attempts,observer,"kai");
  const fb=latestFor(feedbackRows,observer);
  const q=latestFor(questionRows,observer);
  const noraInfo=noraSummary(nora,jessNora);
  const pieces=[Boolean(nora),Boolean(kai),Boolean(fb),Boolean(q)];
  const complete=pieces.every(Boolean);

  return `
    <article class="training-observer-card">
      <header class="training-observer-head">
        <div><h3>${escapeHtml(observer)}</h3><span>${pieces.filter(Boolean).length}/4 training pieces submitted</span></div>
        <div class="training-head-actions">${statusBadge(complete ? "Ready for review" : "In progress",complete?"pass":"neutral")}<button class="training-details-trigger" type="button" data-training-details="${escapeHtml(observer)}">View details</button></div>
      </header>
      <div class="training-observer-cases">
        ${noraInfo.html}
        ${kaiSummary(kai)}
      </div>
      <div class="training-observer-meta">
        <div><span>Form feedback</span><strong>${fb ? `Submitted · Manageability ${escapeHtml(fb.manageability ?? "—")}/5` : "Not submitted"}</strong></div>
        <div><span>Q&A</span><strong>${q ? "Submitted" : "Not submitted"}</strong></div>
      </div>
      <details class="training-observer-details" data-training-details-panel="${escapeHtml(observer)}">
        <summary>View training details</summary>
        <div class="training-detail-grid">
          <section class="training-detail-case">
            <h4>Nora attempt history</h4>
            <div class="training-history-list">${attemptHistory(attempts,observer,"nora",jessNora,escapeHtml)}</div>
          </section>
          <section class="training-detail-case">
            <h4>Kai attempt history</h4>
            <div class="training-history-list">${attemptHistory(attempts,observer,"kai",null,escapeHtml,{hideAgreement:true})}</div>
          </section>
          ${attemptDetail(nora,"Latest Nora raw data",escapeHtml)}
          ${attemptDetail(kai,"Latest Kai raw data",escapeHtml,{hideAgreement:true})}
          <section class="training-detail-case">
            <h4>Usability feedback</h4>
            ${fb ? `
              <p><strong>Manageability:</strong> ${escapeHtml(fb.manageability ?? "—")}/5</p>
              <p><strong>Fidelity ease:</strong> ${escapeHtml(fb.fidelity_ease ?? "—")}/5</p>
              <p><strong>Behavior ease:</strong> ${escapeHtml(fb.behavior_ease ?? "—")}/5</p>
              <p><strong>Could not enter fast enough:</strong> ${fb.could_not_enter ? "Yes" : "No"}</p>
              <p><strong>Hard definitions:</strong> ${escapeHtml(fb.hard_definitions || "—")}</p>
              <p><strong>First change:</strong> ${escapeHtml(fb.first_change || "—")}</p>
              <p><strong>Nora questions:</strong> ${escapeHtml(fb.questions || "—")}</p>
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
    </article>`;
}

export function renderObserverTrainingDashboard(data={},escapeHtml=(value)=>String(value??"")) {
  const attempts=data.attempts||[];
  const feedback=data.feedback||[];
  const questions=data.questions||[];
  const jessNora=latest(attempts,REFERENCE_OBSERVER,"nora");
  const jessKai=latest(attempts,REFERENCE_OBSERVER,"kai");

  const teamNora=TEAM_OBSERVERS.map(o=>latest(attempts,o,"nora"));
  const teamKai=TEAM_OBSERVERS.map(o=>latest(attempts,o,"kai"));
  const teamFeedback=TEAM_OBSERVERS.map(o=>latestFor(feedback,o));
  const teamQuestions=TEAM_OBSERVERS.map(o=>latestFor(questions,o));
  const noraPasses=TEAM_OBSERVERS.filter((observer)=>{
    const a=latest(attempts,observer,"nora");
    return a ? noraSummary(a,jessNora).passed : false;
  }).length;

  return `
    <section class="panel observer-training-panel">
      <div class="section-heading training-heading">
        <div>
          <p class="eyebrow">Observer Training</p>
          <h2>Training Progress & Agreement</h2>
          <p class="training-subcopy">Nora is guided practice with a 90% minimum agreement criterion. Kai is the independent qualification and agreement stays hidden until team review.</p>
        </div>
        <a class="quiet training-open-link" href="/observe/" target="_blank" rel="noopener">Open Training Module ↗</a>
      </div>

      <div class="training-progress-grid">
        <div><span>Nora submitted</span><strong>${teamNora.filter(Boolean).length}/${TEAM_OBSERVERS.length}</strong></div>
        <div><span>Nora passed</span><strong>${noraPasses}/${TEAM_OBSERVERS.length}</strong></div>
        <div><span>Kai submitted</span><strong>${teamKai.filter(Boolean).length}/${TEAM_OBSERVERS.length}</strong></div>
        <div><span>Feedback + Q&A complete</span><strong>${TEAM_OBSERVERS.filter((_,i)=>teamFeedback[i]&&teamQuestions[i]).length}/${TEAM_OBSERVERS.length}</strong></div>
      </div>

      <div class="training-reference-card">
        <div>
          <p class="eyebrow">Reference Coding</p>
          <h3>Jess</h3>
        </div>
        <div><span>Nora reference</span><strong>${jessNora ? `Locked · ${jessNora.intervals?.length || 0} intervals` : "Not submitted"}</strong></div>
        <div><span>Kai reference</span><strong>${jessKai ? "Submitted · finalize before team review" : "Not submitted"}</strong></div>
        <details class="training-reference-details">
          <summary>View Jess reference data</summary>
          <div class="training-detail-grid">
            ${attemptDetail(jessNora,"Nora reference coding",escapeHtml)}
            ${attemptDetail(jessKai,"Kai reference coding",escapeHtml,{hideAgreement:true})}
          </div>
        </details>
      </div>

      <div class="training-observer-grid">
        ${TEAM_OBSERVERS.map(observer=>observerCard(observer,attempts,feedback,questions,jessNora,escapeHtml)).join("")}
      </div>
    </section>`;
}
