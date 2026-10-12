import test from 'node:test';
import assert from 'node:assert/strict';
import {unresolvedReviewOutcomes,editReviewOpportunity,renderReviewTarget} from './review-resolution.mjs';

const makeAttempt=()=>({
  fidelityOpportunities:[
    {event_id:'n1',target_id:'nora_01',implementation:'not_implemented',elapsed_seconds:118,desired_outcome:null},
    {event_id:'n2',target_id:'nora_02',implementation:'not_implemented',elapsed_seconds:118,desired_outcome:null},
    {event_id:'n3',target_id:'nora_03',implementation:'not_implemented',elapsed_seconds:118,desired_outcome:null},
    {event_id:'n4',target_id:'nora_04',implementation:'implemented',elapsed_seconds:118,desired_outcome:null},
    {event_id:'n5',target_id:'nora_05',implementation:'implemented',elapsed_seconds:118,desired_outcome:null}
  ]
});

test('Melissa scenario: only two of five recorded opportunities require outcomes',()=>{
  const attempt=makeAttempt();
  assert.equal(unresolvedReviewOutcomes(attempt).length,2);
  const rows=attempt.fidelityOpportunities.map((event,index)=>renderReviewTarget({
    short:'BSP step',detail:'Observable definition',desiredOutcome:'Expected response'
  },index,[event],event.implementation)).join('');
  assert.equal((rows.match(/data-review-implementation=/g)||[]).length,10);
  assert.equal((rows.match(/data-review-outcome=/g)||[]).length,6);
  assert.match(rows,/Recorded at \+01:58/);
});

test('All required outcomes entered -> submission gate is clear',()=>{
  const attempt=makeAttempt();
  assert.ok(editReviewOpportunity(attempt,'n4','outcome','yes'));
  assert.equal(unresolvedReviewOutcomes(attempt).length,1);
  assert.ok(editReviewOpportunity(attempt,'n5','outcome','unclear'));
  assert.equal(unresolvedReviewOutcomes(attempt).length,0);
});

test('Review corrections preserve event identity and clear stale outcome when marked not implemented',()=>{
  const attempt=makeAttempt();
  assert.ok(editReviewOpportunity(attempt,'n4','outcome','no'));
  assert.ok(editReviewOpportunity(attempt,'n4','implementation','not_implemented'));
  assert.equal(attempt.fidelityOpportunities[3].event_id,'n4');
  assert.equal(attempt.fidelityOpportunities[3].desired_outcome,null);
  assert.equal(unresolvedReviewOutcomes(attempt).length,1);
});

test('Cannot rate a nonimplemented event or choose invalid values',()=>{
  const attempt=makeAttempt();
  assert.equal(editReviewOpportunity(attempt,'n2','outcome','yes'),false);
  assert.equal(editReviewOpportunity(attempt,'n4','outcome','maybe'),false);
  assert.equal(editReviewOpportunity(attempt,'none','remove'),false);
});

test('Remove accidental event and escape descriptions',()=>{
  const attempt=makeAttempt();
  assert.ok(editReviewOpportunity(attempt,'n3','remove'));
  assert.equal(attempt.fidelityOpportunities.length,4);
  const html=renderReviewTarget({short:'<img src=x onerror=alert(1)>',detail:'test',desiredOutcome:'test'},0,[],'no_opportunity');
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/No Opportunity/);
});
