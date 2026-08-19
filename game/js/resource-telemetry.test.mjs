import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const authSource = read('./auth.js');
const appSource = read('./app.js');
const migration = read('../../supabase/migrations/20260819050000_resource_usage_telemetry.sql');

function authHarness(telemetryContext) {
  const inserts = [];
  let clients = 0;
  const client = { from(table) { return { async insert(row) { inserts.push({ table, row }); return { error: null }; } }; } };
  const MR = { telemetryContext };
  const window = {
    MR,
    supabase: { createClient() { clients += 1; return client; } }
  };
  vm.runInNewContext(authSource, { window, URLSearchParams, FormData });
  return { MR, inserts, get clients() { return clients; } };
}

test('resource event client uses only authenticated telemetry context and database timestamp', async () => {
  const participant = authHarness({ participantId: 'participant', caseId: 'case', qaMode: false, gameContentVersion: 7 });
  assert.equal(await participant.MR.auth.recordResourceEvent('resources_opened'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(participant.inserts[0])), { table: 'game_resource_events', row: {
    participant_id: 'participant', case_id: 'case', event_name: 'resources_opened', section_key: null,
    game_content_version: 7, qa_mode: false
  } });
  assert.equal('occurred_at' in participant.inserts[0].row, false);

  const qa = authHarness({ participantId: 'qa-participant', caseId: 'qa-case', qaMode: true, gameContentVersion: 9 });
  await qa.MR.auth.recordResourceEvent('resource_section_opened', 'coaching');
  assert.equal(qa.inserts[0].row.qa_mode, true);
});

test('missing telemetry context performs no Supabase client call or insert', async () => {
  const demo = authHarness(null);
  assert.equal(await demo.MR.auth.recordResourceEvent('resources_opened'), false);
  assert.equal(demo.clients, 0);
  assert.deepEqual(demo.inserts, []);
});

test('only the explicit authenticated Resources click records resources_opened', () => {
  const clickHandler = appSource.match(/MR\.\$\('#nav-resources'\)\.addEventListener\('click',[\s\S]*?\n    \}\);/)?.[0] || '';
  assert.match(clickHandler, /recordResourceEvent\('resources_opened'\)/);
  assert.match(clickHandler, /MR\.resources\.render\(\)/);
  assert.match(clickHandler, /console\.warn/);
  assert.doesNotMatch(appSource.match(/async function init\(\)[\s\S]*?\n  \}\n\n  document/)?.[0] || '', /recordResourceEvent/);
});

test('migration defines privacy-minimal append-only RLS contract', () => {
  assert.match(migration, /create table public\.game_resource_events/i);
  assert.match(migration, /event_name in \('resources_opened', 'resource_section_opened'\)/i);
  for (const key of ['bip', 'functionForest', 'prevention', 'replacement', 'reinforcement', 'errorCorrection', 'library', 'coaching', 'fidelity']) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.match(migration, /foreign key \(participant_id, case_id\)[\s\S]*references public\.participants\(id, case_id\)/i);
  assert.match(migration, /qa_mode boolean not null default false/i);
  assert.match(migration, /alter table public\.game_resource_events enable row level security/i);
  assert.match(migration, /owns_active_participant_case\(participant_id, case_id\)/i);
  assert.match(migration, /Research admins create QA resource events[\s\S]*qa_mode = true[\s\S]*p\.active = false[\s\S]*c\.active = false/i);
  assert.match(migration, /Assigned coaches read participant resource events[\s\S]*for select[\s\S]*is_active_case_coach\(case_id\)/i);
  assert.doesNotMatch(migration, /for (update|delete)|on delete cascade/i);
  assert.match(migration, /grant select, insert[^;]+authenticated/i);
  assert.doesNotMatch(migration, /grant[^;]*(update|delete)/i);
});
