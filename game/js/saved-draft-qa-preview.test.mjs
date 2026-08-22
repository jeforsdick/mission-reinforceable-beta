import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');

test('draft loading is gated by QA assignment and uses the Research Admin workspace', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /assignment\.qaMode !== true \|\| !assignment\.qaDraft/);
  assert.match(auth, /rpc\('research_admin_game_authoring_workspace'/);
  assert.match(auth, /\['daily', 'wild', 'crisis'\]\.includes\(type\)/);
  assert.match(auth, /invalid mission slot/);
  assert.match(auth, /No saved \$\{assignment\.qaDraft\.type\} mission draft exists/);
});

test('published and saved-draft QA use separate assignment resolvers with draft metadata', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /qaDraft[\s\S]*rpc\('research_admin_draft_game_preview'/);
  assert.match(auth, /: await supabaseClient\.rpc\('research_admin_game_preview'/);
  assert.match(auth, /target_mission_type: qaDraft\.type/);
  assert.match(auth, /target_slot_number: qaDraft\.slot/);
  assert.match(auth, /qaDraft\s*\n\s*\};/);
});

test('temporary content has one selected pool, published presentation data, and null version', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /Object\.assign\(\{\}, published\?\.config \|\| \{\}/);
  assert.match(auth, /setup\.bipBriefing[\s\S]*config\.bipBriefing = setup\.bipBriefing/);
  assert.match(auth, /resources: published\?\.resources \|\| null/);
  for (const pool of ['daily_missions', 'wildcard_missions', 'crisis_missions']) assert.match(auth, new RegExp(`${pool}: \\[\\]`));
  assert.match(auth, /\] = \[mission\]/);
  assert.match(auth, /version: null/);
  assert.doesNotMatch(auth, /from\('case_game_content'\)[\s\S]{0,300}\.(?:insert|update|delete)\(/);
  assert.doesNotMatch(auth, /localStorage/);
});

test('ordinary content remains published-only and only saved-draft QA auto-starts', async () => {
  const [auth, app] = await Promise.all([read('./auth.js'), read('./app.js')]);
  assert.match(auth, /async getGameContent\(caseId\) \{\s*return protectedGameContent\(client\(\), caseId\);/);
  assert.match(app, /assignment\.qaDraft[\s\S]*getDraftGameContent[\s\S]*getGameContent/);
  assert.match(app, /assignment\.qaMode === true && assignment\.qaDraft\) MR\.engine\.start\(assignment\.qaDraft\.type\)/);
  assert.doesNotMatch(app, /if \(assignment\.qaMode === true\) MR\.engine\.start/);
  assert.match(app, /gameContentVersion: null/);
});

test('draft banner identifies unpublished mode without narrative content', async () => {
  const [html, app] = await Promise.all([read('../index.html'), read('./app.js')]);
  assert.match(html, /id="draft-qa-preview-banner"/);
  assert.match(app, /DRAFT QA PREVIEW — \$\{label\} \$\{assignment\.qaDraft\.slot\} · Not published/);
});
