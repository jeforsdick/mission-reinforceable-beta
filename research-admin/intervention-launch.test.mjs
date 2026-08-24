import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderOperations} from './operations-ui.mjs';

const migration=await readFile(new URL('../supabase/migrations/20260824010000_phase_gated_intervention_launch.sql',import.meta.url),'utf8');
const admin=await readFile(new URL('./admin.js',import.meta.url),'utf8');
const operationsUi=await readFile(new URL('./operations-ui.mjs',import.meta.url),'utf8');
const complete=['resource_behavior_review','resource_privacy_review','resource_qa_preview'];
const fixture=phase=>({id:'case',case_code:'CASE-998',study_id:'MR-998',student_alias:'A',current_phase:phase,case_active:false,participant_active:false,checklist:[{item_key:'intervention_orientation',status:'complete'}],measures:[],tasks:[],study_events:[],phase_history:[],observation_data:{observations:[],coverage:{}},prepared_content:{}});
const prepared={protected_content:{present:true,version:1},resource_map:{status:'Ready',behavior_reviewed:true,privacy_reviewed:true,qa_previewed:true},teacher_account_ready:true,reminders:{enabled:false}};

test('RPC hard-gates activation and validates the current protected version',()=>{
  assert.match(migration,/security definer set search_path=''/gi);assert.match(migration,/Game access can only be enabled during Intervention\./);
  for(const review of complete)assert.match(migration,new RegExp(`protected_content_version=current_version and s.review_type='${review}'`));
  assert.match(migration,/intervention_orientation/);assert.match(migration,/pr\.active and pr\.role='teacher'/);
  assert.match(migration,/update public\.cases set active=target_enabled[\s\S]*update public\.participants set active=target_enabled/);
  assert.doesNotMatch(migration,/case_game_content set|teacher_reminder_events|game_sessions|game_responses|send_email|resend|net\.http/);
});

test('revocation atomically turns off access and existing reminder eligibility',()=>{
  assert.match(migration,/update public\.teacher_reminder_settings set enabled=false,deactivated_at=changed[\s\S]*where participant_id=target_participant_id and enabled/);
  assert.match(migration,/research_intervention_launch_events/);assert.match(migration,/game_access_disabled/);assert.match(migration,/reminders_disabled/);
});

test('reminders reuse settings, fail closed, and do not create delivery events',()=>{
  assert.match(migration,/teacher_communication_system_ready/);assert.match(migration,/Production email delivery has not been enabled\./);
  assert.match(migration,/insert into public\.teacher_reminder_settings/);assert.doesNotMatch(migration,/insert into public\.teacher_reminder_events/);
  assert.match(migration,/Game access must be active before reminders can be enabled\./);
});

test('baseline and Intervention launch controls communicate separate actions',()=>{
  const baseline=renderOperations(fixture('baseline'),prepared,String);
  assert.match(baseline,/Published &amp; reviewed — waiting for intervention launch/);assert.match(baseline,/id="activate-game-access"[^>]*disabled/);assert.match(baseline,/Available after Intervention begins\./);
  const intervention=renderOperations(fixture('intervention'),prepared,String);
  assert.match(intervention,/Ready to launch/);assert.match(intervention,/id="activate-game-access"/);assert.doesNotMatch(intervention,/id="activate-game-access"[^>]*disabled/);
  assert.match(intervention,/Production email delivery has not been enabled\./);assert.match(intervention,/Pending production email setup/);assert.doesNotMatch(intervention,/send-game-login/);
  assert.match(intervention,/published version v1/);assert.match(intervention,/Unpublished draft changes are not included/);
  assert.match(admin,/It will not send email or enable reminders/);
});

test('active access outside Intervention is flagged without a render mutation',()=>{
  const item={...fixture('maintenance'),case_active:true,participant_active:true};
  assert.match(renderOperations(item,prepared,String),/Needs attention: game access is on outside Intervention\./);
  assert.doesNotMatch(operationsUi,/\.rpc\(|update public\./i);
});

test('reserved demo fixture retains its legacy workflow',()=>{
  const demo={...fixture('prebaseline'),case_code:'CASE-DEMO-2',study_id:'MR-DEMO-2'};
  const html=renderOperations(demo,prepared,String);
  assert.match(html,/Reserved demo access continues to use the existing demo workflow/);assert.doesNotMatch(html,/id="activate-game-access"/);
});
