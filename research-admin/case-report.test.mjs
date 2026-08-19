import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderOperations } from './operations-ui.mjs';
import { friendlyBaselineError, renderCaseReport } from './case-report.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, '');
const checklist = [
  'teacher_consent','parent_permission','student_assent','bsp_technical_review','safety_screen',
  'target_routine_finalized','target_behavior_definition','fidelity_checklist_finalized',
  'fidelity_checklist_second_review','baseline_orientation','intervention_orientation'
].map(item_key => ({ item_key, status: 'complete', status_date: '2026-08-01' }));
const base = { id:'case',study_id:'MR-101',case_code:'CASE-101',student_alias:'River',current_phase:'prebaseline',protocol:{stagger_position:1,planned_baseline_observations:6},checklist,checklist_history:[],measures:[],phase_history:[],tasks:[],study_events:[],coaching_contacts:[],observation_data:{coverage:{completed:0,ioa:0,percent:0},observations:[],setups:[],observers:[]},prepared_content:{},case_active:false,participant_active:false };
const prepared = { protected_content:{present:true,raw_game_content:'SECRET'},resource_map:{status:'Ready'},reminders:{enabled:false} };

test('baseline assignment freezes and TSES readiness links to its existing measure', () => {
  const before = renderOperations(base, prepared, escape);
  assert.match(before, /id="protocol-form"/);
  assert.match(before, /Save Baseline Assignment/);
  assert.match(before, /TSES — Pre-Baseline/);
  assert.match(before, /Needs completion/);
  assert.match(before, /id="go-to-tses"/);

  const complete = {...base,measures:[{measure_key:'tses_pre',status:'complete',completed_on:'2026-08-02'}]};
  const afterSave = renderOperations(complete, prepared, escape);
  assert.match(afterSave, /Ready to begin baseline\./);
  assert.match(afterSave, /TSES — Pre-Baseline[\s\S]*Complete/);
  assert.doesNotMatch(afterSave, /id="go-to-tses"/);

  const baseline = renderOperations({...complete,current_phase:'baseline'}, prepared, escape);
  assert.doesNotMatch(baseline, /id="protocol-form"|Save Baseline Assignment/);
  assert.match(baseline, /Baseline assignment[\s\S]*Position 1 · 6 observations/);
  assert.match(baseline, /locked once baseline begins/);
});

test('known baseline gate keys are human readable', () => {
  assert.equal(friendlyBaselineError('baseline prerequisites missing: tses_pre'), 'Baseline is not ready yet: TSES — Pre-Baseline');
  const message = friendlyBaselineError('baseline prerequisites missing: teacher_consent, tses_pre');
  assert.match(message, /• Teacher consent/);
  assert.match(message, /• TSES — Pre-Baseline/);
  assert.doesNotMatch(message, /tses_pre|teacher_consent/);
});

test('case report is a deidentified, non-interactive research summary', () => {
  const item={...base,current_phase:'baseline',measures:[{measure_key:'tses_pre',status:'complete',completed_on:'2026-08-02',external_reference:'TSES-44',questionnaire_responses:'DO NOT PRINT'}],phase_history:[{phase:'baseline',effective_date:'2026-08-03',decision_note:'Readiness confirmed'}],study_events:[{event_date:'2026-08-04',event_type:'technical_issue',affects_observation:true,affects_mr_exposure:false,affects_phase_interpretation:true,brief_note:'Brief operational note',action_taken:'Resolved locally',resolved_at:'2026-08-05'}],observation_data:{coverage:{completed:1,ioa:1,percent:100},setups:[],observers:[],observations:[{primary_record_id:'p',secondary_record_id:'s',observation_date:'2026-08-04',phase:'baseline',session_number:1,primary_observer_code:'OBS-01',secondary_observer_code:'OBS-02',teacher_fidelity_percent:90,student_target_behavior_percent:10,student_intervals:Array(120).fill('SECRET CELL'),ioa:{teacher_fidelity_ioa_percent:95,student_behavior_ioa_percent:93,overall_ioa_attention:false}}]}};
  const html=renderCaseReport(item,prepared,{summary:{daily_yes:2,daily_applicable:2,overall_yes:2,overall_applicable:2},history:[{study_date:'2026-08-04',review_scope:'daily',fidelity_percent:100,system_evidence:{secret:true}}]},escape,new Date('2026-08-19T00:00:00Z'));
  for(const heading of ['Research Case Report','Case Overview','Baseline Readiness','Phase History','Study Measures','Classroom Observations','IOA Summary','Coaching-as-Usual','Study Events','Game Readiness','MR Procedural Fidelity','Timeline']) assert.match(html,new RegExp(heading));
  assert.match(html,/MR-101/); assert.match(html,/CASE-101/); assert.match(html,/River/); assert.match(html,/Choose Save as PDF/);
  assert.match(html,/<th>Teacher fidelity %<\/th><th>Student target behavior %<\/th>[\s\S]*<td>90<\/td><td>10<\/td><td>95<\/td>/);
  assert.doesNotMatch(html,/<form|<button|<select|<input|<textarea|DO NOT PRINT|SECRET CELL|raw_game_content|system_evidence|120 interval|Mission Bank Comparability|Mission review|comparability/i);
});

test('client retains Intake Print / Save PDF', () => {
  const js=fs.readFileSync(new URL('admin.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('index.html',import.meta.url),'utf8');
  assert.match(js,/Download Case PDF/); assert.match(js,/renderCaseReport/);
  assert.match(html,/Print \/ Save PDF/); assert.match(js,/print-intake'[\s\S]*window\.print/);
});
