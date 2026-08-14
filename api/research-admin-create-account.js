'use strict';
const server = require('./research-admin-server');
async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  let createdUserId = null;
  try {
    const actor = await server.authorize(request);
    const keys = Object.keys(request.body || {});
    if (keys.some(key => !['request_id', 'account_type'].includes(key)) || !['teacher', 'coach'].includes(request.body?.account_type)) return server.json(response, 400, { error: 'Invalid request' });
    const row = await server.intake(request.body.request_id);
    const type = request.body.account_type;
    const email = server.normalizeEmail(row[`${type}_email`]);
    const name = String(row[`${type}_name`] || '').trim();
    const profiles = await server.profilesForEmail(email);
    const authUsers = await server.authUsersForEmail(email);
    const compatible = profile => profile.active === true && (profile.role === type || (type === 'coach' && profile.role === 'research_admin'));
    if (profiles.length === 1 && compatible(profiles[0]) && authUsers.some(user => user.id === profiles[0].id)) return server.json(response, 200, { ready: true, created: false });
    if (profiles.length || authUsers.length) throw Object.assign(new Error('An existing account conflicts with the expected role. No account was changed.'), { status: 409 });
    const authResponse = await server.supabaseFetch('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true, user_metadata: { display_name: name } }) });
    if (!authResponse.ok) throw Object.assign(new Error('Account could not be created'), { status: 409 });
    const authUser = await authResponse.json(); createdUserId = authUser.id;
    const profileResponse = await server.supabaseFetch('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: authUser.id, display_name: name, email, role: type, active: true }) });
    if (!profileResponse.ok) throw new Error('Profile could not be created');
    await server.audit(actor.id, `${type}_account_created`, row.request_id);
    return server.json(response, 201, { ready: true, created: true });
  } catch (error) {
    if (createdUserId) await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(createdUserId)}`, { method: 'DELETE' }).catch(() => {});
    return server.json(response, error.status || 500, { error: error.status ? error.message : 'Account creation failed safely' });
  }
}
module.exports = handler;
