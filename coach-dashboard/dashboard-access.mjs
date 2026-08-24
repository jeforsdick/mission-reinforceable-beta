export function canAccessCoachDashboard(profile) {
  return Boolean(profile?.active && ['coach', 'research_admin'].includes(profile.role));
}

async function loadCaseDetails(client, caseIds, cases) {
  if (!caseIds.length) return [];
  const queries = await Promise.all([
    client.from('case_intake').select('case_id, teacher_name, student_initials, grade_level, has_crisis_plan').in('case_id', caseIds),
    client.from('fidelity_targets').select('id, case_id, domain, description, sort_order').in('case_id', caseIds).eq('active', true).order('sort_order'),
    client.from('game_sessions').select('id, case_id, mission_id, mission_title, started_at, ended_at, status, score, max_score, duration_seconds, active_duration_seconds, plan_aligned_count, refine_count, missed_count, total_hints_opened, qa_mode').in('case_id', caseIds).eq('qa_mode', false).order('started_at', { ascending: false }),
    client.from('game_responses').select('id, session_id, case_id, fidelity_target_id, fidelity_domain, alignment, hint_opened, hint_open_count, created_at, qa_mode').in('case_id', caseIds).eq('qa_mode', false),
    client.from('game_resource_events').select('id, participant_id, case_id, event_name, section_key, game_content_version, qa_mode, occurred_at').in('case_id', caseIds).eq('qa_mode', false).order('occurred_at', { ascending: true })
  ]);
  const failed = queries.find(result => result.error);
  if (failed) throw failed.error;
  const [intakes, targets, sessions, responses, resourceEvents] = queries.map(result => result.data || []);
  const summaries = await Promise.all(cases.map(async row => {
    const latest = sessions.filter(item => item.case_id === row.id && item.status === 'completed')[0];
    if (!latest || typeof client.rpc !== 'function') return null;
    const { denverDateKey } = await import('./dashboard-metrics.mjs');
    const date = denverDateKey(latest.ended_at || latest.started_at);
    const day = new Date(`${date}T12:00:00Z`); const offset = (day.getUTCDay() || 7) - 1; day.setUTCDate(day.getUTCDate() - offset);
    const start = day.toISOString().slice(0, 10); day.setUTCDate(day.getUTCDate() + 4);
    const result = await client.rpc('mission_adherence_summary', { target_case_id: row.id, period_start: start, period_end: day.toISOString().slice(0, 10) });
    if (result.error) throw result.error;
    return result.data;
  }));
  return cases.map((row,index) => ({ id: row.id, intake: intakes.find(item => item.case_id === row.id) || null, targets: targets.filter(item => item.case_id === row.id), sessions: sessions.filter(item => item.case_id === row.id), responses: responses.filter(item => item.case_id === row.id), resourceEvents: resourceEvents.filter(item => item.case_id === row.id), missionAdherence: summaries[index] }));
}

export async function loadDashboardCases(client, userId, role) {
  let cases;
  if (role === 'coach') {
    // Keep coach access assignment-scoped in addition to the existing case-aware RLS.
    const { data: assignments, error: assignmentError } = await client.from('case_coaches').select('case_id').eq('coach_user_id', userId).eq('active', true);
    if (assignmentError) throw assignmentError;
    const caseIds = (assignments || []).map(row => row.case_id);
    if (!caseIds.length) return [];
    const result = await client.from('cases').select('id, active').in('id', caseIds).eq('active', true);
    if (result.error) throw result.error;
    cases = result.data || [];
  } else if (role === 'research_admin') {
    // Research admins rely on their existing RLS grants and never need coach assignments.
    const result = await client.from('cases').select('id, active').eq('active', true);
    if (result.error) throw result.error;
    cases = result.data || [];
  } else {
    return [];
  }
  return loadCaseDetails(client, cases.map(row => row.id), cases);
}
