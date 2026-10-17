import test from 'node:test';
import assert from 'node:assert/strict';
import { blankMission } from './game-creation-ui.mjs';
import { prepareFullMissionDraftRevision, reviewSummary } from './full-mission-revision.mjs';
import { saveReviewedDraftRevision } from './existing-draft-revision.mjs';

function fixture() {
  const original = blankMission('CASE-EXAMPLE','daily',2);
  original.id = 'CASE-EXAMPLE_DAILY_02';
  original.title = 'Hands Up!';
  original.routine = 'Math';
  original.focus = 'Teach attention requesting';
  original.authoringMeta.sourceStatus = 'Provisional intake-only QA';
  original.authoringMeta.qualityReview = { behavioral: true, gameDesign: true };
  for (const scene of Object.values(original.steps)) {
    scene.text = 'A student asks for help during math while adults are helping other classmates in the classroom.';
    scene.hint = 'Follow the current support plan.';
    scene.meta = { fidelityTargetKey: 'teaching_01' };
    for (const [key, choice] of Object.entries(scene.choices)) {
      choice.text = 'Give a realistic teacher response for score ' + choice.score + ' when the student needs adult support.';
      choice.consequence = 'The student responds and some classroom work continues.';
      choice.feedback = 'The plan supports helpful communication and appropriate teacher responses.';
      choice.wizard = 'The Wizard acknowledges this decision.';
      choice.meta = { bipComponent:'Teach', mechanism:'request-help', function:'attention',
        errorType: key==='A'?'none':'timing_or_delay' };
    }
  }
  for (const ending of Object.values(original.endings)) {
    ending.text='The classroom moves forward with some support.';
    ending.summary='A brief summary for the teacher.';
    ending.wizard='A short Wizard line.';
  }
  const workspace = { case: { id:'fixture-case-uuid', case_code:'CASE-EXAMPLE' },
    fidelity_targets: [{ target_key:'teaching_01',active:true }],
    missions: [{mission_type:'daily',slot_number:2,revision_id:'saved-14-oct',mission:original}] };
  const revised = structuredClone(original);
  revised.steps.d1_start.text = 'A realistic second-grade classroom scene with a busy teacher.';
  revised.steps.d1_start.choices.A.consequence = 'The teacher responds and the student starts work.';
  revised.steps.d1_start.choices.A.wizard = 'Lovely choice!';
  revised.steps.d1_start.choices.A.feedback = 'The prompt was timely and the request effective.';
  revised.endings.STRONG.summary = 'The student is beginning to make progress.';
  revised.authoringMeta.qualityReview = { behavioral:true, gameDesign:true };
  return { workspace, revised, original };
}

