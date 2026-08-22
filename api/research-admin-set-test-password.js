'use strict';
const server = require('./research-admin-server');

const conflict = response => server.json(response, 409, { error: 'Demo teacher account is not eligible' });

async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  try {
    const actor = await server.authorize(request);
    const body = request.body || {};
    if (Object.keys(body).length !== 2 || Object.keys(body).some(key => !['request_id', 'password'].includes(key))) return server.json(response, 400, { error: 'Invalid request' });
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 64) return server.json(response, 400, { error: 'Invalid password' });

    const intake = await server.intake(body.request_id);
    if (!intake.converted_case_id) return conflict(response);
    const caseResponse = await server.supabaseFetch(`/rest/v1/cases?id=eq.${encodeURIComponent(intake.converted_case_id)}&select=id,case_code&limit=2`);
    const cases = caseResponse.ok ? await caseResponse.json() : [];
    if (cases.length !== 1) return conflict(response);

    const participantResponse = await server.supabaseFetch(`/rest/v1/participants?case_id=eq.${encodeURIComponent(cases[0].id)}&select=id,participant_code,auth_user_id`);
    const participants = participantResponse.ok ? await participantResponse.json() : [];
    if (participants.length !== 1) return conflict(response);
    const caseCode = cases[0].case_code || '';
    const participantCode = participants[0].participant_code || '';
    const demoPair = /^CASE-DEMO-/.test(caseCode) && /^MR-DEMO-/.test(participantCode);
    const reservedDryRunPair = caseCode === 'CASE-998' && participantCode === 'MR-998';
    if (!demoPair && !reservedDryRunPair) return conflict(response);

    const email = server.normalizeEmail(intake.teacher_email);
    if (!/@testemail\.com$/i.test(email)) return conflict(response);
    const profiles = await server.profilesForEmail(email);
    if (profiles.length !== 1 || profiles[0].role !== 'teacher' || profiles[0].active !== true) return conflict(response);
    const authUsers = await server.authUsersForEmail(email);
    if (authUsers.length !== 1 || authUsers[0].id !== profiles[0].id || participants[0].auth_user_id !== profiles[0].id) return conflict(response);

    const update = await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(authUsers[0].id)}`, { method: 'PUT', body: JSON.stringify({ password: body.password }) });
    if (!update.ok) throw new Error('Password update failed');
    try {
      await server.audit(actor.id, 'qa_test_password_set', intake.request_id);
    } catch {
      return server.json(response, 200, { success: true, audit_recorded: false, warning: 'Test password was set, but the audit record failed. Research Admin follow-up is required.' });
    }
    return server.json(response, 200, { success: true });
  } catch (error) {
    return server.json(response, error.status || 500, { error: error.status ? error.message : 'Test password could not be set' });
  }
}
module.exports = handler;
