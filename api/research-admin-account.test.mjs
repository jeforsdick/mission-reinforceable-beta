import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const createAccount = require('./research-admin-create-account.js');
const qaLink = require('./research-admin-qa-link.js');
Object.assign(process.env, { SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'server-secret' });
const requestId = '123e4567-e89b-42d3-a456-426614174000';
const intake = { request_id: requestId, teacher_name: 'Teacher One', teacher_email: 'Teacher@Example.org', coach_name: 'Coach One', coach_email: 'Coach@Example.org' };
function response() { return { statusCode: 0, body: null, headers: {}, setHeader(k,v){this.headers[k]=v}, status(code){this.statusCode=code;return this}, json(body){this.body=body;return this} }; }
function route({ callerRole = 'research_admin', profiles = [], users = [], failProfile = false } = {}) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'admin-id' }) };
    if (String(url).includes('/profiles?id=eq.admin-id')) return { ok: true, json: async () => [{ id: 'admin-id', role: callerRole, active: true }] };
    if (String(url).includes('/intake_requests?')) return { ok: true, json: async () => [intake] };
    if (String(url).includes('/profiles?email=ilike.')) return { ok: true, json: async () => profiles };
    if (String(url).includes('/auth/v1/admin/users?page=')) return { ok: true, json: async () => ({ users }) };
    if (String(url).endsWith('/auth/v1/admin/users') && options.method === 'POST') return { ok: true, json: async () => ({ id: 'new-user' }) };
    if (String(url).endsWith('/rest/v1/profiles') && options.method === 'POST') return { ok: !failProfile };
    if (String(url).includes('/auth/v1/admin/generate_link')) return { ok: true, json: async () => ({ action_link: 'https://example.test/private-link' }) };
    return { ok: true, json: async () => ({}) };
  };
  return calls;
}
let res = response(); await createAccount({ method: 'POST', headers: {}, body: { request_id: requestId, account_type: 'teacher' } }, res); assert.equal(res.statusCode, 401);
route({ callerRole: 'teacher' }); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'teacher' } }, res); assert.equal(res.statusCode, 403);
let calls = route(); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'teacher', email: 'attacker@example.org' } }, res); assert.equal(res.statusCode, 400);
calls = route(); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'teacher' } }, res); assert.equal(res.statusCode, 201); const profileInsert = calls.find(call => call.url.endsWith('/rest/v1/profiles') && call.options.method === 'POST'); assert.deepEqual(JSON.parse(profileInsert.options.body), { id: 'new-user', display_name: 'Teacher One', email: 'teacher@example.org', role: 'teacher', active: true });
calls = route(); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'coach' } }, res); assert.equal(res.statusCode, 201); assert.equal(JSON.parse(calls.find(call => call.url.endsWith('/rest/v1/profiles') && call.options.method === 'POST').options.body).role, 'coach');
calls = route({ profiles: [{ id: 'ready', email: 'Teacher@example.org', role: 'teacher', active: true }], users: [{ id: 'ready', email: 'teacher@example.org' }] }); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'teacher' } }, res); assert.deepEqual(res.body, { ready: true, created: false }); assert.ok(!calls.some(call => call.options.method === 'POST' && call.url.endsWith('/auth/v1/admin/users')));
route({ profiles: [{ id: 'wrong', email: 'teacher@example.org', role: 'coach', active: true }], users: [{ id: 'wrong', email: 'teacher@example.org' }] }); res = response(); await createAccount({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId, account_type: 'teacher' } }, res); assert.equal(res.statusCode, 409);
calls = route({ profiles: [{ id: 'teacher-id', email: 'teacher@example.org', role: 'teacher', active: true }], users: [{ id: 'teacher-id', email: 'teacher@example.org' }] }); res = response(); await qaLink({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { request_id: requestId } }, res); assert.equal(res.statusCode, 200); assert.match(res.body.action_link, /^https:/); assert.equal(calls.filter(call => call.url.includes('generate_link')).length, 1); assert.ok(!calls.some(call => /resend|email\/send/i.test(call.url)));
for (const call of calls) assert.doesNotMatch(JSON.stringify(call), /participants|cases|reminder/i);
console.log('Research-admin account creation authorization, authoritative derivation, roles, idempotency, conflicts, QA link, and no-side-effect checks passed.');
