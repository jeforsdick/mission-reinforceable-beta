import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderParticipantReadiness } from './participant-readiness.mjs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20260902010000_participant_setup_readiness.sql',import.meta.url),'utf8');
const simulationMigration=fs.readFileSync(new URL('../supabase/migrations/20260903000000_test_reminder_simulation_readiness.sql',import.meta.url),'utf8');
const completionCorrection=fs.readFileSync(new URL('../supabase/migrations/20260903010000_correct_reminder_any_valid_mission.sql',import.meta.url),'utf8');
const setterFix=fs.readFileSync(new URL('../supabase/migrations/20260902020000_fix_test_participant_setter.sql',import.meta.url),'utf8');

test('participant readiness reports every researcher setup gate and operational history',()=>{
  const html=renderParticipantReadiness({study_id:'MR-101',teacher_name:'Teacher One',teacher_email:'teacher@example.org',study_date:'2026-09-02',auth_linked:true,case_assigned:true,participant_active:false,reminders_enabled:false,eligible:false,reason_not_eligible:'Participant or case is inactive',last_reminder:{study_date:'2026-09-01',status:'sent'},last_mission_completion:{ended_at:'2026-09-01T20:00:00Z',mission_id:'daily-1',qa_mode:false}},x=>String(x));
  for(const label of ['Auth linked','Case assigned','Participant active','Production email delivery','Participant daily reminders','Production reminder eligibility','Participant or case is inactive','2026-09-01 · sent','daily-1']) assert.match(html,new RegExp(label));
});

test('disabled and enabled participants render the appropriate nearby reminder action',()=>{
  const disabled=renderParticipantReadiness({study_id:'MR-101',study_date:'2026-09-02',reminders_enabled:false,eligible:false,reason_not_eligible:'Daily reminders are not enabled'},x=>String(x));
  assert.match(disabled,/Not eligible: Daily reminders are not enabled[\s\S]*Enable Daily Reminders/);
  assert.match(disabled,/class="primary reminder-setting-action no-print"[\s\S]*data-enabled="true"/);
  const enabled=renderParticipantReadiness({study_id:'MR-101',study_date:'2026-09-02',reminders_enabled:true,eligible:true},x=>String(x));
  assert.match(enabled,/class="quiet reminder-setting-action no-print"[\s\S]*data-enabled="false"[\s\S]*Disable Daily Reminders/);
});

test('both readiness actions confirm, reuse reminder settings, and refresh readiness',()=>{
  const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
  assert.match(admin,/\.reminder-setting-action/);
  assert.match(admin,/Enable daily Mission: Reinforceable reminders for this teacher\?/);
  assert.match(admin,/Disable daily Mission: Reinforceable reminders for this teacher\?/);
  assert.match(admin,/if\(window\.confirm\(prompt\)\)setTeacherReminders\(caseId,enabled\)/);
  assert.match(admin,/setTeacherReminders[\s\S]*\/api\/research-admin-set-teacher-reminders[\s\S]*await loadIntakes\(\);await openDetail/);
});

