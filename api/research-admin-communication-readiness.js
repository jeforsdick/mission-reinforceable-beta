'use strict';

const { authorize, json, supabaseFetch, UUID_PATTERN } = require('./research-admin-server');
const { configuration } = require('../server/game-login-email');
const sendGameLogin = require('../server/research-admin-send-game-login');
const sendOrientation = require('../server/research-admin-send-orientation');
const { KINDS, deliver: deliverQaEmail } = require('../server/qa-teacher-email-service');
const weeklyCheckin = require('../server/weekly-checkin-service');
const { measureConfiguration } = require('../server/qualtrics-measures');
const { denverDate, loadWeeklySummary } = require('../server/weekly-recap-service');
const { buildWeeklyRecapEmail } = require('../server/weekly-recap-email');

async function researchAdminEmail(actor) {
  const response = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(actor.id)}&select=email,role,active&limit=1`);
  if (!response.ok) throw Object.assign(new Error('Research Admin email lookup failed'), { status: 502 });
  const rows = await response.json();
  const profile = rows[0];
  const email = String(profile?.email || actor.email || '').trim().toLowerCase();
  if (!profile || profile.role !== 'research_admin' || profile.active !== true || !email) {
    throw Object.assign(new Error('Signed-in Research Admin email is unavailable.'), { status: 409 });
  }
  return email;
}

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
  let administration = null;
  if (current) {
    const checkinResponse = await supabaseFetch(
      `/rest/v1/participant_weekly_checkins?participant_id=eq.${encodeURIComponent(participant.id)}&case_id=eq.${encodeURIComponent(participant.case_id)}&week_start=eq.${encodeURIComponent(current.week_start)}&select=week_start,week_end,link_issued_at,completed_at,qa_mode&limit=2`
    );
    if (!checkinResponse.ok) throw Object.assign(new Error('Weekly administration status could not be loaded'), { status: 502 });
    const rows = await checkinResponse.json();
    if (rows.length > 1) throw Object.assign(new Error('Weekly administration status is ambiguous'), { status: 409 });
    if (rows.length === 1) {
      administration = {
        ...rows[0],
        expected: true,
        status: rows[0].completed_at ? 'complete' : rows[0].link_issued_at ? 'link_issued' : 'due'
      };
    }
  }
  return { current, administration };
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
  if (request.method === 'POST' && ['send_game_login','send_account_setup'].includes(request.body?.action)) return sendGameLogin(request, response);
  if (request.method === 'POST' && request.body?.action === 'send_orientation') return sendOrientation(request, response);
  if (request.method === 'POST') {
    try {
      const actor = await authorize(request);
      const body = request.body || {};
      if (!UUID_PATTERN.test(body.case_id || '')) return json(response, 400, { error: 'Invalid case.' });
      if (['send_qa_daily', 'send_qa_weekly'].includes(body.action)) {
        if (Object.keys(body).sort().join(',') !== 'action,case_id') {
          return json(response, 400, { error: 'Exactly action and case_id are required for QA sends.' });
        }
        const kind = body.action === 'send_qa_daily' ? KINDS.DAILY : KINDS.WEEKLY;
        const result = await deliverQaEmail(kind, { caseId:body.case_id,manual:true });
        return json(response, result.failed ? 502 : 200, result);
      }
      if (body.action === 'start_intervention') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.effective_date || '')) return json(response, 400, { error: 'Valid intervention start date is required.' });
        if (typeof body.baseline_pattern_reviewed !== 'boolean' || typeof body.recent_series_reviewed !== 'boolean' || typeof body.orientation_completed !== 'boolean') {
          return json(response, 400, { error: 'Baseline review and launch-orientation confirmations are required.' });
        }
        const note = String(body.decision_note || '').trim();
        if (!note || note.length > 1000) return json(response, 400, { error: 'A brief visual-analysis decision note is required (1000 characters maximum).' });
        if (process.env.TEACHER_REMINDER_SYSTEM_ENABLED !== 'true') {
          return json(response, 503, { error: 'Production daily reminder delivery has not been enabled. Intervention cannot start until prompts can be delivered.' });
        }
        const rpcResponse = await supabaseFetch('/rest/v1/rpc/research_admin_start_intervention_v2', {
          method: 'POST',
          body: JSON.stringify({
            target_case_id: body.case_id,
            target_effective_date: body.effective_date,
            target_baseline_pattern_reviewed: body.baseline_pattern_reviewed,
            target_recent_series_reviewed: body.recent_series_reviewed,
            target_orientation_completed: body.orientation_completed,
            target_decision_note: note,
            target_actor_id: actor.id
          })
        });
        const result = await rpcResponse.json().catch(() => null);
        if (!rpcResponse.ok) return json(response, rpcResponse.status || 400, { error: result?.message || 'Intervention start failed' });
        return json(response, 200, result);
      }
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
        const testRecipient = await researchAdminEmail(actor);
        if (!process.env.RESEND_API_KEY) return json(response, 503, { error: 'Resend email delivery is not configured in production.' });
        const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: email.from, to: [testRecipient], subject: `[TEST] ${email.subject}`, html: email.html, text: email.text }) });
        if (!sent.ok) return json(response, 502, { error: 'Weekly test email could not be sent.' });
        const provider = await sent.json();
        return json(response, 200, { success: true, recipient: testRecipient, message_id: provider.id || null });
      }
      return json(response, 400, { error: 'Invalid action.' });
    } catch (error) { return json(response, error.status || 500, { error: error.message || 'Request failed' }); }
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: 'Method not allowed' });
  }
  try {
    const actor = await authorize(request);
    const caseId = request.query?.case_id;
    if (caseId && !UUID_PATTERN.test(caseId)) return json(response, 400, { error: 'Invalid case.' });
    let latest = null, resultAccountSetup = null, participantCode = null;
    let weeklyEmail = null;
    if (caseId) {
      const participantResponse = await supabaseFetch(`/rest/v1/participants?case_id=eq.${encodeURIComponent(caseId)}&select=participant_code&limit=2`);
      if (!participantResponse.ok) throw Object.assign(new Error('Participant lookup failed'), { status: 502 });
      const participants = await participantResponse.json();
      if (participants.length !== 1 || !participants[0].participant_code) throw Object.assign(new Error('Case participant not found'), { status: 404 });
      participantCode = participants[0].participant_code;
      const auditResponse = await supabaseFetch(`/rest/v1/research_intervention_launch_events?case_id=eq.${caseId}&action=in.(game_login_email_sent,game_login_email_failed,account_setup_email_sent,account_setup_email_failed)&select=action,recorded_at&order=recorded_at.desc&limit=20`);
      if (auditResponse.ok) {
        const auditRows = await auditResponse.json();
        latest = auditRows.find(row => row.action.startsWith('game_login_email_')) || null;
        resultAccountSetup = auditRows.find(row => row.action.startsWith('account_setup_email_')) || null;
      }
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
        test_email_available: participant.is_test && surveyConfigured && Boolean(context.current) && Boolean(summary),
        test_email_reason: !participant.is_test ? 'Participant is not explicitly marked as test' : !surveyConfigured ? 'Weekly Qualtrics survey is not configured' : !context.current ? 'No eligible current intervention week' : summaryReason,
        resend_configured: Boolean(process.env.RESEND_API_KEY),
        teacher_game_url_configured: Boolean(process.env.TEACHER_GAME_URL)
      };
    }
    const result = {
      teacher_reminder_system_enabled: process.env.TEACHER_REMINDER_SYSTEM_ENABLED === 'true',
      game_login_email_enabled: configuration().enabled,
      weekly_qualtrics_configured: weeklyCheckin.qualtricsConfiguration().configured,
      weekly_recap_system_enabled: process.env.WEEKLY_RECAP_SYSTEM_ENABLED === 'true',
      qualtrics_measures: measureConfiguration(participantCode)
    };
    if (weeklyEmail) result.weekly_email = weeklyEmail;
    if (resultAccountSetup) result.account_setup_email_status = { outcome: resultAccountSetup.action === 'account_setup_email_sent' ? 'sent' : 'failed', recorded_at: resultAccountSetup.recorded_at };
    if (latest) result.game_login_email_status = { outcome: latest.action === 'game_login_email_sent' ? 'sent' : 'failed', recorded_at: latest.recorded_at };
    return json(response, 200, result);
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || 'Request failed' });
  }
};
