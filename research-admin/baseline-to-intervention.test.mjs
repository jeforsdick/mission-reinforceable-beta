import assert from 'node:assert/strict';
import fs from 'node:fs';
import { interventionStartReadiness } from './operations-model.mjs';
import { renderOperations } from './operations-ui.mjs';

const baselineRows=[
  ...[1,2,3].map(session_number=>({
    id:`b${session_number}`,phase:'baseline',session_number,baseline_measurement_role:'initial_series',
    summary_revision_id:`r${session_number}`,observation_date:`2026-10-0${session_number}`
  })),
  ...[4,5].map(session_number=>({
    id:`b${session_number}`,phase:'baseline',session_number,baseline_measurement_role:'intermittent_probe',
    summary_revision_id:`r${session_number}`,observation_date:`2026-10-${String(session_number+2).padStart(2,'0')}`
  })),
  ...[6,7,8].map(session_number=>({
    id:`b${session_number}`,phase:'baseline',session_number,baseline_measurement_role:'preintervention_series',
    summary_revision_id:`r${session_number}`,observation_date:`2026-10-${String(session_number+5).padStart(2,'0')}`
  }))
];
const checklist=[];
const item={
  current_phase:'baseline',
  study_id:'MR-TEST',
  student_alias:'Student',
  case_code:'CASE-TEST',
  case_active:false,
  participant_active:false,
  protocol:{stagger_position:2,planned_baseline_observations:8},
  checklist,
  measures:[],
  tasks:[],
  study_events:[],
  phase_history:[{phase:'baseline',effective_date:'2026-10-01'}],
  observation_data:{
    observations:baselineRows,
    setups:[{case_id:'case'}],
    coverage:{},
    probe_state:{preintervention_series_started_on:'2026-10-11'}
  }
};
const prepared={
  protected_content:{present:true,version:4},
  resource_map:{status:'Ready',behavior_reviewed:true,privacy_reviewed:true,qa_previewed:true},
  teacher_account_ready:true,
  reminders:{enabled:false}
};

const ready=interventionStartReadiness(item,prepared,{reminderSystemEnabled:true});
assert.equal(ready.ready,true);
assert.equal(ready.baselineCount,8);
assert.equal(ready.plannedMinimum,8);
assert.equal(ready.requiresRecentSeries,true);

assert.equal(interventionStartReadiness({...item,observation_data:{...item.observation_data,observations:baselineRows.slice(0,7)}},prepared,{reminderSystemEnabled:true}).ready,false);
assert.equal(interventionStartReadiness({...item,study_events:[{resolved_at:null,affects_phase_interpretation:true}]},prepared,{reminderSystemEnabled:true}).ready,false);
assert.equal(interventionStartReadiness(item,prepared,{reminderSystemEnabled:false}).ready,false);

const html=renderOperations(item,prepared,value=>String(value),{teacherReminderSystemEnabled:true});
assert.match(html,/Start Intervention/);
assert.match(html,/reviewed baseline level, trend, variability, and interpretability/i);
assert.match(html,/final 3-session pre-intervention series/i);
assert.match(html,/records the launch orientation and Intervention phase, activates Mission: Reinforceable access, and enables daily reminders in one transaction/i);
const phasePanel=html.slice(html.indexOf('id="operations-phase-decision"'),html.indexOf('id="operations-enrollment"'));
assert.doesNotMatch(phasePanel,/option value="intervention"/,'generic phase menu must not offer Intervention from Baseline');

const migration=fs.readFileSync(new URL('../supabase/migrations/20261006060000_multiple_probe_baseline_structure.sql',import.meta.url),'utf8');
for(const required of [
  "'initial_series'",
  "'intermittent_probe'",
  "'preintervention_series'",
  'complete the initial 3-session baseline series',
  'multiple-probe baseline requires at least 3 finalized observations in the pre-intervention series',
  'the final 3 finalized baseline observations must be part of the pre-intervention probe series',
  'planned stagger order requires earlier positions to enter intervention first',
  'Mission: Reinforceable orientation must be completed as part of intervention launch',
  "'game_access_enabled'",
  "'reminders_enabled'"
]) assert.ok(migration.includes(required),required);
assert.match(migration,/research_admin_start_intervention_v2/);
assert.match(migration,/target_effective_date is distinct from denver_today/);
const startAcl=migration.slice(
  migration.indexOf('revoke all on function public.research_admin_start_intervention_v2'),
  migration.indexOf('create or replace function public.research_admin_start_intervention(')
);
assert.match(startAcl,/grant execute on function public\.research_admin_start_intervention_v2[\s\S]*to service_role/);
assert.doesNotMatch(startAcl,/to authenticated/);

const api=fs.readFileSync(new URL('../api/research-admin-communication-readiness.js',import.meta.url),'utf8');
assert.match(api,/body\.action === 'start_intervention'/);
assert.match(api,/TEACHER_REMINDER_SYSTEM_ENABLED/);
assert.match(api,/research_admin_start_intervention_v2/);
assert.match(api,/target_orientation_completed/);
assert.match(api,/target_actor_id: actor\.id/);

const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const startHandler=admin.slice(
  admin.indexOf("$('#start-intervention-form')"),
  admin.indexOf("$('#phase-form')")
);
assert.match(startHandler,/research-admin-communication-readiness/);
assert.match(startHandler,/action:'start_intervention'/);
assert.doesNotMatch(startHandler,/research_admin_record_phase/);

console.log('Baseline -> Intervention launch safeguards passed.');
