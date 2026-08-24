import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const service=require('../server/study-day-status-service');
const handler=require('./study-day-status');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260824040000_study_day_status_reporting.sql',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../study-day-status/index.html',import.meta.url),'utf8');
const browser=fs.readFileSync(new URL('../study-day-status/status.js',import.meta.url),'utf8');

function response(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
test('GET is scanner-safe and never invokes the recording service',async()=>{const result=response();await handler({method:'GET'},result);assert.equal(result.statusCode,405);assert.equal(result.headers.Allow,'POST');assert.match(browser,/fetch\('\/api\/study-day-status', \{ method: 'POST'/);});
test('valid browser POST records through a hashed service-role RPC and returns generic copy',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-secret';let call;
 const result=await service.recordToken('A'.repeat(43),{fetch:async(url,options)=>{call={url,options};return {ok:true,json:async()=>[{reason:'teacher_absent',already_recorded:false}]};}});
 assert.equal(result.status,200);assert.equal(result.body.message,"You're marked as out today.");assert.match(call.url,/rpc\/record_study_day_status_token$/);assert.doesNotMatch(call.options.body,/A{20}/);assert.match(call.options.body,/[0-9a-f]{64}/);assert.equal(call.options.headers.Authorization,'Bearer service-secret');
});
test('opaque URLs are participant/date/reason-scoped while only hashes are persisted',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';process.env.PUBLIC_SITE_URL='https://mission.example';let inserted;
 const urls=await service.issueStatusUrls({participantId:'11111111-1111-4111-8111-111111111111',caseId:'22222222-2222-4222-8222-222222222222',studyDate:'2026-08-24'},{fetch:async(_url,options)=>{inserted=JSON.parse(options.body);return {ok:true};}});
 assert.deepEqual(inserted.map(x=>x.reason),service.REASONS);assert.ok(inserted.every(x=>x.study_date==='2026-08-24'&&/^[0-9a-f]{64}$/.test(x.token_hash)));
 for(const row of inserted)assert.ok(!Object.values(urls).some(url=>url.includes(row.token_hash)));
 assert.deepEqual(Object.keys(urls),['teacher_absent_url','student_absent_url','schedule_disruption_url']);
});
test('invalid and expired tokens are rejected without protected data',async()=>{
 assert.equal((await service.recordToken('bad')).status,400);
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';
 const expired=await service.recordToken('B'.repeat(43),{fetch:async()=>({ok:false,json:async()=>({message:'expired_status_token'})})});assert.equal(expired.status,410);assert.equal(expired.body.message,'This link has expired.');
 assert.doesNotMatch(page+browser,/student[_ -]?(name|initials)|participant[_ -]?id|case[_ -]?code|BIP|BSP/i);
});
test('Denver study-date and next-morning buffer handle MST and MDT',()=>{
 assert.equal(service.dateParts(new Date('2026-08-25T05:30:00Z')),'2026-08-24');
 assert.equal(service.expiresForStudyDate('2026-01-15').toISOString(),'2026-01-16T13:00:00.000Z');
 assert.equal(service.expiresForStudyDate('2026-08-24').toISOString(),'2026-08-25T12:00:00.000Z');
});
test('migration enforces append-only history, idempotency, deterministic latest state, and RLS',()=>{
 assert.match(migration,/append-only[\s\S]*before update or delete/);assert.match(migration,/token_id uuid unique/);
 assert.match(migration,/order by e\.recorded_at desc, e\.id desc/);assert.match(migration,/supersedes_event_id/);
 assert.match(migration,/revoke all on public\.participant_study_day_status_tokens, public\.participant_study_day_status_events from anon, authenticated/);
 assert.doesNotMatch(migration,/grant insert[\s\S]*to (anon|authenticated)/);assert.match(migration,/grant execute on function public\.record_study_day_status_token\(text\) to service_role/);
});
test('feature remains contextual, QA-only, and cannot enable or send reminders',()=>{
 const files=[migration,fs.readFileSync(new URL('./research-admin-study-day-status.js',import.meta.url),'utf8'),fs.readFileSync(new URL('../research-admin/operations-ui.mjs',import.meta.url),'utf8')].join('\n');
 assert.doesNotMatch(files,/Resend|TEACHER_REMINDER_SYSTEM_ENABLED\s*=|api\.resend\.com/);assert.match(files,/MR-998/);assert.match(files,/email_sent: false/);
 for(const protectedTerm of ['adherence denominator','mission completion','weekly practice','phase decisions','mission scores','streaks'])assert.doesNotMatch(migration,new RegExp(`update[^;]*${protectedTerm}`,'i'));
});
