import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const recap=require('./weekly-recap-service');

test('weekly Qualtrics URL requires the approved HTTPS hostname',()=>{
  const personalized='https://educationutah.co1.qualtrics.com/jfe/form/SV_9MsIT9TZXCdeIWa?StudyID=MR-998&target=ask%20for%20help';
  assert.equal(recap.validateWeeklyQualtricsUrl(personalized).url,personalized);
  assert.equal(recap.validateWeeklyQualtricsUrl('').configured,false);
  for(const invalid of ['http://educationutah.co1.qualtrics.com/jfe/form/x','https://evil.example/x','https://educationutah.co1.qualtrics.com.evil.example/x']) assert.equal(recap.validateWeeklyQualtricsUrl(invalid).valid,false);
});

test('current week is Monday through Friday in America/Denver',()=>{
  assert.deepEqual(recap.currentStudyWeek(new Date('2026-09-14T05:30:00Z')),{week_start:'2026-09-07',week_end:'2026-09-11',timezone:'America/Denver'});
  assert.deepEqual(recap.currentStudyWeek(new Date('2026-09-14T06:30:00Z')),{week_start:'2026-09-14',week_end:'2026-09-18',timezone:'America/Denver'});
});

test('valid Daily Mystery and Crisis sessions aggregate while invalid sessions are excluded',()=>{
  const base={participant_id:'p1',case_id:'c1',status:'completed',qa_mode:false,game_content_version:4,study_date:'2026-09-14'};
  const sessions=[
    {...base,mode:'daily',mission_id:'d1'}, {...base,mode:'mystery',mission_id:'m1'},
    {...base,mode:'crisis',mission_id:'c1',study_date:'2026-09-15'},
    {...base,mode:'daily',mission_id:'d1',qa_mode:true}, {...base,mode:'daily',mission_id:'d1',status:'started'},
    {...base,mode:'daily',mission_id:'old',game_content_version:3}, {...base,mode:'daily',mission_id:'d1',case_id:'wrong'},
    {...base,mode:'demo',mission_id:'d1'}
  ];
  const content={participant_id:'p1',case_id:'c1',version:4,daily_missions:[{id:'d1'}],wildcard_missions:[{id:'m1'}],crisis_missions:[{id:'c1'}]};
  const result=recap.summarizeSessions(sessions,content,{week_start:'2026-09-14',week_end:'2026-09-18'});
  assert.equal(result.missions_completed,3);
  assert.equal(result.days_practiced,2);
  assert.equal(result.eligible_study_days,4);
  assert.deepEqual(result.mission_mix,{daily:1,mystery:1,crisis:1});
  assert.equal(result.xp_available,false);
  assert.equal(result.behavior_plan_xp,null);
});

test('eligible study-day denominator reuses the study calendar holidays',()=>{
  assert.equal(recap.eligibleStudyDays({week_start:'2026-09-14',week_end:'2026-09-18'}),4);
  assert.equal(recap.eligibleStudyDays({week_start:'2026-11-23',week_end:'2026-11-27'}),2);
});

test('loaded RPC summary gains only the calendar-derived eligible-day denominator',async()=>{
  const rpcSummary={missions_completed:2,days_practiced:1,mission_mix:{daily:2,mystery:0,crisis:0},xp_available:false};
  const result=await recap.loadWeeklySummary('case',async()=>({ok:true,json:async()=>rpcSummary}),new Date('2026-09-14T18:00:00Z'));
  assert.deepEqual(result,{...rpcSummary,eligible_study_days:4});
});
