import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const handler = require('./research-admin-set-test-password.js');
Object.assign(process.env, { SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-secret' });
const requestId = '123e4567-e89b-42d3-a456-426614174000';
const ids = { case: '223e4567-e89b-42d3-a456-426614174000', teacher: 'teacher-id' };
function response() { return { statusCode: 0, body: null, headers: {}, setHeader(k,v){this.headers[k]=v}, status(n){this.statusCode=n;return this}, json(value){this.body=value;return this} }; }
function route(overrides = {}) {
  const values = { converted: ids.case, caseCode: 'CASE-DEMO-001', participantCode: 'MR-DEMO-001', participantAuth: ids.teacher, email: 'teacher@testemail.com', profileEmail: null, authEmail: null, profileId: ids.teacher, authId: ids.teacher, callerRole: 'research_admin', ...overrides };
  const calls = [];
  global.fetch = async (url, options = {}) => {
    url = String(url); calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'admin-id' }) };
    if (url.includes('/profiles?id=eq.admin-id')) return { ok: true, json: async () => [{ id: 'admin-id', role: values.callerRole, active: true }] };
    if (url.includes('/intake_requests?')) return { ok: true, json: async () => [{ request_id: requestId, teacher_email: values.email, converted_case_id: values.converted }] };
    if (url.includes('/rest/v1/cases?')) return { ok: true, json: async () => [{ id: ids.case, case_code: values.caseCode }] };
    if (url.includes('/rest/v1/participants?')) return { ok: true, json: async () => [{ id: 'participant-id', participant_code: values.participantCode, auth_user_id: values.participantAuth }] };
    if (url.includes('/profiles?email=ilike.') || url.includes(`/profiles?id=eq.${values.participantAuth}`)) return { ok: true, json: async () => [{ id: values.profileId, email: values.profileEmail || values.email, role: 'teacher', active: true }] };
    if (url.includes('/auth/v1/admin/users?page=')) return { ok: true, json: async () => ({ users: [{ id: values.authId, email: values.authEmail || values.profileEmail || values.email }] }) };
    if (url.endsWith('/research_onboarding_actions')) return { ok: !values.failAudit, json: async () => ({}) };
    if (url.endsWith('/research_admin_test_account_actions')) return { ok: !values.failAudit, json: async () => ({}) };
    return { ok: true, json: async () => ({}) };
  };
  return calls;
}
async function invoke(overrides = {}, body = { request_id: requestId, password: 'twelve-chars!' }, method = 'POST') { const calls=route(overrides), res=response(); await handler({ method, headers:{authorization:'Bearer token'}, body },res); return {calls,res}; }
let result = await invoke({}, {}, 'GET'); assert.equal(result.res.statusCode, 405);
result = await invoke({ callerRole: 'teacher' }); assert.equal(result.res.statusCode, 403);
result = await invoke({}, { request_id: requestId, password: 'twelve-chars!', extra: true }); assert.equal(result.res.statusCode, 400);
result = await invoke({}, { request_id: requestId, password: 'short' }); assert.equal(result.res.statusCode, 400);
for (const [override, label] of [[{converted:null},'unconverted'],[{caseCode:'CASE-001'},'normal case'],[{participantCode:'MR-001'},'normal participant'],[{email:'teacher@example.com'},'real email'],[{authId:'other'},'profile/auth mismatch'],[{participantAuth:'other'},'participant/auth mismatch']]) { result=await invoke(override); assert.equal(result.res.statusCode,409,label); assert.ok(!result.calls.some(c=>c.options.method==='PUT')); }
for (const [override, expected, label] of [
  [{caseCode:'CASE-998',participantCode:'MR-998'},200,'reserved pair'],
  [{caseCode:'CASE-998',participantCode:'MR-997'},409,'reserved case mismatched participant'],
  [{caseCode:'CASE-997',participantCode:'MR-998'},409,'reserved participant mismatched case'],
  [{caseCode:'CASE-997',participantCode:'MR-997'},409,'arbitrary 997 pair'],
  [{caseCode:'CASE-998',participantCode:'MR-998',email:'teacher@example.com'},409,'reserved pair real email']
]) { result=await invoke(override); assert.equal(result.res.statusCode,expected,label); }
result = await invoke(); assert.equal(result.res.statusCode,200); assert.deepEqual(result.res.body,{success:true});
const update=result.calls.find(c=>c.options.method==='PUT'); assert.match(update.url,/\/auth\/v1\/admin\/users\/teacher-id$/); assert.deepEqual(JSON.parse(update.options.body),{password:'twelve-chars!'});
const audit=result.calls.find(c=>c.url.endsWith('/research_onboarding_actions')); assert.deepEqual(JSON.parse(audit.options.body),{actor_user_id:'admin-id',action_type:'qa_test_password_set',request_id:requestId});
assert.doesNotMatch(JSON.stringify(result.res.body),/twelve-chars!/);
assert.doesNotMatch(audit.options.body,/twelve-chars!/i);
assert.equal(Object.hasOwn(JSON.parse(audit.options.body),'password'),false);
assert.ok(!result.calls.some(c=>['POST','PUT','PATCH','DELETE'].includes(c.options.method) && /case_game_content|game_sessions|reminder|generate_link|email|publish/i.test(c.url)));
result = await invoke({ failAudit: true });
assert.equal(result.res.statusCode, 200); assert.equal(result.res.body.success, true); assert.equal(result.res.body.audit_recorded, false);
assert.match(result.res.body.warning, /password was set.*audit record failed.*follow-up/i);
assert.ok(result.calls.some(c => c.options.method === 'PUT' && c.url.endsWith('/auth/v1/admin/users/teacher-id')));
assert.doesNotMatch(JSON.stringify(result.res.body), /twelve-chars!/);

