import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');

test('locked participant return screen shows tomorrow copy and keeps replay controls hidden', () => {
  assert.match(app, /Come back tomorrow to play another mission!/);
  assert.match(app, /ensureReturnTomorrowBubble\(\)\.hidden = !participantLocked/);
  assert.match(app, /#home-primary-btn'\)\.hidden = participantLocked/);
  assert.match(app, /mission-menu \[data-start-mode\][\s\S]*button\.hidden = participantLocked/);
});

test('return-tomorrow bubble is limited to non-QA participant lock state', () => {
  assert.match(app, /const participantLocked = hasDaily && MR\.telemetryContext && !MR\.telemetryContext\.qaMode/);
});
