import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareExistingDraftRevision, saveReviewedDraftRevision } from './existing-draft-revision.mjs';
import { sameJson } from './approved-draft-import.mjs';
const states = ['supported', 'wobbly', 'escalated'];
function fixture() {
  const steps = {}, patches = {};
  for (let decision=1;decision<=5;decision++) {
    for (const state of decision === 1 ? ['start'] : states) {
      const id = `d${decision}_${state}`;
      steps[id] = { text:'Original classroom moment', hint:'What is the approved plan?',
        meta:{fidelityTargetKey:'reinforcement_01'}, choices:{} };
      patches[id] = { text:'Concise classroom moment about adult availability.',
        hint_override:null, meta_override:null, choices:{} };
      for(const [key,score] of [['A',10],['B',5],['C',0]]) {
        const target = decision===5?null:`d${decision+1}_${score===10?'supported':score===5?'wobbly':'escalated'}`;
        const ending = decision===5 ? score===10?'STRONG':score===5?'MIXED':'FRAGILE' : undefined;
        steps[id].choices[key]={text:'Original teacher action', score,
          next:target, ...(ending?{ending}:{}), consequence:'Original student outcome',
          feedback:'Why it is aligned or not', wizard:'Wizard reacts',
          meta:{bipComponent:'Reinforce', mechanism:'adult_attention', function:'attention',errorType:score===10?'none':'partial_implementation'} };
        patches[id].choices[key]={score, next_or_ending:target || ending,
          consequence:'A concise, observable new consequence.',
          choice_text_override:null};
      }
    }
  }
  patches.d2_wobbly.meta_override={fidelityTargetKey:'reinforcement_02'};
  patches.d2_wobbly.choices.A.choice_text_override='Recognize the request and respond.';
  patches.d3_wobbly.hint_override='If the request is already made, answer it.';
  const mission={id:'CASE-EXAMPLE_CRISIS_01',title:'A Deskful of Trouble',
    start:'d1_start', expectedSteps:5, steps,
    endings:{STRONG:{text:'improved',wizard:'success'},MIXED:{text:'mixed',wizard:'thoughtful'},FRAGILE:{text:'fragile',wizard:'supportive'}},
    authoringMeta:{qualityReview:{behavioral:true,gameDesign:true},versionNote:'Fictional case'}};
  const workspace={
    case:{id:'fictional-case-uuid',case_code:'CASE-EXAMPLE'},
    fidelity_targets:[{target_key:'reinforcement_01'},{target_key:'reinforcement_02'}],
    missions:[{mission_type:'crisis',slot_number:1,revision_id:'old-revision',mission}]
  };
  const patch={kind:'researcher_review_patch_NOT_A_SAVED_DRAFT',
    status:'draft_for_researcher_review_NOT_SAVED',case_code:'CASE-EXAMPLE',
    mission_type:'crisis',slot_number:1,mission_id:mission.id,title:mission.title,
    scenes:patches,review_flags:['No new safety procedures']};
  return {patch,workspace,mission};
}
test('creates complete new draft while leaving original content, 39 scores and routes untouched',()=>{
 const {patch,workspace,mission}=fixture();
 const plan=prepareExistingDraftRevision(patch,workspace);
 assert.equal(plan.mission.steps.d1_start.text,'Concise classroom moment about adult availability.');
 assert.equal(plan.mission.steps.d2_wobbly.meta.fidelityTargetKey,'reinforcement_02');
 assert.equal(plan.mission.steps.d2_wobbly.choices.A.text,'Recognize the request and respond.');
 assert.equal(plan.mission.steps.d3_wobbly.hint,'If the request is already made, answer it.');
 assert.deepEqual(plan.mission.endings,mission.endings);
 assert.equal(plan.mission.authoringMeta.qualityReview.behavioral,false);
 assert.equal(plan.mission.authoringMeta.qualityReview.gameDesign,false);
 assert.equal(plan.mission.authoringMeta.versionNote,'Fictional case');
 let compared=0;
 for(const id of Object.keys(mission.steps))for(const k of ['A','B','C']) {
  const a=mission.steps[id].choices[k], b=plan.mission.steps[id].choices[k];
  assert.equal(a.next,b.next);
  assert.equal(a.ending,b.ending);
  assert.equal(a.score,b.score);
  assert.equal(a.feedback,b.feedback);
  assert.equal(a.wizard,b.wizard);
  assert.ok(sameJson(a.meta,b.meta));
  compared++;
 }
 assert.equal(compared,39);
 assert.equal(workspace.missions[0].mission.steps.d1_start.text,'Original classroom moment',
   'original save remains unchanged until researcher approves and uses authenticated RPC');
});
test('workspace already filters to active targets even when active flag is omitted',()=>{
 const {patch,workspace}=fixture();
 // Matches the actual research_admin_game_authoring_workspace RPC payload.
 assert.ok(workspace.fidelity_targets.every(t=>!Object.hasOwn(t,'active')));
 assert.equal(prepareExistingDraftRevision(patch,workspace).mission.steps.d2_wobbly.meta.fidelityTargetKey,'reinforcement_02');
 const {patch:other,workspace:untrusted}=fixture();
 untrusted.fidelity_targets.push({target_key:'retired_target',active:false});
 other.scenes.d2_wobbly.meta_override={fidelityTargetKey:'retired_target'};
 assert.throws(()=>prepareExistingDraftRevision(other,untrusted),/not active/);
});

