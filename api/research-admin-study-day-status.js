'use strict';
const server = require('./research-admin-server');
const { issueStatusUrls, dateParts, TIMEZONE, REASONS } = require('../server/study-day-status-service');
const weekly = require('../server/weekly-checkin-service');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function rows(path, options) {
  const response = await server.supabaseFetch(path, options);
  if (!response.ok) throw new Error('Study-day context could not be loaded');
  return response.json();
}
function requestOrigin(request) {
  const protocol = String(request.headers?.['x-forwarded-proto'] || '').trim().toLowerCase();
  const host = String(request.headers?.['x-forwarded-host'] || request.headers?.host || '').trim();
  if (!protocol || !host || protocol.includes(',') || host.includes(',')) throw new Error('Trusted request origin unavailable');
  return new URL(`${protocol}://${host}`).origin;
}
function previousDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
function interventionAdherencePeriod(history = [], denverToday) {
  // A later append for the same effective date is the authoritative correction.
  const currentByDate = new Map([...history].sort((a, b) =>
    String(a.effective_date).localeCompare(String(b.effective_date)) ||
    String(a.recorded_at).localeCompare(String(b.recorded_at)) || String(a.id).localeCompare(String(b.id))
  ).map(row => [row.effective_date, row]));
  const phases = [...currentByDate.values()].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  const intervention = phases.find(row => row.phase === 'intervention');
  if (!intervention) return null;
  const next = phases.find(row => row.effective_date > intervention.effective_date && row.phase !== 'intervention');
  const periodEnd = next && next.effective_date <= denverToday ? previousDate(next.effective_date) : denverToday;
  return { period_start: intervention.effective_date, period_end: periodEnd, ended_before: next?.effective_date || null };
}
module.exports = async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  try {
    await server.authorize(request);
    const body = request.body || {};
    if (!UUID.test(body.case_id || '') || !['history', 'generate_qa', 'generate_weekly_qa'].includes(body.action)) return server.json(response, 400, { error: 'Invalid request' });
    const participants = await rows(`/rest/v1/participants?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,case_id,participant_code,cases!inner(case_code)&limit=1`);
    if (participants.length !== 1) return server.json(response, 404, { error: 'Participant not found' });
    const participant = participants[0];
    if (body.action === 'generate_weekly_qa') {
      if (participant.participant_code !== 'MR-998' || !/^\d{4}-\d{2}-\d{2}$/.test(body.week_start || '')) return server.json(response, 403, { error: 'Weekly check-in QA is restricted to MR-998.' });
      const raw = weekly.createRawToken(), tokenHash = weekly.hashToken(raw);
      const rpc = await server.supabaseFetch('/rest/v1/rpc/research_admin_generate_weekly_checkin', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: participant.case_id, target_week_start: body.week_start, target_token_hash: tokenHash }) });
      if (!rpc.ok) return server.json(response, 409, { error: 'Weekly check-in could not be generated' });
      const weeklyRows = await rows('/rest/v1/rpc/research_admin_weekly_checkins', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: participant.case_id }) });
      const origin = requestOrigin(request);
      const weekNumber = weeklyRows.findIndex(row => row.week_start === body.week_start) + 1;
      if (!weekNumber) return server.json(response, 409, { error: 'Intervention week could not be resolved' });
      return server.json(response, 200, { qualtrics_url: weekly.buildQualtricsUrl(raw, participant.participant_code, weekNumber), completion_test_url: weekly.completionUrl(raw, origin), qualtrics_configured: weekly.qualtricsConfiguration().configured, email_sent: false, message: 'No email sent.' });
    }
    if (body.action === 'generate_qa') {
      const qa = participant.participant_code === 'MR-998' || ['MR-998', 'CASE-998'].includes(participant.cases?.case_code);
      if (!qa) return server.json(response, 403, { error: 'Status-link QA is restricted to MR-998.' });
      const studyDate = dateParts(new Date(), TIMEZONE);
      const origin = requestOrigin(request);
      const urls = await issueStatusUrls({ participantId: participant.id, caseId: participant.case_id, studyDate, origin });
      return server.json(response, 200, { study_date: studyDate, urls, email_sent: false, export_fixture: true });
    }
    const [history, current, phaseHistory] = await Promise.all([
      rows(`/rest/v1/participant_study_day_status_events?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,study_date,reason,source,recorded_at,supersedes_event_id,recorded_by_type&order=study_date.desc,recorded_at.desc,id.desc`),
      (async () => {
        const rpc = await server.supabaseFetch('/rest/v1/rpc/current_participant_study_day_status', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: body.case_id }) });
        if (!rpc.ok) throw new Error('Current study-day context could not be derived');
        return rpc.json();
      })(),
      rows(`/rest/v1/research_case_phase_events?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,phase,effective_date,recorded_at&order=effective_date.asc,recorded_at.asc,id.asc`)
    ]);
    const period = interventionAdherencePeriod(phaseHistory, dateParts(new Date(), TIMEZONE));
    let adherence = null;
    if (period && period.period_end >= period.period_start) {
      const rpc = await server.supabaseFetch('/rest/v1/rpc/mission_adherence_summary', { method: 'POST', body: JSON.stringify({ target_case_id: body.case_id, period_start: period.period_start, period_end: period.period_end }) });
      if (!rpc.ok) throw new Error('Mission adherence summary could not be derived');
      adherence = await rpc.json();
    }
    return server.json(response, 200, { history, current, adherence, adherence_period: period, adherence_state: period ? 'available' : 'intervention_not_started', reasons: REASONS });
  } catch (error) {
    console.error('Research Admin study-day context request failed', {
      action: request.body?.action,
      case_id: request.body?.case_id,
      message: error.message
    });
    return server.json(response, error.status || 500, { error: error.status ? error.message : 'Study-day context request failed' });
  }
};

module.exports.requestOrigin = requestOrigin;
module.exports.interventionAdherencePeriod = interventionAdherencePeriod;
