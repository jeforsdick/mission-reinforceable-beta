export const DOMAINS = ['proactive', 'teaching', 'reinforcement', 'response', 'crisis'];
export const DOMAIN_LABELS = { proactive: 'Proactive', teaching: 'Teaching', reinforcement: 'Reinforcement', response: 'Response', crisis: 'Crisis' };
export const MIN_OPPORTUNITIES = 2;

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
