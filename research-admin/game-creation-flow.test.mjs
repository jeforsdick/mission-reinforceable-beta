import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMission, captureMission, draftPreviewUrl, renderMissionBuilder, normalizeMission} from './game-creation-ui.mjs';

const workspace = {
  case:{id:'test-case-uuid',case_code:'CASE-TEST',student_alias:'AM'},
  fidelity_targets:[{target_key:'proactive_01',description:'Offer recognition to appropriate behavior'}],
  missions:[]
};
const slot = {mission_type:'daily',slot_number:1};

test('Research Admin authoring explains exactly how What Happened → Now comes from saved fields', () => {
  const mission = blankMission('CASE-TEST','daily',1);
  mission.steps.d1_start.text = 'A familiar classroom setting.';
  mission.steps.d1_start.choices.A.wizard = 'Great thinking!';
  mission.steps.d1_start.choices.A.consequence = 'AM puts the cards away.';
  mission.endings.STRONG = {summary:'AM begins his work.',text:'AM begins his work with help.',wizard:'A bright ending.'};
  const html = renderMissionBuilder(workspace,slot,mission,{decision:1,branch:'supported'});
  assert.match(html,/NOW — WHAT IS HAPPENING IN THE CLASSROOM/);
  assert.match(html,/WHAT HAPPENS NEXT\? — THIS SHOWS AS “WHAT HAPPENED” AFTER THE CHOICE/);
  assert.match(html,/Teacher choice → Wizard reaction → WHAT HAPPENED/);
  assert.match(html,/Each shared NOW scene must work after every route/);
  assert.match(html,/name="wizard" rows="2"/);
  assert.match(html,/Great thinking!/);
  assert.match(html,/AM puts the cards away/);
  assert.match(html,/class="mission-outcomes-editor"/);
  assert.match(html,/name="summary"/);
  assert.match(html,/AM begins his work\./);
  assert.match(html,/A bright ending\./);
});
test('draft preview automatically requests the new cause-and-effect QA view, without participant data', () => {
  const link = draftPreviewUrl('CASE-TEST','wild',4);
  const parsed = new URL(link, 'https://example.test/research-admin/');
  assert.equal(parsed.searchParams.get('qa_case'),'CASE-TEST');
  assert.equal(parsed.searchParams.get('qa_draft_type'),'wild');
  assert.equal(parsed.searchParams.get('qa_draft_slot'),'4');
  assert.equal(parsed.searchParams.get('qa_consequence_preview'),'1');
  assert.doesNotMatch(link,/student|teacher|participant|email|response/i);
});
test('editing short and full outcome text keeps existing branching, scenes and authored metadata', () => {
  const mission = blankMission('CASE-TEST','daily',1);
  const aRoute = mission.steps.d1_start.choices.A.next;
  const panels = ['STRONG','MIXED','FRAGILE'].map(key => ({
    dataset:{ending:key},
    querySelector(selector) {
      return {value: selector.includes('summary') ? key+' brief summary.'
        : selector.includes('wizard') ? key+' Wizard line.'
        : key+' detailed mission ending.'};
    }
  }));
  const root = {
    querySelector() {return null;},
    querySelectorAll(selector){return selector==='.mission-ending'?panels:[];}
  };
  captureMission(root,mission,{decision:1,branch:'supported'});
  assert.equal(mission.steps.d1_start.choices.A.next,aRoute);
  for (const key of ['STRONG','MIXED','FRAGILE']){
    assert.equal(mission.endings[key].summary,key+' brief summary.');
    assert.equal(mission.endings[key].text,key+' detailed mission ending.');
    assert.equal(mission.endings[key].wizard,key+' Wizard line.');
  }
  const normalized=normalizeMission(mission,'CASE-TEST','daily',1);
  assert.equal(normalized.endings.STRONG.summary,'STRONG brief summary.');
});
