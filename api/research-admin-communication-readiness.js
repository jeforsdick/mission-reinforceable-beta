'use strict';

const { authorize, json, supabaseFetch, UUID_PATTERN } = require('./research-admin-server');
const { configuration } = require('../server/game-login-email');
const sendGameLogin = require('../server/research-admin-send-game-login');
const { qualtricsConfiguration } = require('../server/weekly-checkin-service');

module.exports = async function handler(request, response) {
  if (request.method === 'POST') return sendGameLogin(request, response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Method not allowed' });
  }
  try {
    await authorize(request);
    const caseId = request.query?.case_id;
    if (caseId && !UUID_PATTERN.test(caseId)) return json(response, 400, { error: 'Invalid case.' });
    let latest = null;
    if (caseId) {
      const auditResponse = await supabaseFetch(`/rest/v1/research_intervention_launch_events?case_id=eq.${caseId}&action=in.(game_login_email_sent,game_login_email_failed)&select=action,recorded_at&order=recorded_at.desc&limit=1`);
      if (auditResponse.ok) latest = (await auditResponse.json())[0] || null;
    }
    const result = {
      teacher_reminder_system_enabled: process.env.TEACHER_REMINDER_SYSTEM_ENABLED === 'true',
      game_login_email_enabled: configuration().enabled,
      weekly_qualtrics_configured: qualtricsConfiguration().configured
    };
    if (latest) result.game_login_email_status = { outcome: latest.action === 'game_login_email_sent' ? 'sent' : 'failed', recorded_at: latest.recorded_at };
    return json(response, 200, result);
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || 'Request failed' });
  }
};
