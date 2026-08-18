import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const legacy = await readFile(new URL('../../supabase/migrations/20260818020000_weekly_teacher_checkins.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../supabase/migrations/20260818050000_june29_weekly_teacher_report.sql', import.meta.url), 'utf8');
const auth = await readFile(new URL('./auth.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('deployed migration remains legacy and the June 29 change is additive',()=>{
  assert.match(legacy,/submit_weekly_teacher_checkin/); assert.doesNotMatch(legacy,/june29_v1/);
  assert.match(migration,/alter table public\.weekly_teacher_checkins/); assert.doesNotMatch(migration,/drop table/);
});
test('June 29 ratings and optional text are server constrained',()=>{
  for(const field of ['access','manageability','bsp_relevance','implementation_thinking','feedback_usefulness','target_behavior','replacement_behavior']) {
    assert.match(migration,new RegExp(`p_${field}_rating not between 1 and 5`));
    assert.match(html,new RegExp(`name="${field}_rating"`));
  }
  assert.match(migration,/char_length\(p_barriers_facilitators\) > 1000/); assert.match(migration,/char_length\(p_behavior_context_note\) > 1000/);
  assert.match(html,/name="barriers_facilitators" maxlength="1000"/); assert.match(html,/name="behavior_context_note" maxlength="1000"/);
});
test('active RPC replaces legacy submission and preserves weekly safeguards',()=>{
  assert.match(auth,/rpc\('submit_weekly_teacher_report'/); assert.doesNotMatch(auth,/rpc\('submit_weekly_teacher_checkin'/);
  assert.match(migration,/drop function public\.submit_weekly_teacher_checkin/); assert.match(migration,/America\/Denver/);
  assert.match(migration,/is_mr_dissertation_study_day/); assert.match(migration,/today < available or today >= monday \+ 7/);
  assert.match(migration,/weekly_checkins_participant_week_mode_key|unique_violation/); assert.doesNotMatch(migration,/game_sessions/);
  assert.match(migration,/,false\)/); assert.match(migration,/p\.auth_user_id=\(select auth\.uid\(\)\).*p\.active and c\.active/);
});
test('teacher copy contains five experience items and correctly directed behavior scales',()=>{
  for(const copy of ['easy to access this week','manageable to complete within my classroom routine','felt relevant to the student\'s behavior support plan','helped me think through how to implement','feedback in Mission: Reinforceable was useful']) assert.match(html,new RegExp(copy));
  assert.match(html,/1 — Fantastic week \/ target behavior occurred at a very low level/); assert.match(html,/5 — Extremely difficult week \/ target behavior occurred at a very high level/);
  assert.match(html,/1 — Extremely difficult week \/ replacement behavior occurred rarely or not at all/); assert.match(html,/5 — Fantastic week \/ replacement behavior occurred consistently/);
});
test('raw reports are participant/admin only and legacy data is versioned',()=>{
  assert.match(migration,/drop policy if exists "Assigned coaches read normal weekly check-ins"/);
  assert.match(migration,/report_version text not null default 'legacy_checkin_v1'/); assert.match(migration,/'june29_v1'/);
});
