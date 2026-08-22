import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');

test('published, individual draft, and full draft QA retain distinct authorization routes', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /research_admin_full_draft_game_preview/);
  assert.match(auth, /research_admin_draft_game_preview/);
  assert.match(auth, /research_admin_game_preview/);
  assert.match(auth, /qaDraft && fullDraftQa/);
});

test('Full Draft loader uses latest saved setup, strict resources, every sorted mission, and null version', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /async function fullDraftGameContent/);
  assert.match(auth, /research_admin_game_authoring_workspace/);
  assert.match(auth, /No saved Resource Map draft exists for Full Draft QA/);
  assert.match(auth, /sort\(\(a, b\) => Number\(a\.slot_number\) - Number\(b\.slot_number\)\)/);
  assert.match(auth, /daily_missions: group\('daily'\), wildcard_missions: group\('wild'\), crisis_missions: group\('crisis'\), version: null/);
  assert.match(auth, /studentAlias: alias, bipBriefing: setup\.bipBriefing/);
  assert.match(auth, /weeklyTeacherReport/);
});

test('Full Draft QA uses QA telemetry, strict Resource Map behavior, home screen, and unpublished banner', async () => {
  const [app, resources] = await Promise.all([read('./app.js'), read('./resources.js')]);
  assert.match(app, /qaMode: assignment\.qaMode === true/);
  assert.match(app, /fullDraftQa: assignment\.fullDraftQa === true/);
  assert.match(app, /FULL DRAFT QA PREVIEW · Not published/);
  assert.match(app, /renderHome\(\);\s*MR\.setScreen\('home'\)/);
  assert.doesNotMatch(app, /assignment\.fullDraftQa\) MR\.engine\.start/);
  assert.match(resources, /draftQa === true && MR\.telemetryContext\?\.fullDraftQa !== true/);
});

test('participant runtime remains active-assignment and published-content only', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /activeParticipant[\s\S]*\.eq\('active', true\)/);
  assert.match(auth, /activeCase[\s\S]*\.eq\('active', true\)/);
  assert.match(auth, /async getGameContent\(caseId\)[\s\S]*protectedGameContent/);
});
