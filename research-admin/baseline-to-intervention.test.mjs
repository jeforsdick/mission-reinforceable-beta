import assert from 'node:assert/strict';
import fs from 'node:fs';
import { interventionStartReadiness } from './operations-model.mjs';
import { renderOperations } from './operations-ui.mjs';

const baselineRows=[1,2,3,4,5,6].map(session_number=>({
  id:`b${session_number}`,phase:'baseline',session_number,
  summary_revision_id:`r${session_number}`,observation_date:`2026-10-${String(session_number).padStart(2,'0')}`
}));
const checklist=[
  {item_key:'intervention_orientation',status:'complete'}
];
const item={
  current_phase:'baseline',
  study_id:'MR-TEST',
  student_alias:'Student',
  case_code:'CASE-TEST',
  case_active:false,
  participant_active:false,
  protocol:{stagger_position:2,planned_baseline_observations:6},
  checklist,
  measures:[],
  tasks:[],
  study_events:[],
  phase_history:[{phase:'baseline',effective_date:'2026-10-01'}],
  observation_data:{observations:baselineRows,setups:[{case_id:'case'}],coverage:{}}
};
const prepared={
  protected_content:{present:true,version:4},
  resource_map:{status:'Ready',behavior_reviewed:true,privacy_reviewed:true,qa_previewed:true},
  teacher_account_ready:true,
  reminders:{enabled:false}
};

const ready=interventionStartReadiness(item,prepared,{reminderSystemEnabled:true});
assert.equal(ready.ready,true);
assert.equal(ready.baselineCount,6);
assert.equal(ready.plannedMinimum,6);
assert.equal(ready.requiresRecentSeries,true);

assert.equal(interventionStartReadiness({...item,observation_data:{...item.observation_data,observations:baselineRows.slice(0,5)}},prepared,{reminderSystemEnabled:true}).ready,false);
assert.equal(interventionStartReadiness({...item,study_events:[{resolved_at:null,affects_phase_interpretation:true}]},prepared,{reminderSystemEnabled:true}).ready,false);
assert.equal(interventionStartReadiness(item,prepared,{reminderSystemEnabled:false}).ready,false);

const html=renderOperations(item,prepared,value=>String(value),{teacherReminderSystemEnabled:true});
assert.match(html,/Start Intervention/);
assert.match(html,/reviewed baseline level, trend, variability, and interpretability/i);
assert.match(html,/required ≥3-session consecutive observation series immediately before intervention/i);
assert.match(html,/records Intervention, activates Mission: Reinforceable access, and enables daily reminders in one transaction/i);
const phasePanel=html.slice(html.indexOf('id="operations-phase-decision"'),html.indexOf('id="operations-enrollment"'));
assert.doesNotMatch(phasePanel,/option value="intervention"/,'generic phase menu must not offer Intervention from Baseline');

const migration=fs.readFileSync(new URL('../supabase/migrations/20261006050000_baseline_to_intervention_launch.sql',import.meta.url),'utf8');
for(const required of [
  'baseline minimum not met',
  'baseline visual review confirmation is required',
  'three-session pre-intervention series confirmation is required',
  'resolve phase-interpretation study events before starting intervention',
  'Use Start Intervention so phase, game access, and daily reminders begin together.',
  "'game_access_enabled'",
  "'reminders_enabled'"
]) assert.ok(migration.includes(required),required);
assert.match(migration,/target_effective_date is distinct from denver_today/);
const startAcl=migration.slice(
  migration.indexOf('revoke all on function public.research_admin_start_intervention'),
  migration.indexOf('create or replace function public.research_admin_record_phase')
);
assert.match(startAcl,/grant execute on function public\.research_admin_start_intervention[\s\S]*to service_role/);
assert.doesNotMatch(startAcl,/to authenticated/);

const api=fs.readFileSync(new URL('../api/research-admin-start-intervention.js',import.meta.url),'utf8');
assert.match(api,/TEACHER_REMINDER_SYSTEM_ENABLED/);
assert.match(api,/research_admin_start_intervention/);
assert.match(api,/target_actor_id:actor\.id/);

const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const startHandler=admin.slice(
  admin.indexOf("$('#start-intervention-form')"),
  admin.indexOf("$('#phase-form')")
);
assert.match(startHandler,/research-admin-start-intervention/);
assert.doesNotMatch(startHandler,/research_admin_record_phase/);

console.log('Baseline -> Intervention launch safeguards passed.');
