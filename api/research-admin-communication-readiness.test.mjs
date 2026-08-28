import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const server=require('./research-admin-server');

test('communication readiness fails closed and never exposes sender configuration',async()=>{
  const original=global.fetch; delete process.env.TEACHER_REMINDER_SYSTEM_ENABLED;delete process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL;
  global.fetch=async url=>String(url).includes('/auth/v1/user')?{ok:true,json:async()=>({id:'admin'})}:String(url).includes('/participants?')?{ok:true,json:async()=>[{participant_code:'MR-001'}]}:{ok:true,json:async()=>[{id:'admin',role:'research_admin',active:true}]};
  process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';
  const handler=require('./research-admin-communication-readiness');
  let status;let body;const response={setHeader(){},status(value){status=value;return this;},json(value){body=value;return value;}};
  await handler({method:'GET',headers:{authorization:'Bearer token'}},response);
  assert.equal(status,200);assert.equal(body.teacher_reminder_system_enabled,false);assert.equal(body.game_login_email_enabled,false);assert.equal(body.weekly_qualtrics_configured,false);for(const measure of Object.values(body.qualtrics_measures))assert.deepEqual(measure,{configured:false});assert.doesNotMatch(JSON.stringify(body),/resend|sender|domain|secret/i);
  process.env.TEACHER_REMINDER_SYSTEM_ENABLED='true';process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL='https://granite.qualtrics.com/jfe/form/SV_weekly';await handler({method:'GET',headers:{authorization:'Bearer token'}},response);assert.equal(body.teacher_reminder_system_enabled,true);assert.equal(body.weekly_qualtrics_configured,true);assert.doesNotMatch(JSON.stringify(body),/https:\/\//);
  global.fetch=original;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.TEACHER_REMINDER_SYSTEM_ENABLED;delete process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL;
});

test('case links use only the server-resolved participant code and interview stays generic',async()=>{
  const original=global.fetch, keys=['TSES_PRE_QUALTRICS_URL','TSES_POST_QUALTRICS_URL','URP_IR_QUALTRICS_URL','TEACHER_INTERVIEW_QUALTRICS_URL'];
  for(const key of keys)process.env[key]='https://educationutah.co1.qualtrics.com/jfe/form/SV_example';
  process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';
  const calls=[];global.fetch=async url=>{calls.push(String(url));if(String(url).includes('/auth/v1/user'))return{ok:true,json:async()=>({id:'admin'})};if(String(url).includes('/profiles?'))return{ok:true,json:async()=>[{id:'admin',role:'research_admin',active:true}]};if(String(url).includes('/participants?'))return{ok:true,json:async()=>[{participant_code:'MR-001'}]};return{ok:true,json:async()=>[]};};
  const handler=require('./research-admin-communication-readiness');let status,body;const response={setHeader(){},status(value){status=value;return this;},json(value){body=value;return value;}};
  await handler({method:'GET',headers:{authorization:'Bearer token'},query:{case_id:'11111111-1111-4111-8111-111111111111',participant_code:'MR-999'}},response);
  assert.equal(status,200);for(const key of ['tses_pre','tses_post','urp_ir'])assert.equal(new URL(body.qualtrics_measures[key].url).searchParams.get('participant_code'),'MR-001');assert.equal(new URL(body.qualtrics_measures.teacher_interview.url).search,'');assert.ok(calls.some(url=>url.includes('case_id=eq.11111111-1111-4111-8111-111111111111')));assert.ok(calls.every(url=>!url.includes('MR-999')));
  global.fetch=original;for(const key of keys)delete process.env[key];delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
