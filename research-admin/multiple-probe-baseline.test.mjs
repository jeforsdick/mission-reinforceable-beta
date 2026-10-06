import assert from 'node:assert/strict';
import fs from 'node:fs';
import { observationSummary, nextAction, gamePreparationReadiness, interventionStartReadiness } from './operations-model.mjs';
import { renderPhaseObservationWorkspace } from './observations-ui.mjs';

const e=value=>String(value??'');
const row=(n,role,date)=>({
  id:`o${n}`,phase:'baseline',session_number:n,baseline_measurement_role:role,
  observation_date:date||`2026-10-${String(n).padStart(2,'0')}`,summary_revision_id:`r${n}`
});
const prepared={
  protected_content:{present:true,version:2},
  resource_map:{status:'Ready',behavior_reviewed:true,privacy_reviewed:true,qa_previewed:true},
  teacher_account_ready:true,
  reminders:{enabled:false}
};

const initial=[row(1,'initial_series'),row(2,'initial_series'),row(3,'initial_series')];
const probes=[row(4,'intermittent_probe','2026-10-08'),row(5,'intermittent_probe','2026-10-15')];
const laterBase={
  current_phase:'baseline',study_id:'MR-002',student_alias:'Student',case_code:'CASE-002',
  case_active:false,participant_active:false,
  protocol:{stagger_position:2,planned_baseline_observations:8},
  checklist:[
    {item_key:'teacher_consent',status:'complete'},
    {item_key:'parent_permission',status:'complete'},
    {item_key:'student_assent',status:'complete'},
    {item_key:'bsp_technical_review',status:'complete'},
    {item_key:'safety_screen',status:'complete'},
    {item_key:'target_routine_finalized',status:'complete'},
    {item_key:'target_behavior_definition',status:'complete'},
    {item_key:'fidelity_checklist_finalized',status:'complete'},
    {item_key:'fidelity_checklist_second_review',status:'complete'},
    {item_key:'baseline_orientation',status:'complete'}
  ],
  measures:[{measure_key:'tses_pre',status:'complete'}],tasks:[],study_events:[],
  prepared_content:{protected_content_present:true,resource_map_ready:true},
  observation_data:{observations:[...initial,...probes],setups:[{case_id:'case'}],observers:[],coverage:{}}
};

let stats=observationSummary(laterBase);
assert.equal(stats.baseline,5);
assert.deepEqual(stats.baselineRoles,{daily:0,initial:3,intermittent:2,preintervention:0});
assert.equal(stats.finalThreePreintervention,false);
assert.match(nextAction(laterBase),/Begin the final 3-session pre-intervention series/);

const baselineHtml=renderPhaseObservationWorkspace(laterBase,'baseline',e);
assert.match(baselineHtml,/3 initial observations → intermittent probes → 3 consecutive pre-intervention observations/);
assert.match(baselineHtml,/Begin Final 3-Session Series/);
assert.match(baselineHtml,/Intermittent probes/);
assert.match(baselineHtml,/2\/2 planned minimum/);

const finalSeries=[
  row(6,'preintervention_series','2026-10-20'),
  row(7,'preintervention_series','2026-10-21'),
  row(8,'preintervention_series','2026-10-22')
];
const readyCase={
  ...laterBase,
  observation_data:{
    ...laterBase.observation_data,
    observations:[...initial,...probes,...finalSeries],
    probe_state:{preintervention_series_started_on:'2026-10-20'}
  }
};
stats=observationSummary(readyCase);
assert.equal(stats.baseline,8);
assert.equal(stats.baselineRoles.preintervention,3);
assert.equal(stats.finalThreePreintervention,true);
assert.equal(interventionStartReadiness(readyCase,prepared,{reminderSystemEnabled:true}).ready,true);

const brokenFinal={
  ...readyCase,
  observation_data:{
    ...readyCase.observation_data,
    observations:[...initial,...probes,row(6,'preintervention_series','2026-10-20'),row(7,'intermittent_probe','2026-10-21'),row(8,'preintervention_series','2026-10-22')]
  }
};
assert.equal(interventionStartReadiness(brokenFinal,prepared,{reminderSystemEnabled:true}).ready,false);

const firstTier={
  ...laterBase,
  protocol:{stagger_position:1,planned_baseline_observations:6},
  observation_data:{...laterBase.observation_data,observations:[1,2,3,4,5,6].map(n=>row(n,'daily_baseline'))}
};
assert.equal(interventionStartReadiness(firstTier,prepared,{reminderSystemEnabled:true}).ready,true);
assert.match(nextAction(firstTier),/Daily baseline minimum is met/);

assert.equal(gamePreparationReadiness({...readyCase,checklist:[]},prepared).ready,true,'orientation is completed at launch, not as Baseline prep');

const migration=fs.readFileSync(new URL('../supabase/migrations/20261006060000_multiple_probe_baseline_structure.sql',import.meta.url),'utf8');
for(const expected of [
  'research_baseline_probe_events',
  'research_resolve_baseline_measurement_role',
  "'daily_baseline','initial_series','intermittent_probe','preintervention_series'",
  'research_admin_start_preintervention_probe_series',
  'baseline_count<greatest(planned_minimum-3,3)',
  'research_admin_start_intervention_v2',
  'initial_count<3',
  'preintervention_count<3',
  'final_three_count<>3',
  'p.is_test=false'
]) assert.ok(migration.includes(expected),expected);

const schedule=fs.readFileSync(new URL('./schedule-dashboard.js',import.meta.url),'utf8');
assert.match(schedule,/Position 1 daily baseline; later tiers 3 → intermittent probes → 3/);
assert.match(schedule,/label:"Daily baseline", target:5/);
assert.match(schedule,/label:"Intermittent probe", target:1/);
assert.match(schedule,/label:"Initial 3-session series"/);
assert.match(schedule,/label:"Final 3-session series"/);

console.log('Multiple-probe baseline structure checks passed.');
