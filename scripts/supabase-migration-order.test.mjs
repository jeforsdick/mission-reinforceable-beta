import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const directory = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
const migrations = await Promise.all(files.map(async name => ({ name, sql: (await readFile(new URL(name, directory), 'utf8')).toLowerCase() })));
const onboardingName = '20260814020000_research_admin_onboarding.sql';
const onboardingIndex = files.indexOf(onboardingName);
const beforeOnboarding = migrations.slice(0, onboardingIndex).map(({ sql }) => sql).join('\n');

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

test('every onboarding defensive-assertion column exists before onboarding', () => {
  const onboarding = migrations[onboardingIndex].sql;
  const assertionBlock = onboarding.slice(0, onboarding.indexOf('create table public.research_onboarding_actions'));
  const required = [...assertionBlock.matchAll(/\('([a-z_]+)'(?:,\s*'([a-z_]+)')?\)/g)].map(([, firstName, secondName]) =>
    secondName ? [firstName, secondName] : ['intake_requests', firstName]);

  const declarations = {
    intake_requests: /create table if not exists public\.intake_requests\s*\([\s\S]*?\n\);/,
    cases: /create table if not exists public\.cases\s*\([\s\S]*?\n\);/,
    participants: /create table if not exists public\.participants\s*\([\s\S]*?\n\);/,
    case_intake: /create table public\.case_intake\s*\([\s\S]*?\n\);/
  };
  for (const [table, column] of required) {
    const createBody = beforeOnboarding.match(declarations[table])?.[0] || '';
    const added = new RegExp(`alter table public\\.${table}\\b[^;]*\\badd column if not exists ${column}\\b`).test(beforeOnboarding);
    assert.ok(new RegExp(`\\b${column}\\s+`).test(createBody) || added, `${table}.${column} must exist before ${onboardingName}`);
  }
});

test('legacy keys and foreign keys satisfy onboarding before it runs', () => {
  const bootstrap = migrations[0].sql;
  assert.match(bootstrap, /case_code text not null unique/);
  assert.match(bootstrap, /auth_user_id uuid not null unique references auth\.users\(id\)/);
  assert.match(bootstrap, /participant_code text not null unique/);
  assert.match(bootstrap, /case_id uuid not null references public\.cases\(id\)/);
});

test('legacy active defaults remain true while dissertation provisioning is explicitly inactive', () => {
  const bootstrap = migrations[0].sql;
  const cases = bootstrap.match(/create table if not exists public\.cases\s*\([\s\S]*?\n\);/)[0];
  const participants = bootstrap.match(/create table if not exists public\.participants\s*\([\s\S]*?\n\);/)[0];
  assert.match(cases, /active boolean not null default true/);
  assert.match(participants, /active boolean not null default true/);
  const onboarding = migrations[onboardingIndex].sql;
  assert.match(onboarding, /insert into public\.cases\(case_code, student_alias, active\)\s*values \(new_case_code, btrim\(student_game_alias\), false\)/);
  assert.match(onboarding, /insert into public\.participants\(auth_user_id, participant_code, case_id, active\)\s*values \(teacher\.id, study_id, created_case_id, false\)/);
});

test('case_intake lifecycle contract is canonical before onboarding', () => {
  assert.match(beforeOnboarding, /alter table public\.case_intake\s+add column if not exists status text not null default 'draft'/);
  assert.match(beforeOnboarding, /check \(status in \('draft', 'submitted'\)\)/);
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
  const repairIndex = files.indexOf('20260822030000_intake_schema_drift_repairs.sql');
  const beforeRepair = migrations.slice(0, repairIndex).map(({ sql }) => sql).join('\n');
  assert.match(beforeRepair, /research_onboarding_actions_action_type_check[\s\S]*?'intake_edited'/);
});