test('cannot change wrong case, mission, target, routing, scoring or scene count',()=>{
 const mutations=[
  p=>{p.case_code='CASE-OTHER';},
  p=>{p.mission_id='CASE-EXAMPLE_CRISIS_02';},
  p=>{p.scenes.d1_start.choices.A.next_or_ending='d2_escalated';},
  p=>{p.scenes.d1_start.choices.A.score=0;},
  p=>{p.scenes.d2_supported.meta_override={fidelityTargetKey:'unknown'};},
  p=>{p.scenes.d3_supported.meta_override={fidelityTargetKey:'reinforcement_01',arbitrary:'oops'};},
  p=>{delete p.scenes.d5_wobbly;},
  p=>{p.mission_type='daily';},
  p=>{p.status='published';},
  p=>{p.scenes.d1_start.text='';}
 ];
 for(const mutate of mutations){const {patch,workspace}=fixture();mutate(patch);assert.throws(()=>prepareExistingDraftRevision(patch,workspace));}
});
test('readback check ensures new revision persisted exactly and cannot overwrite racing edit',async()=>{
 const {patch,workspace}=fixture();
 const plan=prepareExistingDraftRevision(patch,workspace);
 let saves=0, current=structuredClone(workspace), reads=0;
 const read=async()=>{reads++;return structuredClone(current);};
 const saved=await saveReviewedDraftRevision(plan,read,async row=>{
   saves++; current.missions[0]={mission_type:row.mission_type,slot_number:row.slot_number,
     revision_id:'new-revision',mission:structuredClone(row.mission)}; return 'new-revision';
 });
 assert.equal(saves,1);
 assert.equal(reads,2);
 assert.equal(saved.revision_id,'new-revision');
 assert.equal(current.missions[0].mission.steps.d1_start.text,plan.mission.steps.d1_start.text);
 const old=prepareExistingDraftRevision(patch,workspace);
 let writes=0;
 await assert.rejects(saveReviewedDraftRevision(old,read,async()=>{writes++;}),/changed since patch review/);
 assert.equal(writes,0);
});
test('mismatched save readback stops, without suggesting publication succeeded',async()=>{
 const {patch,workspace}=fixture();const plan=prepareExistingDraftRevision(patch,workspace);
 await assert.rejects(saveReviewedDraftRevision(plan,async()=>workspace,async()=> 'not-actually-saved'),
    /exact saved read-back failed/);
});
