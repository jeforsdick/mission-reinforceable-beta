'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'research-admin-create-account.js'), 'utf8');

test('successful linked teacher account and sent email remain successful if the final audit fails', async () => {
  let authDeletes = 0;
  let emailRequests = 0;
  let links = 0;
  let audits = 0;
  const caseId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const requestId = '33333333-3333-4333-8333-333333333333';
  const api = {
    methodGuard: () => false,
    authorize: async () => ({ id: '44444444-4444-4444-8444-444444444444' }),
    json: (_response, status, value) => ({ status, ...value }),
    intake: async () => ({
      request_id: requestId,
      converted_case_id: caseId,
      teacher_name: 'Sample Teacher',
      teacher_email: 'teacher@example.org',
      coach_name: 'Sample Coach',
      coach_email: 'coach@example.org'
    }),
    normalizeEmail: value => String(value || '').toLowerCase(),
    profilesForEmail: async () => [],
    authUsersForEmail: async () => [],
    audit: async () => {
      audits += 1;
      if (audits === 2) throw new Error('Unsupported audit event');
    },
    supabaseFetch: async (url, options={}) => {
      if (url.startsWith('/rest/v1/case_game_content?')) return {ok:true, json:async()=>[{case_id:caseId,version:2}]};
      if (url==='/auth/v1/admin/users' && options.method==='POST') return {ok:true,json:async()=>({id:userId})};
      if (url.startsWith('/auth/v1/admin/users/') && options.method==='DELETE') {
        authDeletes += 1;
        return {ok:true,json:async()=>({})};
      }
      if (url==='/rest/v1/profiles' && options.method==='POST') return {ok:true,json:async()=>({})};
      if (url==='/auth/v1/admin/generate_link') return {ok:true,json:async()=>({action_link:'https://example.org/fake-link'})};
      if (url.startsWith('/rest/v1/participants?') && !options.method) return {ok:true,json:async()=>[{id:'55555555-5555-4555-8555-555555555555',auth_user_id:null,active:false}]};
      if (url.startsWith('/rest/v1/participants?') && options.method==='PATCH') {
        links += 1; return {ok:true,json:async()=>({})};
      }
      throw new Error('Unexpected mock endpoint: ' + url);
    }
  };
  const moduleMock = { exports: {} };
  const sandbox = {
    module: moduleMock,
    require: p => p.includes('research-admin-server') ? api : {
      configuration: () => ({enabled:true,setupUrl:'https://example.org/set-password/',from:'missions@example.org'}),
      formatAccountSetupEmail: () => ({subject:'Setup',text:'Hi',html:'<p>Hi</p>'})
    },
    fetch: async () => {
      emailRequests += 1;
      return { ok:true, json:async()=>({id:'mock-resend-id'}) };
    },
    process:{env:{RESEND_API_KEY:'mock-key'}},
    console:{error:()=>{}}
  };
  vm.runInNewContext(source,sandbox,{filename:'research-admin-create-account.js'});
  const result=await moduleMock.exports({body:{request_id:requestId,account_type:'teacher'}},{});
  assert.equal(result.status,201);
  assert.equal(result.ready,true);
  assert.equal(result.linked,true);
  assert.equal(result.setup_email_sent,true);
  assert.equal(result.audit_warning,true);
  assert.equal(emailRequests,1);
  assert.equal(links,1);
  assert.equal(audits,2);
  assert.equal(authDeletes,0,'linked account must not be deleted after email delivery');
});
