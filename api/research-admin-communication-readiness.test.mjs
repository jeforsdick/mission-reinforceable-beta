import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const server=require('./research-admin-server');

test('communication readiness fails closed and never exposes sender configuration',async()=>{
  const original=global.fetch; delete process.env.TEACHER_REMINDER_SYSTEM_ENABLED;delete process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL;
  global.fetch=async url=>String(url).includes('/auth/v1/user')?{ok:true,json:async()=>({id:'admin'})}:{ok:true,json:async()=>[{id:'admin',role:'research_admin',active:true}]};
  process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';
  const handler=require('./research-admin-communication-readiness');
  let status;let body;const response={setHeader(){},status(value){status=value;return this;},json(value){body=value;return value;}};
  await handler({method:'GET',headers:{authorization:'Bearer token'}},response);
  assert.equal(status,200);assert.deepEqual(body,{teacher_reminder_system_enabled:false,game_login_email_enabled:false,weekly_qualtrics_configured:false});assert.doesNotMatch(JSON.stringify(body),/resend|sender|domain|secret/i);
  process.env.TEACHER_REMINDER_SYSTEM_ENABLED='true';process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL='https://granite.qualtrics.com/jfe/form/SV_weekly';await handler({method:'GET',headers:{authorization:'Bearer token'}},response);assert.equal(body.teacher_reminder_system_enabled,true);assert.equal(body.weekly_qualtrics_configured,true);assert.doesNotMatch(JSON.stringify(body),/https:\/\//);
  global.fetch=original;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.TEACHER_REMINDER_SYSTEM_ENABLED;delete process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL;
});
