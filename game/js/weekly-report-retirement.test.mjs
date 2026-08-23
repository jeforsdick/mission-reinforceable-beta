import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const index = await read('../index.html');
const auth = await read('./auth.js');
const app = await read('./app.js');
const migration = await read('../../supabase/migrations/20260823000000_retire_mr_weekly_teacher_report.sql');

test('authenticated game contains no hosted weekly-report UI, route, or client collection path', async () => {
  assert.doesNotMatch(index, /Weekly Teacher Report|weekly-checkin|weekly_report/);
  assert.doesNotMatch(auth + app, /weeklyReportMode|hasWeeklyCheckin|submitWeeklyTeacherReport|submit_weekly_teacher|weekly_teacher_checkins/);
  await assert.rejects(access(new URL('./weekly-checkin.js', import.meta.url)));
});

test('retirement migration removes only the final weekly-report storage objects', () => {
  assert.match(migration, /drop function if exists public\.submit_weekly_teacher_report\(smallint,smallint,smallint,smallint,smallint,smallint,smallint,text,text\)/);
  assert.match(migration, /drop function if exists public\.submit_weekly_teacher_checkin\(smallint,smallint,boolean,text\)/);
  assert.match(migration, /drop table if exists public\.weekly_teacher_checkins/);
  assert.doesNotMatch(migration, /drop policy|drop index/i);
  assert.doesNotMatch(migration, /drop table (?!if exists public\.weekly_teacher_checkins)/i);
  assert.doesNotMatch(migration, /drop (?:table|function).*\b(?:participants|cases|profiles|game_sessions|game_responses|game_resource_events|teacher_reminder|fidelity_targets|observations|coaching_contacts)\b/i);
});
