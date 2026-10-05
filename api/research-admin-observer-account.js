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

async function accountForObserver(observerId) {
  const response = await server.supabaseFetch(
    `/rest/v1/research_observer_accounts?observer_id=eq.${encodeURIComponent(observerId)}&select=observer_id,auth_user_id,active&limit=1`
  );
  const rows = response.ok ? await response.json() : [];
  return rows[0] || null;
}

module.exports = async function handler(request, response) {
  if (server.methodGuard(request, response)) return;
  let createdUserId = null;
  try {
    const actor = await server.authorize(request);
    const keys = Object.keys(request.body || {});
    if (keys.length !== 1 || keys[0] !== 'observer_id') return server.json(response, 400, { error: 'Exactly observer_id is required.' });

    const observer = await observerRow(request.body.observer_id);
    if (!observer.active) return server.json(response, 409, { error: 'Observer is inactive.' });
    const email = server.normalizeEmail(observer.login_email);
    if (!email) return server.json(response, 409, { error: 'Save the observer login email first.' });

    const existingAccount = await accountForObserver(observer.id);
    if (existingAccount?.auth_user_id) {
      const authResponse = await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(existingAccount.auth_user_id)}`);
      const authUser = authResponse.ok ? await authResponse.json() : null;
      if (!authUser || server.normalizeEmail(authUser.email) !== email) {
        return server.json(response, 409, { error: 'The linked Auth account does not match the roster email.' });
      }
      if (!existingAccount.active) {
        const activate = await server.supabaseFetch(
          `/rest/v1/research_observer_accounts?observer_id=eq.${encodeURIComponent(observer.id)}`,
          { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: true }) }
        );
        if (!activate.ok) throw new Error('Observer account could not be activated');
      }
      return server.json(response, 200, { ready: true, created: false, reused: true });
    }

    const authUsers = await server.authUsersForEmail(email);
    if (authUsers.length > 1) return server.json(response, 409, { error: 'Multiple Auth users match this email.' });

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
      if (!authResponse.ok) return server.json(response, 409, { error: 'Observer Auth account could not be created.' });
      authUser = await authResponse.json();
      createdUserId = authUser.id;
    }

    const conflictResponse = await server.supabaseFetch(
      `/rest/v1/research_observer_accounts?auth_user_id=eq.${encodeURIComponent(authUser.id)}&select=observer_id,auth_user_id,active`
    );
    const conflicts = conflictResponse.ok ? await conflictResponse.json() : [];
    if (conflicts.some(row => row.observer_id !== observer.id)) {
      if (createdUserId) await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(createdUserId)}`, { method: 'DELETE' }).catch(() => {});
      return server.json(response, 409, { error: 'This Auth account is already linked to another observer.' });
    }

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

    return server.json(response, createdUserId ? 201 : 200, {
      ready: true,
      created: Boolean(createdUserId),
      reused: !createdUserId
    });
  } catch (error) {
    if (createdUserId) await server.supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(createdUserId)}`, { method: 'DELETE' }).catch(() => {});
    return server.json(response, error.status || 500, { error: error.status ? error.message : 'Observer account setup failed safely' });
  }
};
