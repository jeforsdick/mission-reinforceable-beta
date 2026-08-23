'use strict';
const server = require('./research-admin-server');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const conflict = response => server.json(response, 409, { error: 'Demo teacher account is not eligible' });
const auditWarning = response => server.json(response, 200, { success: true, audit_recorded: false, warning: 'Test password was set, but the audit record failed. Research Admin follow-up is required.' });

async function caseAndParticipant(caseId) {
  const caseResponse = await server.supabaseFetch(`/rest/v1/cases?id=eq.${encodeURIComponent(caseId)}&select=id,case_code&limit=2`);
  const cases = caseResponse.ok ? await caseResponse.json() : [];
  if (cases.length !== 1) return null;
  const participantResponse = await server.supabaseFetch(`/rest/v1/participants?case_id=eq.${encodeURIComponent(cases[0].id)}&select=id,participant_code,auth_user_id&limit=2`);
  const participants = participantResponse.ok ? await participantResponse.json() : [];
  return participants.length === 1 ? { studyCase: cases[0], participant: participants[0] } : null;
}

async function updatePassword(userId, password) {
  const update = await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify({ password }) });
  if (!update.ok) throw new Error('Password update failed');
}

async function legacyAccount(caseId) {
  const pair = await caseAndParticipant(caseId);
  if (!pair || !/^CASE-DEMO-/.test(pair.studyCase.case_code || '') || !/^MR-DEMO-/.test(pair.participant.participant_code || '') || !pair.participant.auth_user_id) return null;
  const profileResponse = await server.supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(pair.participant.auth_user_id)}&select=id,email,role,active&limit=2`);
  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  if (profiles.length !== 1 || profiles[0].id !== pair.participant.auth_user_id || profiles[0].role !== 'teacher' || profiles[0].active !== true) return null;
  const email = server.normalizeEmail(profiles[0].email);
  if (!/@testemail\.com$/i.test(email)) return null;
  const authUsers = await server.authUsersForEmail(email);
  if (authUsers.length !== 1 || authUsers[0].id !== pair.participant.auth_user_id || server.normalizeEmail(authUsers[0].email) !== email) return null;
  return { ...pair, userId: authUsers[0].id };
}

async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  try {
    const actor = await server.authorize(request);
    const body = request.body || {};
    const keys = Object.keys(body);
    const hasRequestId = Object.hasOwn(body, 'request_id');
    const hasCaseId = Object.hasOwn(body, 'case_id');
    if (keys.length !== 2 || hasRequestId === hasCaseId || keys.some(key => !['request_id', 'case_id', 'password'].includes(key))) return server.json(response, 400, { error: 'Invalid request' });
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 64) return server.json(response, 400, { error: 'Invalid password' });

    if (hasCaseId) {
      if (!UUID_PATTERN.test(body.case_id || '')) return server.json(response, 400, { error: 'Invalid request' });
      const account = await legacyAccount(body.case_id);
      if (!account) return conflict(response);
      await updatePassword(account.userId, body.password);
      try {
        const audit = await server.supabaseFetch('/rest/v1/research_admin_test_account_actions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ actor_user_id: actor.id, case_id: account.studyCase.id, participant_id: account.participant.id, action_type: 'qa_test_password_set' }) });
        if (!audit.ok) throw new Error('Audit write failed');
      } catch { return auditWarning(response); }
      return server.json(response, 200, { success: true });
    }

    const intake = await server.intake(body.request_id);
    if (!intake.converted_case_id) return conflict(response);
    const pair = await caseAndParticipant(intake.converted_case_id);
    if (!pair) return conflict(response);
    const caseCode = pair.studyCase.case_code || '';
    const participantCode = pair.participant.participant_code || '';
    const demoPair = /^CASE-DEMO-/.test(caseCode) && /^MR-DEMO-/.test(participantCode);
    const reservedDryRunPair = caseCode === 'CASE-998' && participantCode === 'MR-998';
    if (!demoPair && !reservedDryRunPair) return conflict(response);
    const email = server.normalizeEmail(intake.teacher_email);
    if (!/@testemail\.com$/i.test(email)) return conflict(response);
    const profiles = await server.profilesForEmail(email);
    if (profiles.length !== 1 || profiles[0].role !== 'teacher' || profiles[0].active !== true) return conflict(response);
    const authUsers = await server.authUsersForEmail(email);
    if (authUsers.length !== 1 || authUsers[0].id !== profiles[0].id || pair.participant.auth_user_id !== profiles[0].id) return conflict(response);
    await updatePassword(authUsers[0].id, body.password);
    try { await server.audit(actor.id, 'qa_test_password_set', intake.request_id); }
    catch { return auditWarning(response); }
    return server.json(response, 200, { success: true });
  } catch (error) {
    return server.json(response, error.status || 500, { error: error.status ? error.message : 'Test password could not be set' });
  }
}
module.exports = handler;
