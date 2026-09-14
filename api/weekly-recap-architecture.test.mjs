import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const api=fs.readFileSync(new URL('./research-admin-communication-readiness.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260914000000_weekly_teacher_recap_foundation.sql',import.meta.url),'utf8');
const assignmentScopeFix=fs.readFileSync(new URL('../supabase/migrations/20260914010000_fix_weekly_summary_assignment_scope.sql',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('weekly readiness is separate from Daily reminder settings',()=>{
  assert.match(migration,/weekly_qualtrics_url/);
  assert.doesNotMatch(migration,/teacher_reminder_settings/);
  assert.match(api,/test_email_available: participant\.is_test/);
});

test('participant URL setter uses only existing participant columns',()=>{
  const setter=migration.slice(migration.indexOf('create function public.research_admin_set_weekly_qualtrics_url'),migration.indexOf('create function public.research_admin_weekly_game_summary'));
  assert.match(setter,/update public\.participants set weekly_qualtrics_url=clean_url\s+where case_id=target_case_id/);
  assert.doesNotMatch(setter,/updated_at\s*=\s*now\(\)|participants\.updated_at/i);
});

test('weekly RPCs explicitly grant authenticated and service-role execution',()=>{
  assert.match(migration,/grant execute on function public\.research_admin_set_weekly_qualtrics_url\(uuid,text\), public\.research_admin_weekly_game_summary\(uuid,date\) to authenticated, service_role;/);
  assert.match(migration,/auth\.role\(\)='service_role' or public\.is_research_admin\(\)/);
});

test('summary uses the single current case_game_content row and its version',()=>{
  const bootstrap=fs.readFileSync(new URL('../supabase/migrations/20260812000000_legacy_schema_bootstrap.sql',import.meta.url),'utf8');
  const publishing=fs.readFileSync(new URL('../supabase/migrations/20260824000000_protected_game_publishing.sql',import.meta.url),'utf8');
  assert.match(bootstrap,/case_id uuid primary key references public\.cases/);
  assert.match(publishing,/insert into public\.case_game_content\([\s\S]*?on conflict\(case_id\) do update/);
  assert.match(migration,/join public\.case_game_content gc on gc\.case_id=p\.case_id/);
  assert.match(migration,/gs\.game_content_version=a\.version/);
  assert.doesNotMatch(migration,/case_game_content_versions/);
});

test('test send is restricted to explicit tests and only TEST_EMAIL_RECIPIENT',()=>{
  assert.match(api,/if \(!participant\.is_test\)/);
  assert.match(api,/to: \[process\.env\.TEST_EMAIL_RECIPIENT\]/);
  assert.doesNotMatch(api,/to: \[participant\.teacher/);
});

test('weekly test delivery sends only to TEST_EMAIL_RECIPIENT',async()=>{
  const originalFetch=global.fetch, originalEnv={...process.env};
  const sent=[];
  process.env.SUPABASE_URL='https://db.example';process.env.SUPABASE_SERVICE_ROLE_KEY='service';process.env.RESEND_API_KEY='resend';process.env.TEST_EMAIL_RECIPIENT='researcher@example.org';process.env.TEACHER_GAME_URL='https://missionreinforceable.com/game/';
  global.fetch=async(url,options={})=>{
    if(url==='https://db.example/auth/v1/user')return {ok:true,json:async()=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'})};
    if(String(url).includes('/profiles?id=eq.aaaaaaaa'))return {ok:true,json:async()=>[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'research_admin',active:true}]};
    if(String(url).includes('/participants?'))return {ok:true,json:async()=>[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',participant_code:'MR-998',is_test:true,weekly_qualtrics_url:'https://educationutah.co1.qualtrics.com/jfe/form/SV_9MsIT9TZXCdeIWa?StudyID=MR-998',auth_user_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}]};
    if(String(url).includes('/profiles?id=eq.cccccccc'))return {ok:true,json:async()=>[{display_name:'Pat Example'}]};
    if(String(url).includes('/rpc/research_admin_weekly_game_summary'))return {ok:true,json:async()=>({missions_completed:1,days_practiced:1,mission_mix:{daily:1,mystery:0,crisis:0},xp_available:false})};
    if(url==='https://api.resend.com/emails'){sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({id:'msg-1'})};}
    throw new Error(`Unexpected fetch ${url}`);
  };
  const handler=require('./research-admin-communication-readiness.js');
  const request={method:'POST',headers:{authorization:'Bearer admin'},body:{action:'send_weekly_test',case_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}};
  let statusCode,body;const response={status(code){statusCode=code;return this;},json(value){body=value;return value;}};
  try{await handler(request,response);}finally{global.fetch=originalFetch;process.env=originalEnv;}
  assert.equal(statusCode,200);assert.equal(body.success,true);assert.equal(sent.length,1);assert.deepEqual(sent[0].to,['researcher@example.org']);assert.ok(!JSON.stringify(sent[0].to).includes('teacher'));
});

test('weekly SQL applies finalized current-pool filters and omits unpersisted XP',()=>{
  for(const filter of ["gs.status='completed'","gs.qa_mode=false","gs.mode in ('daily','mystery','crisis')","gs.game_content_version=a.version","mission->>'id'=gs.mission_id",'public.is_mr_dissertation_study_day']) assert.ok(migration.includes(filter),filter);
  assert.match(migration,/'behavior_plan_xp',null,'xp_available',false/);
});

test('corrective weekly summary keeps the current-content guard in SQL scope',()=>{
  assert.match(assignmentScopeFix,/create or replace function public\.research_admin_weekly_game_summary\(target_case_id uuid, target_week_start date\)/);
  assert.doesNotMatch(assignmentScopeFix,/if not exists\(select 1 from assignment\)/i);
  assert.match(assignmentScopeFix,/if not exists\(\s*select 1\s*from public\.participants p\s*join public\.case_game_content gc on gc\.case_id=p\.case_id\s*where p\.case_id=target_case_id\s*\) then raise exception 'current published game content unavailable' using errcode='P0002'/);
});

test('corrective weekly summary preserves recap filters, authorization, and grants',()=>{
  for(const behavior of [
    "auth.role()='service_role' or public.is_research_admin()",
    'extract(isodow from target_week_start) <> 1',
    "at time zone 'America/Denver'",
    "gs.status='completed'",
    'gs.qa_mode=false',
    "gs.mode in ('daily','mystery','crisis')",
    'gs.game_content_version=a.version',
    "mission->>'id'=gs.mission_id",
    'public.is_mr_dissertation_study_day',
    'count(distinct study_date)',
    "'behavior_plan_xp',null,'xp_available',false"
  ]) assert.ok(assignmentScopeFix.includes(behavior),behavior);
  assert.match(assignmentScopeFix,/revoke all on function public\.research_admin_weekly_game_summary\(uuid,date\) from public;/);
  assert.match(assignmentScopeFix,/grant execute on function public\.research_admin_weekly_game_summary\(uuid,date\) to authenticated, service_role;/);
});

test('no production weekly cron is added and Daily schedules stay fixed',()=>{
  assert.deepEqual(vercel.crons,[{path:'/api/teacher-daily-prompt',schedule:'0 14 * * 1-5'},{path:'/api/teacher-daily-prompt-retry',schedule:'0 16 * * 1-5'}]);
  assert.ok(fs.readdirSync(new URL('.',import.meta.url)).filter(name=>name.endsWith('.js')).length<=12);
});
