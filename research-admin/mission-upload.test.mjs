import test from 'node:test';
import assert from 'node:assert/strict';
import { blankMission, renderMissionBank } from './game-creation-ui.mjs';
import { prepareMissionUpload, saveMissionUpload } from './mission-upload.mjs';

function fixture(type = 'daily', slot = 2, saved = true, idFormat = 'work') {
  const mission = blankMission('CASE-EXAMPLE',type,slot);
  mission.id = idFormat === 'work'
    ? 'CASE-EXAMPLE_' + type.toUpperCase() + '_' + String(slot).padStart(2,'0')
    : mission.id;
  mission.title = type === 'daily' ? 'Hands Up!' : type === 'crisis' ? 'The Domino Effect' : 'Mystery Visit';
  mission.routine = 'Classroom math routine';
  mission.focus = 'Practice a plan-aligned response';
  mission.authoringMeta.sourceStatus = 'PROVISIONAL QA: intake and active provisional targets only';
  mission.authoringMeta.qualityReview = { behavioral:false, gameDesign:false };
  for (const [id,scene] of Object.entries(mission.steps)) {
    scene.text = 'During math, the student wants help from the teacher while the class continues to work on a short number pattern.';
    scene.hint = 'Choose the plan-aligned teacher action.';
    scene.meta = { fidelityTargetKey:'teaching_01' };
    for (const [key,c] of Object.entries(scene.choices)) {
      c.text = 'Respond to the student by using the appropriate plan ingredient in this classroom moment.';
      c.consequence = 'The student responds and the classroom routine continues with some adult attention.';
      c.wizard = 'A brief Wizard response.';
      c.feedback = 'This choice can be evaluated against the currently authorized fidelity target.';
      c.meta = { bipComponent:'Teach',mechanism:'model',function:'attention',
        errorType:key==='A'?'none':'missed_opportunity' };
    }
  }
  for (const ending of Object.values(mission.endings)) {
    ending.text = 'The teacher continues the individualized plan after the final exchange.';
    ending.summary = 'A short truthful result for this classroom mission.';
    ending.wizard = 'A short Wizard summary.';
  }
  const workspace = {
    case:{id:'private-case-id',case_code:'CASE-EXAMPLE'},
    fidelity_targets:[{target_key:'teaching_01',description:'Prompt the request',domain:'teaching'}],
    missions:saved?[{mission_type:type,slot_number:slot,revision_id:'old-saved',mission:structuredClone(mission)}]:[],
    has_crisis_plan:false
  };
  return {workspace,mission};
}

