import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const studyDateSource = await read('./study-date.js');
const migration = await read('../../supabase/migrations/20260818000000_participant_daily_mission_lock.sql');
const engine = await read('./engine.js');
const app = await read('./app.js');

function studyDateApi() {
  const context = { window: {} };
  vm.runInNewContext(studyDateSource, context);
  return context.window.MR.studyDate;
}

function completedToday(rows, today) {
  return rows.some(row => row.status === 'completed' && row.qa_mode === false && row.study_date === today);
}

for (const mode of ['daily', 'wild', 'crisis']) {
  test(`completed ${mode} today blocks every mission mode`, () => {
    const rows = [{ mode, status: 'completed', qa_mode: false, study_date: '2026-08-18' }];
    assert.equal(completedToday(rows, '2026-08-18'), true);
    assert.deepEqual(['daily', 'wild', 'crisis'].map(() => !completedToday(rows, '2026-08-18')), [false, false, false]);
  });
}

test('no completion permits all modes', () => {
  assert.deepEqual(['daily', 'wild', 'crisis'].map(() => !completedToday([], '2026-08-18')), [true, true, true]);
});

for (const status of ['started', 'abandoned']) {
  test(`${status} session does not consume daily exposure`, () => {
    assert.equal(completedToday([{ status, qa_mode: false, study_date: '2026-08-18' }], '2026-08-18'), false);
  });
}

test('completed QA session does not consume exposure and QA start bypass is explicit', () => {
  assert.equal(completedToday([{ status: 'completed', qa_mode: true, study_date: '2026-08-18' }], '2026-08-18'), false);
  assert.match(engine, /if \(context && !context\.qaMode\)/);
  assert.match(migration, /gs\.qa_mode = false/);
});

test('QA Preview can run repeatedly without participant lock checks', () => {
  assert.match(app, /assignment\.qaMode \? false : await MR\.auth\.hasCompletedMissionToday\(\)/);
  assert.match(engine, /if \(context && !context\.qaMode\)/);
});

test('yesterday completion does not block today', () => {
  assert.equal(completedToday([{ status: 'completed', qa_mode: false, study_date: '2026-08-17' }], '2026-08-18'), false);
});

test('Denver date controls a UTC/Denver boundary and daylight-saving-aware formatting', () => {
  const api = studyDateApi();
  assert.equal(api.timeZone, 'America/Denver');
  assert.equal(api.dateKey(new Date('2026-08-18T05:30:00Z')), '2026-08-17');
  assert.equal(api.dateKey(new Date('2026-03-08T06:59:00Z')), '2026-03-07');
  assert.equal(api.dateKey(new Date('2026-03-08T07:01:00Z')), '2026-03-08');
});

test('Daily deterministic selection uses the Denver study-date seed, never UTC epoch days', () => {
  const api = studyDateApi();
  assert.equal(api.dailySeed(new Date('2026-08-18T05:30:00Z')), 20260817);
  assert.match(engine, /MR\.studyDate\.dailySeed\(\)/);
  assert.doesNotMatch(engine, /Date\.now\(\) \/ 86400000/);
});

test('database RPC and insert policy remain authoritative when localStorage is cleared', () => {
  assert.match(engine, /await MR\.auth\.hasCompletedMissionToday\(\)/);
  assert.match(migration, /not public\.has_completed_mission_today\(\)/);
  assert.match(migration, /p\.auth_user_id = \(select auth\.uid\(\)\)[\s\S]*p\.active = true/);
  assert.doesNotMatch(migration, /localStorage/);
});
