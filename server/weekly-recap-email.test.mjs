import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {buildWeeklyRecapEmail}=require('./weekly-recap-email');
const url='https://educationutah.co1.qualtrics.com/jfe/form/SV_9MsIT9TZXCdeIWa?StudyID=MR-998&target=ask%20for%20help';
const summary={missions_completed:0,days_practiced:0,mission_mix:{daily:0,mystery:0,crisis:0},xp_available:false,behavior_plan_xp:null};

test('weekly HTML and text use the stored URL unchanged and neutral zero-mission copy',()=>{
  const email=buildWeeklyRecapEmail({summary,weeklyQualtricsUrl:url,teacherName:'Dr. Pat Example',assetOrigin:'https://missionreinforceable.com/game/'});
  assert.equal(email.ctaUrl,url);
  assert.match(email.html,/YOUR WEEKLY QUEST RECAP/);
  assert.match(email.html,/Every week is different/);
  assert.match(email.text,/0 Missions Completed/);
  assert.match(email.text,/0 Days Practiced/);
  assert.doesNotMatch(email.text,/Behavior Plan XP/);
  assert.match(email.text,/Hello, Pat!/);
  assert.ok(email.html.includes(url.replaceAll('&','&amp;')));
});

test('missing link prevents weekly email construction',()=>{
  assert.throws(()=>buildWeeklyRecapEmail({summary,weeklyQualtricsUrl:null,teacherName:'Pat',assetOrigin:'https://missionreinforceable.com'}),/required/);
});
