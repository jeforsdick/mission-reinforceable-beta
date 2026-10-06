import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHECKLIST, baselineReadiness, observerBaselineReady } from './operations-model.mjs';

const completeChecklist=CHECKLIST.map(([item_key])=>({item_key,status:'complete'}));
const clearedObserver={active:true,observer_type:'trained_observer',status:'qualified'};
const ready={
  current_phase:'prebaseline',
  protocol:{stagger_position:1,planned_baseline_observations:6},
  checklist:completeChecklist,
  measures:[{measure_key:'tses_pre',status:'complete'}],
  active_fidelity_target_count:1,
  observation_data:{setups:[{case_id:'case-1'}],observers:[clearedObserver]}
};

assert.equal(observerBaselineReady(ready),true);
assert.equal(baselineReadiness(ready).ready,true);

const researcherOnly={
  ...ready,
  observation_data:{
    ...ready.observation_data,
    observers:[{active:true,observer_type:'primary_researcher',status:'qualified'}]
  }
};
assert.equal(observerBaselineReady(researcherOnly),false,'primary researcher does not satisfy baseline observer readiness');
assert.equal(baselineReadiness(researcherOnly).ready,false,'Jess alone does not make baseline ready');

const supportedCalibrationOnly={
  ...ready,
  observation_data:{
    ...ready.observation_data,
    observers:[
      {active:true,observer_type:'trained_observer',status:'training_needed',online_training_ready:true},
      {active:true,observer_type:'primary_researcher',status:'qualified'}
    ]
  }
};
assert.equal(observerBaselineReady(supportedCalibrationOnly),false,'online-ready + primary researcher does not satisfy baseline launch');
assert.equal(baselineReadiness(supportedCalibrationOnly).ready,false);

assert.equal(baselineReadiness({...ready,observation_data:{...ready.observation_data,setups:[]}}).ready,false,'observation setup is required');
assert.equal(baselineReadiness({...ready,active_fidelity_target_count:0}).ready,false,'active fidelity checklist is required');

const migration=fs.readFileSync(new URL('../supabase/migrations/20261006043000_baseline_launch_readiness.sql',import.meta.url),'utf8');
for(const blocker of ['observation_setup','active_fidelity_checklist','cleared_trained_observer']){
  assert.match(migration,new RegExp(blocker));
}
assert.match(migration,/observer_type='trained_observer'[\s\S]*clearance_status='cleared'/);
assert.match(migration,/active_fidelity_target_count/);
assert.match(migration,/revoke all on function public\.research_admin_record_phase\(uuid,text,date,text\) from public, anon/);
assert.match(migration,/grant execute on function public\.research_admin_record_phase\(uuid,text,date,text\) to authenticated/);

const ui=fs.readFileSync(new URL('./operations-ui.mjs',import.meta.url),'utf8');
assert.match(ui,/At least one trained observer formally cleared for baseline/);
assert.match(ui,/Online qualification or supported-calibration readiness alone does not open Baseline/);
assert.doesNotMatch(ui,/primary_researcher\|\|x\.status==='qualified'/);

console.log('Setup -> Baseline launch-readiness regression checks passed.');
