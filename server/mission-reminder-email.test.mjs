import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildMissionReminderEmail } = require('./mission-reminder-email');
const gameUrl = 'https://missionreinforceable.com/game/';

test('Daily email uses the shared edge-to-edge header and preserves its complete bodies', () => {
  const email = buildMissionReminderEmail(gameUrl, 'Pat Example');

  assert.match(email.html, /email-header-banner\.png/);
  assert.match(email.html, /email-header-banner\.png[^>]+width="600" alt="Mission: Reinforceable" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/);
  assert.doesNotMatch(email.html, /mission-reinforceable-title\.png/);
  assert.match(email.html, /YOUR DAILY MISSION AWAITS/);
  assert.match(email.html, /landing-page-classroom\.png/);
  assert.match(email.html, /<!--\[if mso\]><v:roundrect[\s\S]+START TODAY'S MISSION/);
  assert.equal(email.ctaUrl, gameUrl);
  assert.match(email.html, new RegExp(`href="${gameUrl.replaceAll('.', '\\.')}"`));
  assert.match(email.html, /<!doctype html>[\s\S]*<\/html>$/i);
  assert.match(email.text, /MISSION: REINFORCEABLE[\s\S]*YOUR DAILY MISSION AWAITS[\s\S]*START TODAY'S MISSION: https:\/\/missionreinforceable\.com\/game\/[\s\S]*Mission: Reinforceable is a research project/);
});
