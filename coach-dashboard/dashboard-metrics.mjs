export const DOMAINS = ['proactive', 'teaching', 'reinforcement', 'response', 'crisis'];
export const DOMAIN_LABELS = { proactive: 'Proactive', teaching: 'Teaching', reinforcement: 'Reinforcement', response: 'Response', crisis: 'Crisis' };
export const MIN_OPPORTUNITIES = 2;

// These are the canonical Resource Map keys and titles used by game/js/resources.js.
export const RESOURCE_SECTION_LABELS = {
  bip: 'BIP at a Glance',
  functionForest: 'Function Forest',
  prevention: 'Prevention Palace',
  replacement: 'Replacement Reservoir',
  reinforcement: 'Reinforcement Ridge',
  errorCorrection: 'Error Correction Canyon',
  library: 'BSP Library',
  coaching: 'Coaching Cottage',
  fidelity: 'Fidelity Fortress'
};

export function resourceMapUse(events = []) {
  const relevant = events.filter(row => ['resources_opened', 'resource_section_opened'].includes(row?.event_name));
  const sectionKeys = [...new Set(relevant
    .filter(row => row.event_name === 'resource_section_opened' && RESOURCE_SECTION_LABELS[row.section_key])
    .map(row => row.section_key))];
  return { visited: relevant.length > 0, sectionCount: sectionKeys.length, sectionNames: sectionKeys.map(key => RESOURCE_SECTION_LABELS[key]) };
}

export function percent(aligned, total) {
  return total > 0 ? Math.round((aligned / total) * 100) : null;
}

export function recentSessions(sessions, limit = 5) {
  return [...sessions].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, limit);
}

export function sessionPercent(session, responses = []) {
  const linked = responses.filter(row => row.session_id === session.id);
  if (linked.length) return percent(linked.filter(row => row.alignment === 'plan_aligned').length, linked.length);
  const total = Number(session.plan_aligned_count || 0) + Number(session.refine_count || 0) + Number(session.missed_count || 0);
  return percent(Number(session.plan_aligned_count || 0), total);
}

const TARGET_ALIGNMENT_PERCENT = {
  plan_aligned: 100,
  workable_refine: 50,
  missed_opportunity: 0
};

export function targetPerformance(responses = []) {
  if (!responses.length) return { percent: null, emptyLabel: 'No linked opportunities' };
  const scored = responses
    .map(row => TARGET_ALIGNMENT_PERCENT[row.alignment])
    .filter(value => value !== undefined);
  if (!scored.length) return { percent: null, emptyLabel: 'No scored opportunities' };
  return { percent: Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length), emptyLabel: null };
}

export function analyzeCase(caseData, now = new Date()) {
  const studySessions = (caseData.sessions || []).filter(row => row.qa_mode !== true);
  const sessions = recentSessions(studySessions);
  const ids = new Set(sessions.map(row => row.id));
  const responses = (caseData.responses || []).filter(row => row.qa_mode !== true && ids.has(row.session_id));
  const crisisRelevant = Boolean(caseData.intake?.has_crisis_plan);
  const domains = DOMAINS.filter(domain => domain !== 'crisis' || crisisRelevant).map(domain => {
    const rows = responses.filter(row => row.fidelity_domain === domain);
    return { domain, opportunities: rows.length, aligned: rows.filter(row => row.alignment === 'plan_aligned').length, percent: percent(rows.filter(row => row.alignment === 'plan_aligned').length, rows.length) };
  });
  const eligible = domains.filter(row => row.opportunities >= MIN_OPPORTUNITIES);
  const weak = eligible.filter(row => row.percent < 80).sort((a, b) => a.percent - b.percent || DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain));
  const focus = weak[0] ? DOMAIN_LABELS[weak[0].domain] : eligible.length === domains.length && domains.length ? 'Maintain & generalize' : 'More practice needed';
  const allPercent = percent(responses.filter(row => row.alignment === 'plan_aligned').length, responses.length);
  const weekStart = new Date(now); weekStart.setUTCDate(weekStart.getUTCDate() - 6); weekStart.setUTCHours(0, 0, 0, 0);
  const thisWeek = studySessions.filter(row => new Date(row.started_at) >= weekStart && new Date(row.started_at) <= now).length;
  return { sessions, responses, domains, focus, planAlignedPercent: allPercent, thisWeek, hintCount: responses.filter(row => row.hint_opened || Number(row.hint_open_count) > 0).length, totalDecisions: responses.length, totalSeconds: sessions.reduce((sum, row) => sum + Number(row.active_duration_seconds ?? row.duration_seconds ?? 0), 0) };
}