// Legacy demo cases use the case directly and never need or fabricate an intake.
result = await invoke({}, { case_id: ids.case, password: 'twelve-chars!' });
assert.equal(result.res.statusCode, 200);
assert.ok(!result.calls.some(c => c.url.includes('/intake_requests?')));
const legacyAudit=result.calls.find(c=>c.url.endsWith('/research_admin_test_account_actions'));
assert.deepEqual(JSON.parse(legacyAudit.options.body),{actor_user_id:'admin-id',case_id:ids.case,participant_id:'participant-id',action_type:'qa_test_password_set'});
assert.doesNotMatch(legacyAudit.options.body,/twelve-chars!/i); assert.equal(Object.hasOwn(JSON.parse(legacyAudit.options.body),'password'),false);
assert.doesNotMatch(JSON.stringify(result.res.body),/twelve-chars!/);
for (const [override,label] of [[{caseCode:'CASE-001'},'normal case'],[{participantCode:'MR-001'},'normal participant'],[{profileEmail:'teacher@example.com'},'real email'],[{profileId:'other'},'profile/participant mismatch'],[{authId:'other'},'auth/participant mismatch'],[{authEmail:'other@testemail.com'},'profile/auth email mismatch']]) {
  result=await invoke(override,{case_id:ids.case,password:'twelve-chars!'}); assert.equal(result.res.statusCode,409,label); assert.ok(!result.calls.some(c=>c.options.method==='PUT'));
}
result=await invoke({}, {case_id:'not-a-uuid',password:'twelve-chars!'}); assert.equal(result.res.statusCode,400);
result=await invoke({}, {request_id:requestId,case_id:ids.case,password:'twelve-chars!'}); assert.equal(result.res.statusCode,400);
result=await invoke({}, {password:'twelve-chars!'}); assert.equal(result.res.statusCode,400);
result=await invoke({failAudit:true},{case_id:ids.case,password:'twelve-chars!'}); assert.equal(result.res.statusCode,200); assert.equal(result.res.body.audit_recorded,false);

const migration=fs.readFileSync(new URL('../supabase/migrations/20260822040000_research_admin_test_password_audit.sql',import.meta.url),'utf8');
for (const action of ['intake_approved','intake_declined','case_provisioned','teacher_account_created','coach_account_created','qa_login_link_generated','intake_edited','qa_test_password_set']) assert.match(migration,new RegExp(`'${action}'`));
assert.doesNotMatch(migration,/add column[^;]*password|password\s+(?:text|varchar)/i);
const legacyMigration=fs.readFileSync(new URL('../supabase/migrations/20260822050000_research_admin_test_account_actions.sql',import.meta.url),'utf8');
for(const column of ['actor_user_id','case_id','participant_id','action_type','created_at']) assert.match(legacyMigration,new RegExp(column));
assert.match(legacyMigration,/enable row level security/); assert.match(legacyMigration,/is_research_admin\(\)/); assert.match(legacyMigration,/revoke all[^;]*anon, authenticated/);
assert.doesNotMatch(legacyMigration,/password\s+(?:text|varchar)|student_alias|intake_request/i);
const source=fs.readFileSync(new URL('research-admin-set-test-password.js',import.meta.url),'utf8'); assert.doesNotMatch(source,/console\.|insert into|auth\.updateUser/);
console.log('Research Admin demo-only test password endpoint checks passed.');
