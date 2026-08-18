import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../../supabase/migrations/20260818020000_weekly_teacher_checkins.sql', import.meta.url), 'utf8');
const auth = await readFile(new URL('./auth.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('weekly check-in schema validates required responses and note length', () => {
  assert.match(migration, /helpfulness_rating smallint not null/);
  assert.match(migration, /confidence_rating smallint not null/);
  assert.match(migration, /plan_difficult boolean not null/);
  assert.match(migration, /helpfulness_rating between 1 and 5/);
  assert.match(migration, /confidence_rating between 1 and 5/);
  assert.match(migration, /char_length\(coach_note\) <= 1000/);
  assert.match(html, /name="coach_note" maxlength="1000"/);
});

test('participant submission is an immutable, ownership-resolving RPC', () => {
  assert.match(auth, /rpc\('submit_weekly_teacher_checkin'/);
  assert.match(migration, /p\.auth_user_id=\(select auth\.uid\(\)\).*p\.active and c\.active/);
  assert.match(migration, /revoke insert, update, delete on table public\.weekly_teacher_checkins from authenticated/);
  assert.match(migration, /unique index weekly_checkins_participant_week_mode_key/);
  assert.match(migration, /exception when unique_violation/);
});

test('weekly reads are participant-owned, active-coach assigned, and admin scoped', () => {
  assert.match(migration, /owns_active_participant_case\(participant_id, case_id\)/);
  assert.match(migration, /is_active_case_coach\(case_id\)/);
  assert.match(migration, /is_research_admin\(\)/);
  assert.match(migration, /qa_mode = false/);
});

test('submission validates the current Denver week and stores normal study data only', () => {
  assert.match(migration, /now\(\) at time zone 'America\/Denver'/);
  assert.match(migration, /today < available or today >= monday \+ 7/);
  assert.match(migration, /p_plan_difficult is null/);
  assert.match(migration, /,false\)/);
});