test('readiness controls add no API route, RPC, schema, or reminder implementation',()=>{
  const source=fs.readFileSync(new URL('./participant-readiness.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\/api\/|\.rpc\(|teacher_reminder_settings|create (?:or replace )?function/i);
});

test('fake participants are unmistakable and document the safe end-to-end path',()=>{
  const html=renderParticipantReadiness({study_id:'MR-998',teacher_email:'fake@testemail.com',study_date:'2026-09-02',auth_linked:true,case_assigned:true,participant_active:true,reminders_enabled:false,eligible:false,is_test:true,simulation_available:false,simulation_reason:"Today's mission is complete",completed_required_today:true,last_mission_completion:{ended_at:'today',mission_id:'required-daily',qa_mode:false}},x=>String(x));
  assert.match(html,/TEST PARTICIPANT/);
  assert.match(html,/excluded from production reminder recipients and dissertation counts\/outcomes/);
  assert.match(html,/Today(?:'|’)s mission is complete/i);
  assert.match(html,/QA preview sessions still do not suppress mission reminders/);
  assert.match(html,/Return to Real Participant/);
  assert.match(html,/Simulate Today’s Reminder/);
});

test('test status is explicit and never inferred from identity or email',()=>{
  assert.match(migration,/alter table public\.participants add column is_test/);
  assert.doesNotMatch(migration,/@testemail\.com/i);
  assert.doesNotMatch(migration,/update public\.participants[\s\S]*set is_test = true/i);
  assert.doesNotMatch(migration,/participant_code\s*(=|like)[\s\S]*is_test/i);
  assert.match(migration,/update public\.participants set is_test=target_is_test/);
  assert.match(migration,/if not public\.is_research_admin\(\)/);
});

test('real email domains do not affect candidates and only explicit test status excludes them',()=>{
  assert.match(migration,/where trs\.enabled and not p\.is_test/);
  const candidates=migration.slice(migration.indexOf('create or replace function public.eligible_teacher_reminders'),migration.indexOf('create function public.research_admin_participant_readiness'));
  assert.doesNotMatch(candidates,/pr\.email\s+(like|ilike)|lower\(pr\.email\)/i);
  assert.match(candidates,/nullif\(btrim\(pr\.email\), ''\) is not null/);
});

test('researcher UI confirms both explicit test-state transitions',()=>{
  const real=renderParticipantReadiness({study_id:'MR-101',study_date:'2026-09-02',is_test:false},x=>String(x));
  assert.match(real,/Mark as Test Participant/);
  const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
  assert.match(admin,/research_admin_set_test_participant/);
  assert.match(admin,/window\.confirm/);
  assert.match(admin,/target_is_test:next/);
});

test('schema reuses assignments and exact completion',()=>{
  assert.match(migration,/join public\.profiles pr on pr\.id = p\.auth_user_id/);
  assert.match(migration,/join public\.cases c on c\.id = p\.case_id/);
  assert.match(migration,/left join public\.teacher_reminder_settings rs/);
  assert.match(migration,/public\.has_completed_mission_on_study_date\(p\.id,c\.id,target_study_date,'America\/Denver'\)/);
});

test('completion correction covers valid modes and rejects invalid sessions',()=>{
  for(const mode of ['daily','mystery','crisis']) assert.match(completionCorrection,new RegExp(`'${mode}'`));
  for(const gate of [/gs\.qa_mode = false/,/gs\.status = 'completed'/,/gs\.participant_id = target_participant_id/,/gs\.case_id = target_case_id/,/gs\.game_content_version = content\.version/,/published_mission ->> 'id' = gs\.mission_id/]) assert.match(completionCorrection,gate);
  assert.match(completionCorrection,/gs\.mode in \('daily', 'mystery', 'crisis'\)/);
  assert.doesNotMatch(completionCorrection,/replace\(target_study_date|gs\.mode = 'daily'/);
});

test('readiness and test simulation share broader completion and researcher wording',()=>{
  assert.match(completionCorrection,/'simulation_available'[\s\S]*has_completed_mission_on_study_date/);
  assert.match(completionCorrection,/'eligible'[\s\S]*has_completed_mission_on_study_date/);
  assert.match(completionCorrection,/'last_mission_completion'/);
  assert.match(completionCorrection,/Today''s mission is complete/);
  assert.doesNotMatch(completionCorrection,/required Daily mission is complete|last_daily_completion/i);
  const ui=fs.readFileSync(new URL('./participant-readiness.mjs',import.meta.url),'utf8');
  assert.match(ui,/Last mission completion:/);
  assert.match(ui,/today’s mission is complete/);
  assert.doesNotMatch(ui,/required Daily mission is complete|Last Daily completion/i);
});

test('study-wide operations and dissertation observation summaries exclude tests but direct inspection remains',()=>{
  assert.match(migration,/research_admin_operations_dashboard[\s\S]*target_case_id is null and not p\.is_test/);
  assert.match(migration,/research_admin_observation_dashboard[\s\S]*target_case_id is null and not participant\.is_test/);
  assert.match(migration,/target_case_id is not null and o\.case_id=target_case_id/);
  assert.match(migration,/target_case_id is not null and c\.id=target_case_id/);
});

test('TEST to REAL removes only simulated reminder claims',()=>{
  const setter=migration.slice(migration.indexOf('create function public.research_admin_set_test_participant'),migration.indexOf('revoke all on function public.research_admin_participant_readiness'));
  assert.match(setter,/if not target_is_test then/);
  assert.match(setter,/delete from public\.teacher_reminder_events/);
  assert.match(setter,/e\.provider_message_id='simulated-test'/);
  assert.doesNotMatch(setter,/provider_message_id is not null|status='sent'/);
});

test('corrective test-participant setter avoids a nonexistent participant timestamp',()=>{
  assert.match(setterFix,/create or replace function public\.research_admin_set_test_participant/);
  assert.match(setterFix,/if not public\.is_research_admin\(\)/);
  assert.match(setterFix,/update public\.participants set is_test=target_is_test where case_id=target_case_id/);
  assert.doesNotMatch(setterFix,/update public\.participants\s+set[^;]*updated_at/i);
  assert.match(setterFix,/if not target_is_test then[\s\S]*e\.provider_message_id='simulated-test'/);
  assert.doesNotMatch(setterFix,/provider_message_id is not null|status='sent'/);
});

test('case-specific PDF report labels test data as excluded from dissertation reporting',()=>{
  const report=fs.readFileSync(new URL('./case-report.mjs',import.meta.url),'utf8');
  const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
  assert.match(report,/TEST PARTICIPANT — EXCLUDED FROM DISSERTATION REPORTING/);
  assert.match(admin,/is_test: state\.participantReadiness\?\.is_test === true/);
});


test('readiness separates production delivery, participant settings, and safe test simulation',()=>{
  const testHtml=renderParticipantReadiness({study_id:'MR-998',study_date:'2026-09-03',is_test:true,auth_linked:true,case_assigned:true,participant_active:true,reminders_enabled:false,simulation_available:true},x=>String(x),{productionEmailDelivery:false});
  assert.match(testHtml,/Production email delivery[\s\S]*Off/);
  assert.match(testHtml,/Participant daily reminders[\s\S]*Disabled/);
  assert.match(testHtml,/Test simulation[\s\S]*Available/);
  assert.match(testHtml,/Test simulations do not send email and can be used while production delivery is off/);
  assert.doesNotMatch(testHtml,/Enable Daily Reminders/);
  assert.match(testHtml,/id="simulate-test-reminder"[^>]*>Simulate Today’s Reminder/);

  const realHtml=renderParticipantReadiness({study_id:'MR-101',study_date:'2026-09-03',is_test:false,reminders_enabled:false,eligible:false},x=>String(x),{productionEmailDelivery:false});
  assert.match(realHtml,/Production email delivery[\s\S]*Off/);
  assert.match(realHtml,/Participant daily reminders[\s\S]*Disabled/);
  assert.match(realHtml,/Enable Daily Reminders/);
  assert.doesNotMatch(realHtml,/Test simulation/);
  assert.doesNotMatch(testHtml,/Reminder system enabled/);
});

test('test simulation gates setup but not production delivery or live reminder settings',()=>{
  const simulation=simulationMigration.slice(simulationMigration.indexOf('create or replace function public.research_admin_simulate_test_reminder'));
  assert.match(simulationMigration,/'simulation_available',p\.is_test[\s\S]*auth_user_id=pr\.id[\s\S]*p\.active and c\.active[\s\S]*pr\.active and pr\.role='teacher'[\s\S]*has_completed_mission_on_study_date/);
  assert.match(simulation,/r->>'simulation_available'/);
  assert.doesNotMatch(simulation,/r->>'eligible'|reminders_enabled|teacher_reminder_settings|TEACHER_REMINDER_SYSTEM_ENABLED|resend/i);
  assert.match(simulation,/suppressed_completed/);
  assert.match(simulation,/suppressed_not_ready/);
  assert.match(simulation,/provider_message_id[\s\S]*'simulated-test'/);
});

test('production eligibility and schedules remain unchanged',()=>{
  const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');
  const service=fs.readFileSync(new URL('../server/teacher-reminder-service.js',import.meta.url),'utf8');
  assert.match(migration,/where trs\.enabled and not p\.is_test/);
  assert.match(service,/rpc\/eligible_teacher_reminders/);
  assert.match(vercel,/"schedule": "0 14 \* \* 1-5"/);
  assert.match(vercel,/"schedule": "0 16 \* \* 1-5"/);
});