test('full existing-mission JSON can be reviewed safely without saving',()=>{
 const {workspace,revised,original}=fixture();
 const prepared=prepareFullMissionDraftRevision(revised,workspace);
 assert.equal(prepared.case_code,'CASE-EXAMPLE');
 assert.equal(prepared.mission_type,'daily');
 assert.equal(prepared.slot_number,2);
 assert.equal(prepared.expected_revision_id,'saved-14-oct');
 assert.equal(prepared.graph.paths,243);
 assert.equal(prepared.graph.scenes,13);
 assert.equal(prepared.graph.endings.length,3);
 assert.equal(prepared.mission.steps.d1_start.choices.A.wizard,'Lovely choice!');
 assert.equal(prepared.mission.endings.STRONG.summary,'The student is beginning to make progress.');
 assert.equal(prepared.mission.authoringMeta.qualityReview.behavioral,false);
 assert.equal(prepared.mission.authoringMeta.qualityReview.gameDesign,false);
 assert.ok(prepared.changes.includes('steps.d1_start.choices.A.wizard'));
 assert.equal(workspace.missions[0].mission.steps.d1_start.choices.A.wizard,original.steps.d1_start.choices.A.wizard,
  'no user data changes until separately authorized save call');
 assert.match(reviewSummary(prepared),/NO SAVE HAS OCCURRED/);
 assert.match(reviewSummary(prepared),/39 choices, 243 complete paths/);
});
test('correct complete wrapper matches case and slot',()=>{
 const {workspace,revised}=fixture();
 const payload={case_code:'CASE-EXAMPLE',case_id:'fixture-case-uuid',mission_type:'daily',slot_number:2,
  expected_revision_id:'saved-14-oct',mission:revised};
 assert.equal(prepareFullMissionDraftRevision(payload,workspace).mission_type,'daily');
});
test('reject unsupported full JSON, a patch object, wrong case, mission, metadata, missing content and wrong score',()=>{
 const mutations=[
  ({p})=>{p={kind:'researcher_review_patch_NOT_A_SAVED_DRAFT'};return p;},
  ({p})=>{p.id='CASE-OTHER_DAILY_02';return p;},
  ({p})=>{p.authoringMeta.sourceStatus='LIVE verified by AI';return p;},
  ({p})=>{delete p.steps.d3_wobbly.choices.A.wizard;return p;},
  ({p})=>{p.steps.d2_wobbly.choices.A.score=0;return p;},
  ({p})=>{p.steps.d2_wobbly.meta.fidelityTargetKey='inactive_01';return p;},
  ({p})=>{delete p.endings.STRONG.summary;return p;},
  ({p})=>{p.steps.d3_wobbly.choices.A.next='d3_supported';return p;}
 ];
 for(const change of mutations) {
  const {workspace,revised}=fixture();
  const payload=change({p:revised});
  assert.throws(()=>prepareFullMissionDraftRevision(payload,workspace));
 }
 const {workspace,revised}=fixture();
 assert.throws(()=>prepareFullMissionDraftRevision({case_code:'WRONG',mission:revised},workspace),/case_code/);
 assert.throws(()=>prepareFullMissionDraftRevision({expected_revision_id:'stale',mission:revised},workspace),/different saved revision/);
});
test('route changes explicitly appear in the approval report rather than being silently hidden',()=>{
 const {workspace,revised}=fixture();
 revised.steps.d2_wobbly.choices.A.next='d3_wobbly';
 const prepared=prepareFullMissionDraftRevision(revised,workspace);
 assert.ok(prepared.routeChanges.includes('steps.d2_wobbly.choices.A.next'));
 assert.match(reviewSummary(prepared),/CAUTION — ROUTING CHANGES/);
});
test('saving only occurs after explicit invocation and verifies readback; stale concurrent drafts are blocked',async()=>{
 const {workspace,revised}=fixture();
 const prepared=prepareFullMissionDraftRevision(revised,workspace);
 let current=structuredClone(workspace),writes=0;
 const read=async()=>structuredClone(current);
 const save=async revision=>{
  writes++;
  current.missions[0]={...current.missions[0],revision_id:'new-qa-revision',mission:structuredClone(revision.mission)};
  return 'new-qa-revision';
 };
 assert.equal(writes,0);
 const result=await saveReviewedDraftRevision(prepared,read,save);
 assert.equal(result.revision_id,'new-qa-revision');
 assert.equal(writes,1);
 assert.equal(current.missions[0].mission.authoringMeta.qualityReview.behavioral,false);
 await assert.rejects(saveReviewedDraftRevision(prepared,read,save),/changed since patch review/);
 assert.equal(writes,1);
});
test('saved mission must match exact full JSON, not just preview metadata',async()=>{
 const {workspace,revised}=fixture();
 const prepared=prepareFullMissionDraftRevision(revised,workspace);
 const wrong={...structuredClone(workspace),missions:[{...workspace.missions[0],revision_id:'after',
   mission: {...revised,title:'Tampered'}}]};
 let call=0;
 await assert.rejects(saveReviewedDraftRevision(prepared,async()=>{
  call++;
  return call===1?workspace:wrong;
 },async()=> 'after'),/exact saved read-back failed/);
});
