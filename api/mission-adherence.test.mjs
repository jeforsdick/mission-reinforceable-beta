import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration=await readFile(new URL('../supabase/migrations/20260824060000_mission_adherence_expected_days.sql',import.meta.url),'utf8');
const sql=migration.replace(/\s+/g,' ');

test('canonical adherence RPC uses Granite scheduled days and only current teacher unavailable',()=>{
  assert.match(sql,/is_mr_dissertation_study_day\(day::date\)/i);
  assert.match(sql,/current_participant_study_day_status\(p\.id,target_case_id\)/i);
  assert.match(sql,/cs\.reason='teacher_unavailable'/i);
  assert.doesNotMatch(sql,/cs\.reason\s+in\s*\(/i);
  assert.match(sql,/'expectedMissionDays',count\(\*\) filter\(where not excused\)/i);
});

test('completion uses Denver dates, excludes QA, and never mutates raw data',()=>{
  assert.match(sql,/at time zone 'America\/Denver'/i);
  assert.match(sql,/gs\.status='completed' and not gs\.qa_mode/i);
  assert.match(sql,/'completedExpectedMissionDays',count\(\*\) filter\(where not excused and completed\)/i);
  assert.doesNotMatch(sql,/\b(update|delete|insert|truncate)\b/i);
});

test('adherence function is narrowly authorized without changing outcome systems',()=>{
  assert.match(sql,/case_coaches.*coach_user_id=auth\.uid\(\).*cc\.active/i);
  for(const boundary of ['phase','observation','fidelity','IOA','reminder','lock','gameplay persistence']) assert.match(migration,new RegExp(boundary,'i'));
});
