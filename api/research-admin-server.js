'use strict';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalizeEmail = value => String(value || '').trim().toLowerCase();
function json(response, status, body) { return response.status(status).json(body); }
function configuration() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('Server configuration unavailable'), { status: 500 });
  return { url: url.replace(/\/$/, ''), key };
}
async function supabaseFetch(path, options = {}) {
  const { url, key } = configuration();
  return fetch(`${url}${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
}
async function authorize(request) {
  const token = String(request.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  const { url, key } = configuration();
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!userResponse.ok) throw Object.assign(new Error('Authentication required'), { status: 401 });
  const user = await userResponse.json();
  const profileResponse = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role,active&limit=1`);
  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  if (profiles.length !== 1 || profiles[0].role !== 'research_admin' || profiles[0].active !== true) throw Object.assign(new Error('Active research admin required'), { status: 403 });
  return user;
}
async function intake(requestId) {
  if (!UUID_PATTERN.test(requestId || '')) throw Object.assign(new Error('Invalid request'), { status: 400 });
  const response = await supabaseFetch(`/rest/v1/intake_requests?request_id=eq.${encodeURIComponent(requestId)}&select=request_id,teacher_name,teacher_email,coach_name,coach_email,converted_case_id&limit=1`);
  const rows = response.ok ? await response.json() : [];
  if (rows.length !== 1) throw Object.assign(new Error('Intake not found'), { status: 404 });
  return rows[0];
}
async function profilesForEmail(email) {
  const response = await supabaseFetch(`/rest/v1/profiles?email=ilike.${encodeURIComponent(email)}&select=id,email,role,active`);
  if (!response.ok) throw new Error('Account readiness lookup failed');
  return (await response.json()).filter(row => normalizeEmail(row.email) === email);
}
async function authUsersForEmail(email) {
  const response = await supabaseFetch('/auth/v1/admin/users?page=1&per_page=1000');
  if (!response.ok) throw new Error('Auth readiness lookup failed');
  const body = await response.json();
  return (body.users || []).filter(user => normalizeEmail(user.email) === email);
}
async function audit(actorId, actionType, requestId) {
  const response = await supabaseFetch('/rest/v1/research_onboarding_actions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ actor_user_id: actorId, action_type: actionType, request_id: requestId }) });
  if (!response.ok) throw new Error('Audit write failed');
}
function methodGuard(request, response) {
  if (request.method === 'POST') return false;
  response.setHeader('Allow', 'POST'); json(response, 405, { error: 'Method not allowed' }); return true;
}
module.exports = { UUID_PATTERN, audit, authorize, authUsersForEmail, intake, json, methodGuard, normalizeEmail, profilesForEmail, supabaseFetch };
