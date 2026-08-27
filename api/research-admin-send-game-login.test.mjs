import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import emailModule from '../server/game-login-email.js';

const endpoint=await readFile(new URL('../server/research-admin-send-game-login.js',import.meta.url),'utf8');
const communicationEndpoint=await readFile(new URL('./research-admin-communication-readiness.js',import.meta.url),'utf8');
const migration=await readFile(new URL('../supabase/migrations/20260827020000_game_login_email_audit.sql',import.meta.url),'utf8');
const setup=await readFile(new URL('../set-password/set-password.js',import.meta.url),'utf8');
const gameAuth=await readFile(new URL('../game/js/auth.js',import.meta.url),'utf8');

function browserConfiguration(source){
  return Object.fromEntries(['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'].map(name=>[name,source.match(new RegExp(`${name}\\s*=\\s*'([^']+)'`))?.[1]]));
}

test('password setup uses the exact canonical teacher-game Supabase project configuration',()=>{
  assert.deepEqual(browserConfiguration(setup),browserConfiguration(gameAuth));
  assert.ok(browserConfiguration(setup).SUPABASE_PUBLISHABLE_KEY);
  assert.doesNotMatch(setup,/service.role|SERVICE_ROLE/i);
});

test('configuration is fail-closed and requires validated production URLs',()=>{
  assert.equal(emailModule.configuration({}).enabled,false);
  const configured=emailModule.configuration({GAME_LOGIN_EMAIL_ENABLED:'true',RESEND_API_KEY:'secret',TEACHER_REMINDER_FROM_EMAIL:'Mission <mission@example.org>',TEACHER_GAME_URL:'https://mission.example.org/game/',GAME_PASSWORD_SETUP_URL:'https://mission.example.org/set-password/'});
  assert.equal(configured.enabled,true);
  assert.equal(emailModule.configuration({...process.env,GAME_LOGIN_EMAIL_ENABLED:'true',RESEND_API_KEY:'x',TEACHER_REMINDER_FROM_EMAIL:'x',TEACHER_GAME_URL:'http://bad/game/',GAME_PASSWORD_SETUP_URL:'https://ok.example/set-password/'}).enabled,false);
});

test('access-only template contains teacher identity but no student or case content',()=>{
  const message=emailModule.formatGameLoginEmail({teacherName:'Teacher',teacherEmail:'teacher@example.org',actionLink:'https://auth.example/action',gameUrl:'https://mission.example/game/'});
  assert.match(message.subject,/Your Game Access Is Ready/);assert.match(message.text,/teacher@example\.org/);assert.match(message.text,/secure link will expire/i);
  for(const forbidden of ['student alias','case code','study id','diagnosis','target behavior'])assert.doesNotMatch(message.text,new RegExp(forbidden,'i'));
});

test('endpoint derives recipient, uses supported recovery contract and preserves independent actions',()=>{
  assert.match(communicationEndpoint,/request\.method === 'POST'[\s\S]*sendGameLogin/);assert.match(endpoint,/body\.action !== 'send_game_login'/);
  assert.match(endpoint,/authorize\(request\)/);assert.match(endpoint,/research_admin_assert_intervention_launch_ready/);assert.match(endpoint,/profile\.role !== 'teacher'/);
  assert.match(endpoint,/type: 'recovery', email, options: \{ redirectTo: config\.setupUrl \}/);assert.match(endpoint,/Idempotency-Key/);assert.match(endpoint,/to: \[email\]/);
  assert.doesNotMatch(endpoint,/body\.teacher_email|body\.participant_id|body\.password/);
  for(const mutation of [/update public\.cases/i,/update public\.participants/i,/set_teacher_reminders/i])assert.doesNotMatch(endpoint,mutation);
});

test('audit is append-only, correlated, and excludes recovery secrets',()=>{
  for(const action of ['game_login_email_attempted','game_login_email_sent','game_login_email_failed'])assert.match(migration,new RegExp(action));
  for(const field of ['attempt_id','provider_message_id','failure_classification'])assert.match(migration,new RegExp(field));
  assert.doesNotMatch(migration,/recovery_token|action_link|email_body|password text/);
});

test('password setup updates Supabase directly with length, match, invalid-link, and game redirect handling',()=>{
  assert.match(setup,/detectSessionInUrl:true/);assert.match(setup,/exchangeCodeForSession/);assert.match(setup,/getSession/);assert.match(setup,/password\.length<12\|\|password\.length>64/);assert.match(setup,/password!==confirmation/);assert.match(setup,/auth\.updateUser\(\{password\}\)/);assert.match(setup,/location\.replace\('\/game\/'\)/);assert.match(setup,/invalid or has expired/);assert.doesNotMatch(setup,/fetch\(/);
});
