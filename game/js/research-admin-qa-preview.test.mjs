import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');

test('QA resolver is admin-only, inactive, read-only, minimal, and fail-closed', async () => {
  const sql = await read('../../supabase/migrations/20260816000000_research_admin_game_qa_preview.sql');
  const rpc = sql.match(/create function public\.research_admin_game_preview[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(rpc, /security definer/);
  assert.match(rpc, /if not public\.is_research_admin\(\)/);
  assert.match(rpc, /c\.active = false[\s\S]*p\.active = false/);
  assert.match(rpc, /case_game_content/);
  assert.match(rpc, /match_count <> 1/);
  assert.doesNotMatch(rpc, /\b(update|insert|delete)\b/i);
  assert.doesNotMatch(rpc, /teacher_email|teacher_name|student_initials|case_intake|intake_requests/);
});

test('normal teacher activation gates remain unchanged and QA uses only the RPC', async () => {
  const auth = await read('./auth.js');
  assert.match(auth, /from\('participants'\)[\s\S]*?\.eq\('active', true\)/);
  assert.match(auth, /from\('cases'\)[\s\S]*?\.eq\('active', true\)/);
  assert.match(auth, /qa_case[\s\S]*?rpc\('research_admin_game_preview'/);
  assert.doesNotMatch(auth, /qa_case[\s\S]*?\.from\('participants'\)/);
});

test('QA telemetry is explicit on sessions and every response', async () => {
  const [sql, engine, app] = await Promise.all([
    read('../../supabase/migrations/20260816000000_research_admin_game_qa_preview.sql'), read('./engine.js'), read('./app.js')
  ]);
  assert.equal((sql.match(/add column qa_mode boolean not null default false/g) || []).length, 2);
  assert.match(engine, /sessionRow = \{[\s\S]*qa_mode: context\.qaMode === true/);
  assert.match(engine, /return \{[\s\S]*session_id:[\s\S]*qa_mode: context\.qaMode === true/);
  assert.match(app, /qaMode: assignment\.qaMode === true/);
});

test('QA UI is unmistakable, returns to admin, and does not hydrate reminders', async () => {
  const [html, app, reminders, admin] = await Promise.all([
    read('../index.html'), read('./app.js'), read('./reminders.js'), read('../../research-admin/admin.js')
  ]);
  assert.match(html, /RESEARCH ADMIN QA PREVIEW — NOT INTERVENTION/);
  assert.match(html, /Back to Research Admin/);
  assert.match(app, /if \(!assignment\.qaMode\) MR\.reminders\.hydrateControls\(\)/);
  assert.match(reminders, /qaMode[\s\S]*Reminders are unavailable/);
  assert.match(admin, /Preview Protected Game/);
  assert.match(admin, /QA only — does not activate teacher gameplay or reminders\. QA sessions are excluded from study data\./);
  assert.match(admin, /game\/\?qa_case=/);
});
