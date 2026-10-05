'use strict';
const server = require('./research-admin-server');

async function observerRow(observerId) {
  if (!server.UUID_PATTERN.test(observerId || '')) throw Object.assign(new Error('Invalid observer'), { status: 400 });
  const response = await server.supabaseFetch(
    `/rest/v1/research_observers?id=eq.${encodeURIComponent(observerId)}&select=id,display_name,login_email,active&limit=1`
  );
  const rows = response.ok ? await response.json() : [];
  if (rows.length !== 1) throw Object.assign(new Error('Observer not found'), { status: 404 });
  return rows[0];
}
async function observerAccount(observerId) {
  const response = await server.supabaseFetch(
    `/rest/v1/research_observer_accounts?observer_id=eq.${encodeURIComponent(observerId)}&select=observer_id,auth_user_id,active&limit=1`
  );
  const rows = response.ok ? await response.json() : [];
  return rows[0] || null;
}
async function provisionObserverAccount(actor, observerId) {
  let createdUserId = null;
  try {
    const observer = await observerRow(observerId);
    if (!observer.active) throw Object.assign(new Error('Observer is inactive.'), { status: 409 });
    const email = server.normalizeEmail(observer.login_email);
    if (!email) throw Object.assign(new Error('Save the observer login email first.'), { status: 409 });

    const existing = await observerAccount(observer.id);
    if (existing?.auth_user_id) {
      const authResponse = await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(existing.auth_user_id)}`);
      const authUser = authResponse.ok ? await authResponse.json() : null;
      if (!authUser || server.normalizeEmail(authUser.email) !== email) throw Object.assign(new Error('The linked Auth account does not match the roster email.'), { status: 409 });
      if (!existing.active) {
        const activate = await server.supabaseFetch(
          `/rest/v1/research_observer_accounts?observer_id=eq.${encodeURIComponent(observer.id)}`,
          { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: true }) }
        );
        if (!activate.ok) throw new Error('Observer account could not be activated');
      }
      return { ready: true, created: false, reused: true };
    }

    const authUsers = await server.authUsersForEmail(email);
    if (authUsers.length > 1) throw Object.assign(new Error('Multiple Auth users match this email.'), { status: 409 });
    let authUser = authUsers[0] || null;

    if (!authUser) {
      const authResponse = await server.supabaseFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          email_confirm: true,
          user_metadata: { display_name: observer.display_name, observer_training: true }
        })
      });
      if (!authResponse.ok) throw Object.assign(new Error('Observer Auth account could not be created.'), { status: 409 });
      authUser = await authResponse.json();
      createdUserId = authUser.id;
    }

    const conflictResponse = await server.supabaseFetch(
      `/rest/v1/research_observer_accounts?auth_user_id=eq.${encodeURIComponent(authUser.id)}&select=observer_id,auth_user_id,active`
    );
    const conflicts = conflictResponse.ok ? await conflictResponse.json() : [];
    if (conflicts.some(row => row.observer_id !== observer.id)) throw Object.assign(new Error('This Auth account is already linked to another observer.'), { status: 409 });

    const upsert = await server.supabaseFetch('/rest/v1/research_observer_accounts', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        observer_id: observer.id,
        auth_user_id: authUser.id,
        active: true,
        created_by: actor.id
      })
    });
    if (!upsert.ok) throw new Error('Observer account link could not be saved');

    return { ready: true, created: Boolean(createdUserId), reused: !createdUserId };
  } catch (error) {
    if (createdUserId) await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(createdUserId)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}

async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  let createdUserId = null;
  try {
    const actor = await server.authorize(request);
    const keys = Object.keys(request.body || {});
    if (request.body?.account_type === 'observer') {
      if (keys.some(key => !['observer_id','account_type'].includes(key)) || keys.length !== 2) return server.json(response, 400, { error: 'Invalid request' });
      const result = await provisionObserverAccount(actor, request.body.observer_id);
      return server.json(response, result.created ? 201 : 200, result);
    }
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
