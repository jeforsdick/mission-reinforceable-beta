import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewApprovedImport, saveApprovedImport, sameJson } from './approved-draft-import.mjs';
const workspace = { case: { id:'fixture-id', case_code:'CASE-EXAMPLE' }, fidelity_targets: [{target_key:'teaching_01'}], missions:[] };
function fixture() {
  const steps = {};
  for (let d=1;d<=5;d++) for (const state of d===1?['start']:['supported','wobbly','escalated']) {
    steps[`d${d}_${state}`]={text:'Fictional classroom scene',hint:'Consider communication',meta:{fidelityTargetKey:'teaching_01'},choices:{}};
    for (const [k,score] of [['A',10],['B',5],['C',0]]) steps[`d${d}_${state}`].choices[k]={text:'Teacher action',consequence:'Modeled result',wizard:'Wizard reaction',feedback:'Plan explanation',score,meta:{bipComponent:'Teach',mechanism:'prompt',function:'attention',errorType:score===10?'none':'plan_drift'},next:d===5?null:`d${d+1}_supported`,...(d===5?{ending:'STRONG'}:{})};
  }
  return {schemaVersion:1,case_id:'fixture-id',case_code:'CASE-EXAMPLE',missions:[{mission_type:'daily',slot_number:1,mission:{id:'CASE-EXAMPLE_D1',title:'Fictional example',expectedSteps:5,start:'d1_start',steps,endings:Object.fromEntries(['STRONG','MIXED','FRAGILE'].map(k=>[k,{text:'Closure',wizard:'Reaction'}]))}}]};
}
test('preserves every imported JSON field',()=>{const p=fixture();p.missions[0].mission.custom={privateAuthoringNote:'Fictional note'};assert.deepEqual(reviewApprovedImport(p,workspace),p.missions);});
test('rejects cross-case, duplicate slots, stale target, and broken routes',()=>{
  for (const mutate of [p=>p.case_id='other',p=>p.missions.push(p.missions[0]),p=>p.missions[0].mission.steps.d1_start.meta.fidelityTargetKey='missing',p=>p.missions[0].mission.steps.d1_start.choices.A.next='d5_supported']) {const p=fixture();mutate(p);assert.throws(()=>reviewApprovedImport(p,workspace));}
});
test('saves sequentially and verifies exact content and revision',async()=>{
  const rows=reviewApprovedImport(fixture(),workspace);let latest=structuredClone(workspace),reads=0;
  const saved=await saveApprovedImport(rows,workspace,async()=>{reads++;return structuredClone(latest);},async row=>{latest.missions=[{...row,revision_id:'revision-1'}];return 'revision-1';});
  assert.equal(reads,2);assert.equal(saved[0].revision_id,'revision-1');assert.ok(sameJson(latest.missions[0].mission,rows[0].mission));
});
test('never overwrites a different saved draft',async()=>{
  const rows=reviewApprovedImport(fixture(),workspace);const latest={...workspace,missions:[{...rows[0],revision_id:'newer',mission:{title:'New edit'}}]};let writes=0;
  await assert.rejects(saveApprovedImport(rows,workspace,async()=>latest,async()=>{writes++;}),/changed/);assert.equal(writes,0);
});
test('identical existing draft permits resuming without another write',async()=>{
  const rows=reviewApprovedImport(fixture(),workspace);const latest={...workspace,missions:[{...rows[0],revision_id:'existing'}]};
  assert.deepEqual(await saveApprovedImport(rows,latest,async()=>latest,async()=>{throw Error('must not write');}),[]);
});
test('read-back mismatch stops the import',async()=>{
  const rows=reviewApprovedImport(fixture(),workspace);
  await assert.rejects(saveApprovedImport(rows,workspace,async()=>workspace,async()=> 'revision-1'),/could not be verified/);
});
