'use strict';

const { authorize, json, supabaseFetch, UUID_PATTERN } = require('./research-admin-server');
const { configuration } = require('../server/game-login-email');
const sendGameLogin = require('../server/research-admin-send-game-login');
const weeklyCheckin = require('../server/weekly-checkin-service');
const { measureConfiguration } = require('../server/qualtrics-measures');
const { denverDate, loadWeeklySummary } = require('../server/weekly-recap-service');
const { buildWeeklyRecapEmail } = require('../server/weekly-recap-email');

async function weeklyParticipant(caseId) {
  const lookup = await supabaseFetch(`/rest/v1/participants?case_id=eq.${encodeURIComponent(caseId)}&select=id,case_id,participant_code,is_test,auth_user_id&limit=2`);
  if (!lookup.ok) throw Object.assign(new Error('Weekly email participant lookup failed'), { status: 502 });
  const rows = await lookup.json();
  if (rows.length !== 1) throw Object.assign(new Error('Case participant not found'), { status: 404 });
  const participant = rows[0];
  const profileLookup = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(participant.auth_user_id)}&select=display_name&limit=1`);
  participant.teacher_name = profileLookup.ok ? (await profileLookup.json())[0]?.display_name || null : null;
  return participant;
}

async function weeklyContext(participant) {
  const phasesResponse = await supabaseFetch(`/rest/v1/research_case_phase_events?case_id=eq.${encodeURIComponent(participant.case_id)}&select=id,phase,effective_date,recorded_at&order=effective_date.asc,recorded_at.asc,id.asc`);
  if (!phasesResponse.ok) throw Object.assign(new Error('Intervention week could not be loaded'), { status: 502 });
  const current = weeklyCheckin.interventionWeekContext(await phasesResponse.json(), denverDate());
  const checkinsResponse = await supabaseFetch('/rest/v1/rpc/research_admin_weekly_checkins', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: participant.case_id }) });
  if (!checkinsResponse.ok) throw Object.assign(new Error('Weekly administration status could not be loaded'), { status: 502 });
  const checkins = await checkinsResponse.json();
  return { current, checkins, administration: current ? checkins.find(row => row.week_start === current.week_start) || null : null };
}

async function issueSecureWeeklyUrl(participant, context) {
  if (!context.current) throw Object.assign(new Error('There is no eligible current intervention week.'), { status: 409 });
  if (!weeklyCheckin.qualtricsConfiguration().configured) throw Object.assign(new Error('Weekly Qualtrics survey is not configured.'), { status: 503 });
  const rawToken = weeklyCheckin.createRawToken();
  const generated = await supabaseFetch('/rest/v1/rpc/research_admin_generate_weekly_checkin', { method: 'POST', body: JSON.stringify({ target_participant_id: participant.id, target_case_id: participant.case_id, target_week_start: context.current.week_start, target_token_hash: weeklyCheckin.hashToken(rawToken) }) });
  if (!generated.ok) throw Object.assign(new Error('Weekly check-in could not be generated'), { status: 409 });
  const url = weeklyCheckin.buildQualtricsUrl(rawToken, participant.participant_code, context.current.week_number);
  return url;
}

module.exports = async function handler(request, response) {
  if (request.method === 'POST' && request.body?.action === 'send_game_login') return sendGameLogin(request, response);
  if (request.method === 'POST') {
    try {
      await authorize(request);
      const body = request.body || {};
      if (!UUID_PATTERN.test(body.case_id || '')) return json(response, 400, { error: 'Invalid case.' });
      if (body.action === 'preview_weekly_email' || body.action === 'send_weekly_test') {
        const participant = await weeklyParticipant(body.case_id);
        if (!participant.is_test) return json(response, 403, { error: 'Weekly test email is restricted to explicitly marked test participants.' });
        if (!process.env.TEACHER_GAME_URL) return json(response, 503, { error: 'Test email configuration is incomplete.' });
        const context = await weeklyContext(participant);
        if (!context.current) return json(response, 409, { error: 'There is no eligible current intervention week.' });
        const summary = await loadWeeklySummary(body.case_id, supabaseFetch, new Date(`${context.current.week_end}T18:00:00Z`));
        const secureUrl = await issueSecureWeeklyUrl(participant, context);
        const email = buildWeeklyRecapEmail({ summary, weeklyQualtricsUrl: secureUrl, teacherName: participant.teacher_name, assetOrigin: process.env.TEACHER_GAME_URL });
        if (body.action === 'preview_weekly_email') return json(response, 200, { subject: email.subject, html: email.html, text: email.text, summary, week: context.current });
        if (!process.env.TEST_EMAIL_RECIPIENT || !process.env.RESEND_API_KEY) return json(response, 503, { error: 'Test email configuration is incomplete.' });
        const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: email.from, to: [process.env.TEST_EMAIL_RECIPIENT], subject: `[TEST] ${email.subject}`, html: email.html, text: email.text }) });
        if (!sent.ok) return json(response, 502, { error: 'Weekly test email could not be sent.' });
        const provider = await sent.json();
        return json(response, 200, { success: true, recipient: process.env.TEST_EMAIL_RECIPIENT, message_id: provider.id || null });
      }
      return json(response, 400, { error: 'Invalid action.' });
    } catch (error) { return json(response, error.status || 500, { error: error.message || 'Request failed' }); }
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Method not allowed' });
  }
  try {
    await authorize(request);
    const caseId = request.query?.case_id;
    if (caseId && !UUID_PATTERN.test(caseId)) return json(response, 400, { error: 'Invalid case.' });
    let latest = null, participantCode = null;
    let weeklyEmail = null;
    if (caseId) {
      const participantResponse = await supabaseFetch(`/rest/v1/participants?case_id=eq.${encodeURIComponent(caseId)}&select=participant_code&limit=2`);
      if (!participantResponse.ok) throw Object.assign(new Error('Participant lookup failed'), { status: 502 });
      const participants = await participantResponse.json();
      if (participants.length !== 1 || !participants[0].participant_code) throw Object.assign(new Error('Case participant not found'), { status: 404 });
      participantCode = participants[0].participant_code;
      const auditResponse = await supabaseFetch(`/rest/v1/research_intervention_launch_events?case_id=eq.${caseId}&action=in.(game_login_email_sent,game_login_email_failed)&select=action,recorded_at&order=recorded_at.desc&limit=1`);
      if (auditResponse.ok) latest = (await auditResponse.json())[0] || null;
      const participant = await weeklyParticipant(caseId);
      let summary = null, summaryReason = null;
      try { summary = await loadWeeklySummary(caseId, supabaseFetch); } catch (error) { summaryReason = error.message; }
      const context = await weeklyContext(participant);
      const surveyConfigured = weeklyCheckin.qualtricsConfiguration().configured;
      weeklyEmail = {
        qualtrics_configured: surveyConfigured,
        current_week: context.current,
        administration: context.administration,
        summary,
        summary_available: Boolean(summary),
        summary_reason: summaryReason,
        test_email_available: participant.is_test && surveyConfigured && Boolean(context.current) && Boolean(summary) && Boolean(process.env.TEST_EMAIL_RECIPIENT && process.env.RESEND_API_KEY && process.env.TEACHER_GAME_URL),
        test_email_reason: !participant.is_test ? 'Participant is not explicitly marked as test' : !surveyConfigured ? 'Weekly Qualtrics survey is not configured' : !context.current ? 'No eligible current intervention week' : summaryReason
      };
    }
    const result = {
      teacher_reminder_system_enabled: process.env.TEACHER_REMINDER_SYSTEM_ENABLED === 'true',
      game_login_email_enabled: configuration().enabled,
      weekly_qualtrics_configured: weeklyCheckin.qualtricsConfiguration().configured,
      qualtrics_measures: measureConfiguration(participantCode)
    };
    if (weeklyEmail) result.weekly_email = weeklyEmail;
    if (latest) result.game_login_email_status = { outcome: latest.action === 'game_login_email_sent' ? 'sent' : 'failed', recorded_at: latest.recorded_at };
    return json(response, 200, result);
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || 'Request failed' });
  }
};
