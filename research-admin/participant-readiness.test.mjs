import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderParticipantReadiness } from './participant-readiness.mjs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20260902010000_participant_setup_readiness.sql',import.meta.url),'utf8');

test('participant readiness reports every researcher setup gate and operational history',()=>{
  const html=renderParticipantReadiness({study_id:'MR-101',teacher_name:'Teacher One',teacher_email:'teacher@example.org',study_date:'2026-09-02',auth_linked:true,case_assigned:true,participant_active:false,reminders_enabled:false,eligible:false,reason_not_eligible:'Participant or case is inactive',last_reminder:{study_date:'2026-09-01',status:'sent'},last_daily_completion:{ended_at:'2026-09-01T20:00:00Z',mission_id:'daily-1',qa_mode:false}},x=>String(x));
  for(const label of ['Auth linked','Case assigned','Participant active','Reminder system enabled','Eligible for reminder','Participant or case is inactive','2026-09-01 · sent','daily-1']) assert.match(html,new RegExp(label));
});

test('fake participants are unmistakable and document the safe end-to-end path',()=>{
  const html=renderParticipantReadiness({study_id:'MR-998',teacher_email:'fake@testemail.com',study_date:'2026-09-02',auth_linked:true,case_assigned:true,participant_active:true,reminders_enabled:true,eligible:true,is_test:true,completed_required_today:true,last_daily_completion:{ended_at:'today',mission_id:'required-daily',qa_mode:false}},x=>String(x));
  assert.match(html,/TEST PARTICIPANT/);
  assert.match(html,/excluded from production reminder recipients and dissertation counts\/outcomes/);
  assert.match(html,/today’s required Daily mission is complete/);
  assert.match(html,/QA preview sessions still do not suppress Daily reminders/);
});

test('schema reuses assignments while isolating test recipients and exact completion',()=>{
  assert.match(migration,/alter table public\.participants add column is_test/);
  assert.match(migration,/join public\.profiles pr on pr\.id = p\.auth_user_id/);
  assert.match(migration,/join public\.cases c on c\.id = p\.case_id/);
  assert.match(migration,/left join public\.teacher_reminder_settings rs/);
  assert.match(migration,/where trs\.enabled and not p\.is_test/);
  assert.match(migration,/public\.has_completed_mission_on_study_date\(p\.id,c\.id,target_study_date,'America\/Denver'\)/);
  assert.match(migration,/lower\(pr\.email\) like '%@testemail\.com'/);
});

test('production completion suppression remains qa_mode false and exact Daily mission',()=>{
  const safety=fs.readFileSync(new URL('../supabase/migrations/20260902000000_teacher_reminder_daily_safety.sql',import.meta.url),'utf8');
  assert.match(safety,/gs\.qa_mode = false/);
  assert.match(safety,/gs\.mode = 'daily'/);
  assert.match(safety,/gs\.mission_id = content\.daily_missions/);
  assert.match(safety,/gs\.game_content_version = content\.version/);
});
