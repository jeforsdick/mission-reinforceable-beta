import test from 'node:test'; import assert from 'node:assert/strict'; import { COMPONENTS,isStudyDay,weekHasStudyDay,percentage,currentReviews } from './procedural-fidelity.mjs';
test('frozen exact component keys and scoring',()=>{
 assert.deepEqual(COMPONENTS.daily.map(x=>x[0]),['daily_prompt_delivered','mission_available','functional_access_available']);
 assert.deepEqual(COMPONENTS.weekly.map(x=>x[0]),['weekly_usage_summary_delivered','weekly_teacher_checkin_distributed']);
 assert.equal(percentage(3,3),'100%'); assert.equal(percentage(2,3),'66.7%'); assert.equal(percentage(2,2),'100%'); assert.equal(percentage(0,0),'Not applicable');
});
test('Granite calendar rejects weekends, holidays, and full breaks',()=>{
 assert.equal(isStudyDay('2026-08-12'),true); assert.equal(isStudyDay('2026-08-15'),false); assert.equal(isStudyDay('2026-09-07'),false); assert.equal(isStudyDay('2026-12-23'),false);
 assert.equal(weekHasStudyDay('2026-12-21'),false); assert.equal(weekHasStudyDay('2027-03-29'),false); assert.equal(weekHasStudyDay('2026-08-10'),true);
});
test('only authoritative rows contribute to client reporting',()=>assert.deepEqual(currentReviews([{id:1,is_current:false},{id:2,is_current:true}]).map(x=>x.id),[2]));
