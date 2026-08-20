import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const server = require('../server/granite-study-calendar.js');
const context = { window: { MR: {} }, Date, Set };
vm.runInNewContext(fs.readFileSync(new URL('../game/js/study-calendar.js', import.meta.url), 'utf8'), context);
const browser = context.window.MR.studyCalendar;
const addDay = key => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

assert.equal(server.START_DATE, browser.startDate);
assert.equal(server.END_DATE, browser.endDate);
for (let key = '2026-08-01'; key <= '2027-06-05'; key = addDay(key)) {
  assert.equal(server.isEligibleStudyDay(key), browser.isEligibleStudyDay(key), `calendar mismatch on ${key}`);
}
for (const key of ['2026-08-17', '2026-08-21']) assert.equal(server.isEligibleStudyDay(key), true);
for (const key of [
  '2026-08-08', '2026-08-09', '2026-09-07', '2026-10-15', '2026-10-16',
  '2026-11-25', '2026-11-26', '2026-11-27', '2026-12-21', '2027-01-01',
  '2027-01-18', '2027-03-29', '2027-04-05', '2026-08-11', '2027-05-27'
]) assert.equal(server.isEligibleStudyDay(key), false, `${key} should be ineligible`);

console.log('Server and browser Granite calendars agree across the full study range and boundaries.');