test('one upload area replaces three old sections, with one dropdown containing all 20 mission slots',()=>{
  const {workspace}=fixture();
  const html=renderMissionBank(workspace,{ mission_type:'daily',slot_number:2 });
  assert.match(html,/<h2 id="mission-upload-title">Upload a mission file<\/h2>/);
  assert.match(html,/<select id="mission-upload-slot"/);
  assert.match(html,/<option value="daily:2" selected>/);
  assert.match(html,/<option value="wild:4"/);
  assert.match(html,/<option value="crisis:5"/);
  assert.match(html,/<button id="review-mission-upload"/);
  assert.match(html,/<button id="save-mission-upload" type="button" disabled>/);
  assert.doesNotMatch(html,/import-approved-drafts|import-revision-patch|review-complete-mission/);
});
test('existing full JSON is only reviewed, not saved; all metadata and feedback survive',()=>{
  const {workspace,mission}=fixture();
  const revised=structuredClone(mission);
  revised.steps.d1_start.choices.A.wizard='The Wizard now gives different feedback.';
  revised.endings.STRONG.summary='Revised successful ending.';
  revised.authoringMeta.sourceStatus='PROVISIONAL QA, paraphrased by author';
  const plan=prepareMissionUpload(revised,workspace,{mission_type:'daily',slot_number:2});
  assert.equal(plan.kind,'existing');
  assert.equal(plan.expected_revision_id,'old-saved');
  assert.match(plan.report,/NO SAVE HAS OCCURRED/);
  assert.equal(plan.prepared.mission.steps.d1_start.choices.A.wizard,'The Wizard now gives different feedback.');
  assert.equal(plan.prepared.mission.authoringMeta.sourceStatus,mission.authoringMeta.sourceStatus);
  assert.equal(workspace.missions[0].revision_id,'old-saved');
  assert.notEqual(workspace.missions[0].mission.steps.d1_start.choices.A.wizard,
    revised.steps.d1_start.choices.A.wizard);
});
test('one new CASE code mission saves only through deliberate save call and exact readback',async()=>{
  const {workspace,mission}=fixture('wild',3,false,'builder');
  const plan=prepareMissionUpload(mission,workspace,{mission_type:'wild',slot_number:3});
  assert.equal(plan.kind,'new');
  assert.match(plan.report,/NO SAVE HAS OCCURRED/);
  assert.equal(plan.record.mission.authoringMeta.qualityReview.behavioral,false);
  assert.equal(workspace.missions.length,0);
  let live=structuredClone(workspace),writes=0;
  const result=await saveMissionUpload(plan,async()=>structuredClone(live),async row=>{
    writes++;
    live.missions=[{...row,revision_id:'new-qa',mission:structuredClone(row.mission)}];
    return 'new-qa';
  });
  assert.equal(result.revision_id,'new-qa');
  assert.equal(writes,1);
  assert.equal(live.missions[0].mission.title,'Mystery Visit');
});
test('existing approved import envelope with one mission works, mismatch case/slot is rejected',()=>{
  const {workspace,mission}=fixture('crisis',2);
  const revised=structuredClone(mission);
  revised.steps.d3_supported.choices.B.feedback+=' More specific feedback.';
  const envelope={schemaVersion:1,case_id:workspace.case.id,case_code:workspace.case.case_code,
    missions:[{mission_type:'crisis',slot_number:2,mission:revised}]};
  const plan=prepareMissionUpload(envelope,workspace,{mission_type:'crisis',slot_number:2});
  assert.equal(plan.kind,'existing');
  assert.throws(()=>prepareMissionUpload(envelope,workspace,{mission_type:'daily',slot_number:2}),/does not match/);
  assert.throws(()=>prepareMissionUpload({...envelope,case_code:'OTHER'},workspace,{mission_type:'crisis',slot_number:2}),/different case/);
  assert.throws(()=>prepareMissionUpload({...envelope,missions:[...envelope.missions,...envelope.missions]},workspace,{mission_type:'crisis',slot_number:2}),/one mission per file/);
});
test('wrong selected type or slot cannot silently relabel mission identity',()=>{
  const {workspace,mission}=fixture();
  const changed=structuredClone(mission);
  changed.steps.d1_start.text+=' Additional detail.';
  assert.throws(()=>prepareMissionUpload(changed,workspace,{mission_type:'daily',slot_number:3}),/Wrong mission/);
  assert.throws(()=>prepareMissionUpload(changed,workspace,{mission_type:'crisis',slot_number:2}),/Wrong mission/);
  assert.throws(()=>prepareMissionUpload(changed,workspace,{mission_type:'daily',slot_number:0}),/Choose a Daily/);
});
test('new uploads cannot claim verified-live approval, and never carry uploaded review flags',()=>{
  const {workspace,mission}=fixture('daily',3,false);
  mission.authoringMeta.qualityReview.behavioral=true;
  mission.authoringMeta.qualityReview.gameDesign=true;
  const good=prepareMissionUpload(mission,workspace,{mission_type:'daily',slot_number:3});
  assert.equal(good.record.mission.authoringMeta.qualityReview.behavioral,false);
  assert.equal(good.record.mission.authoringMeta.qualityReview.gameDesign,false);
  mission.authoringMeta.sourceStatus='LIVE plan verified by AI';
  assert.throws(()=>prepareMissionUpload(mission,workspace,{mission_type:'daily',slot_number:3}),/unverified clinical/);
});
test('concurrent edit cannot be overwritten by an old reviewed file',async()=>{
  const {workspace,mission}=fixture();
  const revised=structuredClone(mission);
  revised.steps.d1_start.choices.C.consequence+=' A later moment.';
  const reviewed=prepareMissionUpload(revised,workspace,{mission_type:'daily',slot_number:2});
  let writes=0;
  const changed=structuredClone(workspace);
  changed.missions[0].revision_id='new-concurrent-revision';
  await assert.rejects(saveMissionUpload(reviewed,async()=>changed,async()=>{writes++;return 'unexpected';}),/changed since patch review/);
  assert.equal(writes,0);
});
