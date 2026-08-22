import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const directory = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
const migrations = await Promise.all(files.map(async name => ({ name, sql: (await readFile(new URL(name, directory), 'utf8')).toLowerCase() })));

function first(pattern) {
  const migration = migrations.find(({ sql }) => pattern.test(sql));
  assert.ok(migration, `missing migration matching ${pattern}`);
  return migration.name;
}

test('foundational tables are created by the earliest migration before any later use', () => {
  const bootstrap = '20260812000000_legacy_schema_bootstrap.sql';
  assert.equal(files[0], bootstrap);
  for (const table of ['cases', 'participants', 'intake_requests', 'case_game_content']) {
    assert.equal(first(new RegExp(`create table if not exists public\\.${table}\\b`)), bootstrap, `${table} must be bootstrapped first`);
    const creator = migrations.findIndex(({ name }) => name === bootstrap);
    const laterReference = migrations.findIndex(({ name, sql }, index) => index > creator && name !== bootstrap && new RegExp(`public\\.${table}\\b`).test(sql));
    assert.ok(laterReference > creator, `${table} should be used after its definition`);
  }
});

test('profiles and is_research_admin are defined before later callers', () => {
  assert.equal(first(/create table public\.profiles\b/), '20260813000000_dissertation_schema_foundation.sql');
  assert.equal(first(/create function public\.is_research_admin\(\)/), '20260813000000_dissertation_schema_foundation.sql');
  const foundation = files.indexOf('20260813000000_dissertation_schema_foundation.sql');
  for (const [index, { name, sql }] of migrations.entries()) {
    if (index < foundation || name === files[foundation]) continue;
    if (/public\.profiles\b|public\.is_research_admin\(\)/.test(sql)) assert.ok(index > foundation, `${name} is ordered after security foundations`);
  }
});

test('bootstrap preserves least-privilege browser access', () => {
  const sql = migrations[0].sql;
  assert.match(sql, /enable row level security/g);
  assert.match(sql, /revoke all on table[\s\S]*from anon, authenticated/);
  assert.match(sql, /grant insert on table public\.intake_requests to anon, authenticated/);
  assert.doesNotMatch(sql, /grant (?:all|select|update|delete)[^;]*intake_requests[^;]* to anon/);
});

test('canonical intake repair removes drift without widening RPC execution', () => {
  const repair = migrations.find(({ name }) => name === '20260822030000_intake_schema_drift_repairs.sql').sql;
  assert.match(repair, /drop constraint if exists case_intake_submission_complete/);
  assert.match(repair, /supplied\(field_name\)/);
  assert.doesNotMatch(repair, /\bas keys\(key\)/);
  assert.match(repair, /if not public\.is_research_admin\(\)/);
  assert.match(repair, /revoke all on function public\.research_admin_update_intake\(uuid,jsonb\) from public/);
  assert.match(repair, /grant execute on function public\.research_admin_update_intake\(uuid,jsonb\) to authenticated/);
});
