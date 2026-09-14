import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildWeeklyRecapEmail, weeklyGreetingName } = require('./weekly-recap-email');
const url = 'https://educationutah.co1.qualtrics.com/jfe/form/SV_9MsIT9TZXCdeIWa?StudyID=MR-998&target=ask%20for%20help';
const zeroSummary = { missions_completed: 0, days_practiced: 0, eligible_study_days: 4, mission_mix: { daily: 0, mystery: 0, crisis: 0 }, xp_available: false, behavior_plan_xp: null };
const build = (summary, teacherName = 'Pat Example') => buildWeeklyRecapEmail({ summary, weeklyQualtricsUrl: url, teacherName, assetOrigin: 'https://missionreinforceable.com/game/' });
const readable = body => body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('honorific names never treat a possible surname as a first name', () => {
  for (const name of ['Mrs. Dwyer', 'Mr. Jones', 'Ms. Smith', 'Dr. Patel', 'Dr. Pat Example']) {
    assert.equal(weeklyGreetingName(name), null);
    const email = build(zeroSummary, name);
    assert.match(email.html, /Hey, Hero!/);
    assert.match(email.text, /Hey, Hero!/);
  }
  assert.doesNotMatch(build(zeroSummary, 'Mrs. Dwyer').html, /Hello, Dwyer|Hey, Dwyer/);
});

test('genuine first names safely personalize the playful greeting', () => {
  assert.equal(weeklyGreetingName('Pat Example'), 'Pat');
  assert.equal(weeklyGreetingName("O’Malley"), "O’Malley");
  assert.match(build(zeroSummary, 'Pat Example').html, /Hey, Pat!/);
  assert.match(build(zeroSummary, 'Pat Example').text, /Hey, Pat!/);
  assert.match(build(zeroSummary, '<Pat>').html, /Hey, Pat!/);
});

test('zero-mission email is neutral, complete, and hides mission mix', () => {
  const email = build(zeroSummary);
  for (const source of [email.html, email.text]) {
    const body = readable(source);
    assert.match(body, /0 Missions Completed/);
    assert.match(body, /0 of 4 Days Practiced/);
    assert.match(body, /Every week is different\./);
    assert.match(body, /Your brief weekly check-in is ready below\./);
    assert.doesNotMatch(body, /YOUR MISSION MIX|0 Daily/);
    assert.match(body, /ONE LAST QUEST FOR THE WEEK/);
    assert.match(body, /COMPLETE WEEKLY CHECK-IN/);
    assert.match(body, /Thank you for being a hero in your student's journey!/);
    assert.match(body, /Every mission makes a difference\./);
    assert.match(body, /Mission: Reinforceable is a research project/);
  }
  for (const asset of ['mission-reinforceable-title.png', 'wizard-success.png', 'keep-going-sign.png', 'heart-icon.png', 'sparkle-icon.png', 'hat-icon.png']) {
    assert.ok(email.html.includes(asset), `${asset} should appear in a zero-mission recap`);
  }
  assert.match(email.html, /<!doctype html>/i);
  assert.match(email.html, /<\/html>$/);
  assert.match(email.text, /MISSION: REINFORCEABLE[\s\S]*COMPLETE WEEKLY CHECK-IN:[\s\S]*Every mission makes a difference\./);
});

test('active email shows mission mix, positive neutral copy, eligible-day denominator, and game assets', () => {
  const email = build({ ...zeroSummary, missions_completed: 4, days_practiced: 3, mission_mix: { daily: 2, mystery: 1, crisis: 1 } });
  for (const source of [email.html, email.text]) {
    const body = readable(source);
    assert.match(body, /4 Missions Completed/);
    assert.match(body, /3 of 4 Days Practiced/);
    assert.match(body, /YOUR MISSION MIX/);
    assert.match(body, /2 Daily/);
    assert.match(body, /1 Mystery/);
    assert.match(body, /1 Crisis/);
    assert.match(body, /Another week of practice in the books!/);
    assert.match(body, /Every mission is another chance to practice your student(?:'|&#39;)s behavior support plan\./);
  }
  for (const asset of ['mission-reinforceable-title.png', 'wizard-success.png', 'keep-going-sign.png', 'heart-icon.png', 'sparkle-icon.png', 'hat-icon.png', 'daily-mission-icon.png', 'mystery-mission-icon.png', 'crisis-mission-icon.png']) assert.ok(email.html.includes(asset));
});

test('HTML and plain text preserve the stored Qualtrics URL unchanged', () => {
  const email = build(zeroSummary);
  assert.equal(email.ctaUrl, url);
  assert.ok(email.text.includes(url));
  assert.ok(email.html.includes(url.replaceAll('&', '&amp;')));
  assert.match(email.html, /<!--\[if mso\]><v:roundrect/);
  assert.match(email.html, /COMPLETE WEEKLY CHECK-IN &#8594;/);
});

test('missing link prevents weekly email construction', () => {
  assert.throws(() => buildWeeklyRecapEmail({ summary: zeroSummary, weeklyQualtricsUrl: null, teacherName: 'Pat', assetOrigin: 'https://missionreinforceable.com' }), /required/);
});

test('approved Daily email builder remains untouched by this polish', () => {
  const { buildMissionReminderEmail } = require('./mission-reminder-email');
  const daily = buildMissionReminderEmail('https://missionreinforceable.com/game/', 'Pat Example');
  assert.match(daily.html, /YOUR DAILY MISSION AWAITS/);
  assert.match(daily.html, /Good morning, Pat!/);
  assert.match(daily.text, /START TODAY'S MISSION: https:\/\/missionreinforceable\.com\/game\//);
});