export function coachingCopy(analysis) {
  const measured = analysis.domains.filter(row => row.opportunities >= MIN_OPPORTUNITIES);
  if (!measured.length) return { summary: 'More practice data is needed before a coaching pattern can be identified.', move: 'Encourage the teacher to complete a few practice sessions, then revisit the fidelity pattern.' };
  if (analysis.focus === 'Maintain & generalize') return { summary: 'Recent practice is strong across the fidelity areas with enough opportunities.', move: 'Rehearse how these plan-aligned actions can be used consistently across another likely classroom routine.' };
  if (analysis.focus === 'More practice needed') return { summary: 'Some fidelity areas have practice data, but more opportunities are needed to identify a reliable coaching pattern.', move: 'Complete additional practice that samples each active fidelity area.' };
  const weakest = measured.find(row => DOMAIN_LABELS[row.domain] === analysis.focus);
  const strengths = measured.filter(row => row.percent >= 80 && row !== weakest).map(row => DOMAIN_LABELS[row.domain].toLowerCase());
  const lead = strengths.length ? `${strengths.join(' and ')} strategies are showing strong practice performance. ` : '';
  return { summary: `${lead}${analysis.focus} is less consistent in recent practice and may benefit from focused rehearsal.`, move: `Review the active ${analysis.focus.toLowerCase()} targets, then rehearse one likely classroom example with specific, observable teacher language.` };
}

export function statusFor(analysis) {
  if (analysis.focus === 'More practice needed') return 'watch';
  if (analysis.focus === 'Maintain & generalize') return 'strong';
  const focused = analysis.domains.find(row => DOMAIN_LABELS[row.domain] === analysis.focus);
  return focused && focused.percent < 60 ? 'priority' : 'watch';
}

export function denverDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

const GRANITE_CLOSURES = new Set(['2026-09-07','2026-09-18','2026-10-15','2026-10-16','2026-10-19','2026-10-20','2026-11-25','2026-11-26','2026-11-27','2026-12-21','2026-12-22','2026-12-23','2026-12-24','2026-12-25','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-04','2027-01-18','2027-02-12','2027-02-15','2027-02-16','2027-03-12','2027-03-15','2027-03-29','2027-03-30','2027-03-31','2027-04-01','2027-04-02','2027-04-05']);
function datePlus(key, days) { const date=new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
function mondayFor(key) { const date=new Date(`${key}T12:00:00Z`); return datePlus(key, -(date.getUTCDay() || 7) + 1); }
function isStudyDay(key) { return key >= '2026-08-12' && key <= '2027-05-26' && !GRANITE_CLOSURES.has(key); }

export function weeklyPracticeSnapshot(caseData) {
  const completed=(caseData.sessions||[]).filter(row=>row.qa_mode!==true&&row.status==='completed').sort((a,b)=>new Date(b.ended_at||b.started_at)-new Date(a.ended_at||a.started_at));
  if (!completed.length) return null;
  const week_start=mondayFor(denverDateKey(completed[0].ended_at||completed[0].started_at)), week_end=datePlus(week_start,4);
  const sessions=completed.filter(row=>{const key=denverDateKey(row.ended_at||row.started_at);return key>=week_start&&key<=week_end;});
  const scored=sessions.filter(row=>Number(row.max_score)>0&&Number.isFinite(Number(row.score)));
  const score=scored.reduce((sum,row)=>sum+Number(row.score),0), maxScore=scored.reduce((sum,row)=>sum+Number(row.max_score),0);
  const scheduled_study_days=Array.from({length:5},(_,i)=>datePlus(week_start,i)).filter(isStudyDay).length;
  return { checkin:{week_start,week_end,scheduled_study_days}, missionsCompleted:sessions.length, averageScore:maxScore>0?Math.round(score/maxScore*100):null, mostRecentScore:scored.length?Math.round(Number(scored[0].score)/Number(scored[0].max_score)*100):null };
}
