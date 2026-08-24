import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const service=require('../server/study-day-status-service');
const handler=require('./study-day-status');
const adminHandler=require('./research-admin-study-day-status');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260824040000_study_day_status_reporting.sql',import.meta.url),'utf8');
const teacherUnavailableMigration=fs.readFileSync(new URL('../supabase/migrations/20260824050000_teacher_unavailable_status.sql',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../supabase/migrations/20260812000000_legacy_schema_bootstrap.sql',import.meta.url),'utf8');
const participantCompositeKey=fs.readFileSync(new URL('../supabase/migrations/20260818020000_weekly_teacher_checkins.sql',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../study-day-status/index.html',import.meta.url),'utf8');
const browser=fs.readFileSync(new URL('../study-day-status/status.js',import.meta.url),'utf8');

function response(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
test('GET alone is prefetch-safe and never mutates study-day status',async()=>{const result=response();await handler({method:'GET'},result);assert.equal(result.statusCode,405);assert.equal(result.headers.Allow,'POST');assert.doesNotMatch(page,/method=["']post/i);});
test('JavaScript auto-POST is the normal one-tap recording flow',()=>{assert.match(browser,/fetch\('\/api\/study-day-status', \{ method: 'POST'/);assert.match(browser,/\n  record\(\);/);assert.match(browser,/GET\/prefetch safe/);});
test('failed JavaScript POST reveals the manual retry button',()=>{assert.match(page,/<button id="fallback" type="button">Record today's status<\/button>/);assert.match(browser,/if \(!error\.permanent\) \{ fallback\.hidden = false; fallback\.disabled = false; \}/);assert.match(browser,/fallback\.addEventListener\('click'/);});
test('no-JavaScript state is explanatory only and exposes no fake submit control',()=>{assert.match(page,/<noscript><p class="noscript">JavaScript is needed to record this update\. Please open this link in a standard browser\.<\/p><\/noscript>/);const noScript=page.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];assert.doesNotMatch(noScript,/<button|<form|<style/i);});
test('valid browser POST records through a hashed service-role RPC and returns generic copy',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-secret';let call;
 const result=await service.recordToken('A'.repeat(43),{fetch:async(url,options)=>{call={url,options};return {ok:true,json:async()=>[{reason:'teacher_unavailable',already_recorded:false}]};}});
 assert.equal(result.status,200);assert.equal(result.body.heading,'✓ Got it.');assert.equal(result.body.message,"You're excused from today's mission.");assert.equal(result.body.detail,"You don't need to complete Mission: Reinforceable today.");assert.match(call.url,/rpc\/record_study_day_status_token$/);assert.doesNotMatch(call.options.body,/A{20}/);assert.match(call.options.body,/[0-9a-f]{64}/);assert.equal(call.options.headers.Authorization,'Bearer service-secret');
});
test('opaque URLs are participant/date/reason-scoped while only hashes are persisted',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';process.env.PUBLIC_SITE_URL='https://mission.example';let inserted;
 const urls=await service.issueStatusUrls({participantId:'11111111-1111-4111-8111-111111111111',caseId:'22222222-2222-4222-8222-222222222222',studyDate:'2026-08-24'},{fetch:async(_url,options)=>{inserted=JSON.parse(options.body);return {ok:true};}});
 assert.deepEqual(inserted.map(x=>x.reason),service.REASONS);assert.ok(inserted.every(x=>x.study_date==='2026-08-24'&&/^[0-9a-f]{64}$/.test(x.token_hash)));
 for(const row of inserted)assert.ok(!Object.values(urls).some(url=>url.includes(row.token_hash)));
 assert.deepEqual(service.REASONS,['teacher_unavailable']);assert.deepEqual(inserted.map(x=>x.reason),['teacher_unavailable']);
 assert.deepEqual(Object.keys(urls),['teacher_unavailable_url']);
 assert.doesNotMatch(JSON.stringify(urls),/teacher_absent|student_absent|schedule_disruption/);
});
test('Research Admin QA derives HTTPS request origin without production URL configuration or email',async()=>{
 const savedPublic=process.env.PUBLIC_SITE_URL,savedGame=process.env.TEACHER_GAME_URL;
 delete process.env.PUBLIC_SITE_URL;delete process.env.TEACHER_GAME_URL;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-secret';
 const calls=[];global.fetch=async(url,options={})=>{calls.push({url:String(url),options});if(String(url).endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:'admin-id'})};if(String(url).includes('/profiles?'))return {ok:true,json:async()=>[{id:'admin-id',role:'research_admin',active:true}]};if(String(url).includes('/participants?'))return {ok:true,json:async()=>[{id:'11111111-1111-4111-8111-111111111111',case_id:'22222222-2222-4222-8222-222222222222',participant_code:'MR-998',cases:{case_code:'CASE-998'}}]};if(String(url).endsWith('/participant_study_day_status_tokens'))return {ok:true};throw new Error(`Unexpected request: ${url}`);};
 const result=response();await adminHandler({method:'POST',headers:{authorization:'Bearer admin-token','x-forwarded-proto':'https','x-forwarded-host':'qa.mission.example'},body:{action:'generate_qa',case_id:'22222222-2222-4222-8222-222222222222'}},result);
 assert.equal(result.statusCode,200);assert.equal(result.body.email_sent,false);assert.deepEqual(Object.keys(result.body.urls),['teacher_unavailable_url']);assert.match(result.body.urls.teacher_unavailable_url,/^https:\/\/qa\.mission\.example\/study-day-status\/\?token=/);
 assert.ok(calls.some(call=>call.url.endsWith('/participant_study_day_status_tokens')));assert.ok(!calls.some(call=>/resend|email/i.test(call.url)));
 if(savedPublic===undefined)delete process.env.PUBLIC_SITE_URL;else process.env.PUBLIC_SITE_URL=savedPublic;if(savedGame===undefined)delete process.env.TEACHER_GAME_URL;else process.env.TEACHER_GAME_URL=savedGame;
});
test('QA origin rejects insecure non-local HTTP before token insertion',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';let inserted=false;
 await assert.rejects(service.issueStatusUrls({participantId:'11111111-1111-4111-8111-111111111111',caseId:'22222222-2222-4222-8222-222222222222',studyDate:'2026-08-24',origin:'http://qa.mission.example'},{fetch:async()=>{inserted=true;return {ok:true};}}),/secure PUBLIC_SITE_URL/);assert.equal(inserted,false);
 assert.equal(adminHandler.requestOrigin({headers:{'x-forwarded-proto':'http',host:'localhost:3000'}}),'http://localhost:3000');
});
test('Research Admin logs safe failure context but no raw status token',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='secret';const logs=[];const prior=console.error;console.error=(...values)=>logs.push(values);
 global.fetch=async(url)=>{if(String(url).endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:'admin-id'})};if(String(url).includes('/profiles?'))return {ok:true,json:async()=>[{id:'admin-id',role:'research_admin',active:true}]};if(String(url).includes('/participants?'))return {ok:true,json:async()=>[{id:'11111111-1111-4111-8111-111111111111',case_id:'22222222-2222-4222-8222-222222222222',participant_code:'MR-998',cases:{case_code:'CASE-998'}}]};return {ok:false};};
 try{const result=response();await adminHandler({method:'POST',headers:{authorization:'Bearer admin-token','x-forwarded-proto':'https',host:'qa.example'},body:{action:'generate_qa',case_id:'22222222-2222-4222-8222-222222222222'}},result);assert.equal(result.statusCode,500);assert.deepEqual(result.body,{error:'Study-day context request failed'});}finally{console.error=prior;}
 const output=JSON.stringify(logs);assert.match(output,/generate_qa/);assert.match(output,/22222222-2222-4222-8222-222222222222/);assert.match(output,/Status links could not be issued/);assert.doesNotMatch(output,/[A-Za-z0-9_-]{40,}/);
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
 assert.match(migration,/create table public\.participant_study_day_status_tokens/);assert.match(migration,/create table public\.participant_study_day_status_events/);
 assert.match(bootstrap,/create table if not exists public\.participants[\s\S]*participant_code text not null unique/);assert.match(bootstrap,/case_id uuid not null references public\.cases\(id\)/);assert.match(bootstrap,/create table if not exists public\.cases[\s\S]*case_code text not null unique/);
 assert.match(participantCompositeKey,/participants_id_case_id_key unique \(id, case_id\)/);assert.match(migration,/foreign key \(participant_id, case_id\) references public\.participants\(id, case_id\)/);
 assert.match(migration,/insert into public\.participant_study_day_status_events/);assert.match(migration,/grant execute on function public\.record_study_day_status_token\(text\) to service_role/);
 assert.match(migration,/append-only[\s\S]*before update or delete/);assert.match(migration,/token_id uuid unique/);
 assert.match(migration,/order by e\.recorded_at desc, e\.id desc/);assert.match(migration,/supersedes_event_id/);
 assert.match(migration,/revoke all on public\.participant_study_day_status_tokens, public\.participant_study_day_status_events from anon, authenticated/);
 assert.doesNotMatch(migration,/grant insert[\s\S]*to (anon|authenticated)/);assert.match(migration,/grant execute on function public\.record_study_day_status_token\(text\) to service_role/);
});
test('forward migration permits current and legacy reasons without rewriting history or append-only protections',()=>{
 for(const reason of ['teacher_unavailable','teacher_absent','student_absent','schedule_disruption'])assert.match(teacherUnavailableMigration,new RegExp(`'${reason}'`));
 assert.match(teacherUnavailableMigration,/alter table public\.participant_study_day_status_tokens[\s\S]*add constraint participant_study_day_status_tokens_reason_check/);
 assert.match(teacherUnavailableMigration,/alter table public\.participant_study_day_status_events[\s\S]*add constraint participant_study_day_status_events_reason_check/);
 assert.doesNotMatch(teacherUnavailableMigration,/drop table|create table|update public\.participant_study_day_status_(tokens|events)|delete from|truncate/i);
 assert.match(teacherUnavailableMigration,/target_reason <> 'teacher_unavailable'/);
 assert.doesNotMatch(teacherUnavailableMigration,/target_reason[^;]*teacher_absent[^;]*then/i);
});
test('feature remains contextual, QA-only, and cannot enable or send reminders',()=>{
 const files=[migration,fs.readFileSync(new URL('./research-admin-study-day-status.js',import.meta.url),'utf8'),fs.readFileSync(new URL('../research-admin/operations-ui.mjs',import.meta.url),'utf8')].join('\n');
 assert.doesNotMatch(files,/Resend|TEACHER_REMINDER_SYSTEM_ENABLED\s*=|api\.resend\.com/);assert.match(files,/MR-998/);assert.match(files,/email_sent: false/);
 for(const protectedTerm of ['adherence denominator','mission completion','weekly practice','phase decisions','mission scores','streaks'])assert.doesNotMatch(migration,new RegExp(`update[^;]*${protectedTerm}`,'i'));
});
