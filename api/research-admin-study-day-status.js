'use strict';
const server = require('./research-admin-server');
const { issueStatusUrls, dateParts, TIMEZONE, REASONS } = require('../server/study-day-status-service');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function rows(path) {
  const response = await server.supabaseFetch(path);
  if (!response.ok) throw new Error('Study-day context could not be loaded');
  return response.json();
}
function requestOrigin(request) {
  const protocol = String(request.headers?.['x-forwarded-proto'] || '').trim().toLowerCase();
  const host = String(request.headers?.['x-forwarded-host'] || request.headers?.host || '').trim();
  if (!protocol || !host || protocol.includes(',') || host.includes(',')) throw new Error('Trusted request origin unavailable');
  return new URL(`${protocol}://${host}`).origin;
}
module.exports = async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  try {
    await server.authorize(request);
    const body = request.body || {};
    if (!UUID.test(body.case_id || '') || !['history', 'generate_qa'].includes(body.action)) return server.json(response, 400, { error: 'Invalid request' });
    const participants = await rows(`/rest/v1/participants?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,case_id,participant_code,cases!inner(case_code)&limit=1`);
    if (participants.length !== 1) return server.json(response, 404, { error: 'Participant not found' });
    const participant = participants[0];
    if (body.action === 'generate_qa') {
      const qa = participant.participant_code === 'MR-998' || ['MR-998', 'CASE-998'].includes(participant.cases?.case_code);
      if (!qa) return server.json(response, 403, { error: 'Status-link QA is restricted to MR-998.' });
      const studyDate = dateParts(new Date(), TIMEZONE);
      const origin = requestOrigin(request);
      const urls = await issueStatusUrls({ participantId: participant.id, caseId: participant.case_id, studyDate, origin });
      return server.json(response, 200, { study_date: studyDate, urls, email_sent: false, export_fixture: true });
    }
    const [history, current, adherence] = await Promise.all([
      rows(`/rest/v1/participant_study_day_status_events?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,study_date,reason,source,recorded_at,supersedes_event_id,recorded_by_type&order=study_date.desc,recorded_at.desc,id.desc`),
      (async () => {
        const rpc = await server.supabaseFetch('/rest/v1/rpc/current_participant_study_day_status', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: body.case_id }) });
        if (!rpc.ok) throw new Error('Current study-day context could not be derived');
        return rpc.json();
      })(),
      (async () => {
        const rpc = await server.supabaseFetch('/rest/v1/rpc/mission_adherence_summary', { method: 'POST', body: JSON.stringify({ target_case_id: body.case_id, period_start: '2026-08-12', period_end: dateParts(new Date(), TIMEZONE) }) });
        if (!rpc.ok) throw new Error('Mission adherence summary could not be derived');
        return rpc.json();
      })()
    ]);
    return server.json(response, 200, { history, current, adherence, reasons: REASONS });
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
