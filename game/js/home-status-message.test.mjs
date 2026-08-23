import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const index = await read('../index.html');
const app = await read('./app.js');

test('home has one dedicated calendar status bubble and no retired status elements', () => {
  for (const id of ['daily-completion-message', 'no-mission-message', 'same-day-return-message']) {
    assert.doesNotMatch(index, new RegExp(`id=["']${id}["']`));
  }
  assert.equal((index.match(/id="home-status-bubble"/g) || []).length, 1);
  assert.match(index, /id="home-status-bubble"[^>]*hidden[^>]*>No mission today\. Come back on your next school day!</);
});

test('retired header and same-day overlay copy is absent', () => {
  assert.doesNotMatch(index, /Today's Mission: Reinforceable practice is complete/);
  assert.doesNotMatch(index, /No mission scheduled today/);
  assert.doesNotMatch(index, /Come back tomorrow to play another mission/);
});

test('status bubble visibility follows the home-state priority', () => {
  const isVisible = ({ calendarBlocked, participantLocked }) => calendarBlocked && !participantLocked;
  assert.equal(isVisible({ calendarBlocked: true, participantLocked: false }), true, 'real participant on non-study day');
  assert.equal(isVisible({ calendarBlocked: false, participantLocked: false }), false, 'normal eligible day');
  assert.equal(isVisible({ calendarBlocked: true, participantLocked: true }), false, 'same-day completion takes priority');
  assert.equal(isVisible({ calendarBlocked: false, participantLocked: false }), false, 'Kai calendar bypass');
  assert.match(app, /const showCalendarStatus = calendarBlocked && !participantLocked;/);
  assert.match(app, /#home-status-bubble'\)\.hidden = !showCalendarStatus/);
});

test('calendar and completion gates continue to hide every mission start control', () => {
  assert.match(app, /#home-primary-btn'\)\.hidden = participantLocked \|\| calendarBlocked/);
  assert.match(app, /button\.hidden = participantLocked \|\| calendarBlocked/);
  assert.match(app, /!MR\.telemetryContext\.demoCalendarBypass[\s\S]*!MR\.studyCalendar\.isEligibleStudyDay\(\)/);
});
