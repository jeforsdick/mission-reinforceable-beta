import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const studyDateSource = await read('./study-date.js');
const studyCalendarSource = await read('./study-calendar.js');
const engine = await read('./engine.js');
const app = await read('./app.js');
const index = await read('../index.html');
const demoIndex = await read('../../demo-game/index.html');

function calendarApi() {
  const context = { window: {}, Date, Intl, Set };
  vm.runInNewContext(studyDateSource, context);
  vm.runInNewContext(studyCalendarSource, context);
  return context.window.MR.studyCalendar;
}

const calendar = calendarApi();

test('America/Denver is authoritative, including a UTC date boundary', () => {
  assert.equal(calendar.timeZone, 'America/Denver');
  assert.equal(calendar.isEligibleStudyDay(new Date('2026-08-13T05:30:00Z')), true);
  assert.equal(calendar.isEligibleStudyDay(new Date('2026-09-08T05:30:00Z')), false);
});

test('instructional window endpoints and an ordinary weekday are eligible', () => {
  for (const key of ['2026-08-12', '2026-08-13', '2027-05-26']) assert.equal(calendar.isEligibleStudyDay(key), true, key);
});

test('weekends and dates outside the instructional window are ineligible', () => {
  for (const key of ['2026-08-08', '2026-08-09', '2026-08-11', '2027-05-27']) assert.equal(calendar.isEligibleStudyDay(key), false, key);
});

test('every Granite holiday, break, recess, and contract date is ineligible', () => {
  const dates = [
    '2026-09-07', '2026-09-18', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20',
    '2026-11-25', '2026-11-26', '2026-11-27',
    '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01',
    '2027-01-04', '2027-01-18', '2027-02-12', '2027-02-15', '2027-02-16',
    '2027-03-12', '2027-03-15', '2027-03-29', '2027-03-30', '2027-03-31',
    '2027-04-01', '2027-04-02', '2027-04-05'
  ];
  for (const key of dates) assert.equal(calendar.isEligibleStudyDay(key), false, key);
});

test('Planning Day and kindergarten instructional-day exceptions remain eligible', () => {
  for (const key of ['2026-09-25', '2027-05-21']) assert.equal(calendar.isEligibleStudyDay(key), true, key);
});

test('participant gate precedes completion lookup, mission creation, and telemetry', () => {
  const gate = engine.indexOf('!MR.studyCalendar.isEligibleStudyDay()');
  assert.ok(gate >= 0);
  assert.ok(gate < engine.indexOf('await MR.auth.hasCompletedMissionToday()', gate));
  assert.ok(gate < engine.indexOf('const mission = chooseMission(mode)', gate));
  assert.ok(gate < engine.indexOf('startRelationalTelemetry(current)', gate));
  assert.match(index, /No mission scheduled today\. Come back on your next school day!/);
});

test('QA Preview bypasses the calendar and public demo does not load it', () => {
  assert.match(engine, /if \(context && !context\.qaMode\)[\s\S]*!MR\.studyCalendar\.isEligibleStudyDay\(\)/);
  assert.doesNotMatch(demoIndex, /study-calendar\.js/);
});

test('calendar return state leaves Progress and Resources navigation available', () => {
  assert.match(app, /calendarBlocked[\s\S]*#home-primary-btn/);
  assert.match(index, /id="nav-progress"/);
  assert.match(index, /id="nav-resources"/);
  assert.doesNotMatch(app, /calendarBlocked[\s\S]{0,300}#nav-(?:progress|resources)/);
});

test('database-backed daily completion lock remains a separate second gate', () => {
  assert.match(engine, /!MR\.studyCalendar\.isEligibleStudyDay\(\)[\s\S]*await MR\.auth\.hasCompletedMissionToday\(\)/);
  assert.match(engine, /completeParticipantMission\(sessionId, updates\)/);
});

test('weekly check-in opens on the last eligible day and closes next Monday', () => {
  assert.equal(calendar.lastEligibleStudyDayForWeek('2026-09-14'), '2026-09-17');
  assert.equal(calendar.weeklyCheckinWindow('2026-09-17').isAvailable, true);
  assert.equal(calendar.weeklyCheckinWindow('2026-09-20').isAvailable, true);
  assert.equal(calendar.weeklyCheckinWindow('2026-09-21').isAvailable, false);
});

test('short Granite weeks use their actual last scheduled study day', () => {
  assert.equal(calendar.lastEligibleStudyDayForWeek('2026-10-12'), '2026-10-14');
  assert.equal(calendar.lastEligibleStudyDayForWeek('2026-11-23'), '2026-11-24');
  assert.equal(calendar.lastEligibleStudyDayForWeek('2027-05-24'), '2027-05-26');
});

test('full Winter and Spring Break weeks have no weekly check-in', () => {
  assert.equal(calendar.weeklyCheckinWindow('2026-12-23'), null);
  assert.equal(calendar.weeklyCheckinWindow('2027-03-31'), null);
});

test('weekly UI is independent of mission completion and absent from public demo', () => {
  assert.match(index, /id="weekly-checkin-entry"/);
  assert.match(app, /MR\.weeklyCheckin\?\.renderEntry\(\)/);
  assert.doesNotMatch(demoIndex, /Weekly Check-In|weekly-checkin/);
});
