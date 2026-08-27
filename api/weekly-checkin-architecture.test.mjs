import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const adminHandler=require('./research-admin-study-day-status');
const migration=fs.readFileSync(new URL('../supabase/migrations/20260824070000_external_weekly_qualtrics_checkins.sql',import.meta.url),'utf8');
const authorizationFix=fs.readFileSync(new URL('../supabase/migrations/20260825000000_fix_weekly_checkin_generation_authorization.sql',import.meta.url),'utf8');
function response(){return {statusCode:0,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},setHeader(){}};}
test('schema stores administration metadata but no Qualtrics answers',()=>{assert.match(migration,/participant_weekly_checkins/);assert.doesNotMatch(migration,/target_behavior_rating|replacement_behavior_rating|social_validity|teacher_comment|survey_answer/);assert.match(migration,/raw tokens are never persisted/i);});
test('completion is idempotent and stamps both records',()=>{assert.match(migration,/coalesce\(token_row\.completed_at,now\(\)\)/);assert.match(migration,/completed_at=coalesce\(completed_at,completion_time\)/);});
test('expectation is phase-bound and independent of daily unavailable events',()=>{assert.match(migration,/phase='intervention'/);assert.doesNotMatch(migration,/teacher_unavailable/);assert.match(migration,/target_week_start\+4<intervention_start/);});
test('browser mutation and production sending remain disabled',()=>{assert.match(migration,/revoke all .*anon,authenticated/);assert.doesNotMatch(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'),/weekly-checkin/);assert.doesNotMatch(fs.readFileSync(new URL('./research-admin-study-day-status.js',import.meta.url),'utf8'),/resend|sendEmail|TEACHER_REMINDER_SYSTEM_ENABLED/i);});
test('generation accepts only the trusted service-role execution path',()=>{
 assert.match(authorizationFix,/auth\.role\(\) <> 'service_role'/);
 assert.match(authorizationFix,/revoke all on function public\.research_admin_generate_weekly_checkin\(uuid,uuid,date,text\) from public,anon,authenticated/);
 assert.match(authorizationFix,/grant execute on function public\.research_admin_generate_weekly_checkin\(uuid,uuid,date,text\) to service_role/);
 assert.doesNotMatch(authorizationFix,/is_research_admin\(\)/);
});
test('MR-998 Research Admin QA generates a hashed weekly token without email',async()=>{
 const originalFetch=global.fetch;
 const originalEnvironment={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,qualtrics:process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL};
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='service-secret';process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL='https://granite.qualtrics.com/jfe/form/SV_weekly';
 const calls=[];
 global.fetch=async(url,options={})=>{calls.push({url:String(url),options});if(String(url).endsWith('/auth/v1/user'))return {ok:true,json:async()=>({id:'admin-id'})};if(String(url).includes('/profiles?'))return {ok:true,json:async()=>[{id:'admin-id',role:'research_admin',active:true}]};if(String(url).includes('/participants?'))return {ok:true,json:async()=>[{id:'11111111-1111-4111-8111-111111111111',case_id:'22222222-2222-4222-8222-222222222222',participant_code:'MR-998',cases:{case_code:'CASE-998'}}]};if(String(url).endsWith('/rpc/research_admin_generate_weekly_checkin'))return {ok:true,json:async()=>null};if(String(url).endsWith('/rpc/research_admin_weekly_checkins'))return {ok:true,json:async()=>[{week_start:'2026-08-17'},{week_start:'2026-08-24'}]};throw new Error(`Unexpected request: ${url}`);};
 try{
  const result=response();await adminHandler({method:'POST',headers:{authorization:'Bearer admin-token','x-forwarded-proto':'https','x-forwarded-host':'qa.mission.example'},body:{action:'generate_weekly_qa',case_id:'22222222-2222-4222-8222-222222222222',week_start:'2026-08-24'}},result);
  assert.equal(result.statusCode,200);assert.equal(result.body.email_sent,false);const qualtrics=new URL(result.body.qualtrics_url);assert.equal(qualtrics.origin,'https://granite.qualtrics.com');assert.equal(qualtrics.searchParams.get('participant_code'),'MR-998');assert.equal(qualtrics.searchParams.get('week_number'),'2');assert.equal(qualtrics.searchParams.size,3);assert.match(result.body.completion_test_url,/^https:\/\/qa\.mission\.example\/weekly-checkin-complete\/\?token=/);
  const rpc=calls.find(call=>call.url.endsWith('/rpc/research_admin_generate_weekly_checkin'));assert.ok(rpc);assert.equal(rpc.options.headers.Authorization,'Bearer service-secret');const persisted=JSON.parse(rpc.options.body);assert.match(persisted.target_token_hash,/^[0-9a-f]{64}$/);assert.ok(!result.body.qualtrics_url.includes(persisted.target_token_hash));assert.ok(!calls.some(call=>/resend|email/i.test(call.url)));
 }finally{
  global.fetch=originalFetch;for(const [name,value] of [['SUPABASE_URL',originalEnvironment.url],['SUPABASE_SERVICE_ROLE_KEY',originalEnvironment.key],['WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL',originalEnvironment.qualtrics]])if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
});
test('weekly listing still rejects a browser request that is not a Research Admin',async()=>{
 const result=response();await adminHandler({method:'POST',headers:{},body:{action:'history',case_id:'22222222-2222-4222-8222-222222222222'}},result);assert.equal(result.statusCode,401);assert.deepEqual(result.body,{error:'Authentication required'});
});

test('same-date phase corrections resolve before Intervention boundaries',()=>{assert.equal((migration.match(/partition by pe\.effective_date order by pe\.recorded_at desc,pe\.id desc/g)||[]).length,4);assert.doesNotMatch(migration,/phase='intervention' order by pe\.effective_date,pe\.recorded_at limit 1/);});
