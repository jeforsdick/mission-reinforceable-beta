'use strict';
const server = require('./research-admin-server');
const { httpsUrl } = require('../server/game-login-email');
async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  try {
    const actor = await server.authorize(request);
    if (Object.keys(request.body || {}).some(key => key !== 'request_id')) return server.json(response, 400, { error: 'Invalid request' });
    const row = await server.intake(request.body?.request_id);
    const email = server.normalizeEmail(row.teacher_email);
    const profiles = await server.profilesForEmail(email);
    if (profiles.length !== 1 || profiles[0].role !== 'teacher' || profiles[0].active !== true) return server.json(response, 409, { error: 'Teacher account is not ready' });
    const authUsers = await server.authUsersForEmail(email);
    if (authUsers.length !== 1 || authUsers[0].id !== profiles[0].id) return server.json(response, 409, { error: 'Teacher account is not ready' });
    const redirectUrl = httpsUrl(process.env.TEACHER_GAME_URL, '/game/');
    if (!redirectUrl) throw new Error('Teacher game URL is not configured');
    const linkResponse = await server.supabaseFetch('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email, redirect_to: redirectUrl.toString() }) });
    if (!linkResponse.ok) throw new Error('Test sign-in link could not be generated');
    const generated = await linkResponse.json();
    const actionLink = generated.action_link || generated.properties?.action_link;
    if (!actionLink) throw new Error('Test sign-in link could not be generated');
    await server.audit(actor.id, 'qa_login_link_generated', row.request_id);
    return server.json(response, 200, { action_link: actionLink });
  } catch (error) { return server.json(response, error.status || 500, { error: error.status ? error.message : 'Test sign-in link generation failed' }); }
}
module.exports = handler;
