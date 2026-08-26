import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const path = new URL('./pre-study-fake-case-cleanup.sql', import.meta.url);
const sql = readFileSync(path, 'utf8');

test('cleanup has an explicit allowlist and protects both reserved fixture pairs', () => {
  for (const code of ['CASE-998', 'MR-998', 'CASE-DEMO-2', 'MR-DEMO-2']) {
    assert.match(sql, new RegExp(`protected[^\\n]*${code.replaceAll('-', '\\-')}|${code.replaceAll('-', '\\-')}[^\\n]*protected`, 'i'));
  }
  assert.match(sql, /cleanup_case_allowlist/);
  assert.match(sql, /\('CASE-999', 'MR-999', '[^']+'\)/);
  assert.doesNotMatch(sql, /delete\s+from[\s\S]{0,160}(?:<>|!=|not\s+in)\s*\(?\s*['"]CASE-998/i);
});

test('cleanup is preview-first, transactional, verified, and rollback-by-default', () => {
  assert.ok(sql.search(/select-only full inventory/i) < sql.search(/begin\s*;/i));
  assert.match(sql, /begin\s*;[\s\S]*rollback\s*;\s*$/i);
  assert.match(sql, /protected_mr_998_exists/);
  assert.match(sql, /protected_mr_demo_2_exists/);
  assert.match(sql, /targeted_obsolete_cases_gone/);
  assert.match(sql, /orphan_participant_case_references/);
});

test('full inventory reports every requested field without authorizing deletion', () => {
  const inventory = sql.slice(sql.search(/select-only full inventory/i), sql.search(/select-only destructive-allowlist preview/i));
  for (const field of ['case_id', 'case_code', 'participant_id', 'participant_code', 'teacher_email', 'current_phase', 'case_created_at', 'participant_created_at', 'has_gameplay', 'has_protected_content']) {
    assert.match(inventory, new RegExp(`\\b${field}\\b`, 'i'));
  }
  assert.match(inventory, /CASE-998[\s\S]*MR-998/);
  assert.match(inventory, /CASE-DEMO-2[\s\S]*MR-DEMO-2/);
  assert.doesNotMatch(inventory, /delete\s+from/i);
});

test('cleanup never deletes Auth users or profiles and is not a migration', () => {
  assert.doesNotMatch(sql, /delete\s+from\s+(?:auth[.]users|public[.]profiles|profiles)\b/i);
  assert.match(sql, /never deletes profiles or auth[.]users/i);
  assert.doesNotMatch(path.pathname, /supabase\/migrations/);
});

test('every persistent table and trigger named by cleanup exists in the final migration schema', () => {
  const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url);
  const migrations = readdirSync(migrationsDirectory)
    .filter(name => name.endsWith('.sql')).sort()
    .map(name => readFileSync(new URL(name, migrationsDirectory), 'utf8')).join('\n');

  const finalTables = new Set();
  const tableChanges = /(?:create\s+table(?:\s+if\s+not\s+exists)?|drop\s+table(?:\s+if\s+exists)?)\s+public[.]([a-z0-9_]+)/gi;
  for (const match of migrations.matchAll(tableChanges)) {
    if (/^create/i.test(match[0])) finalTables.add(match[1]);
    else finalTables.delete(match[1]);
  }
  const referencedTables = new Set([...sql.matchAll(/(?:from|join|update|into|table)\s+public[.]([a-z0-9_]+)/gi)].map(match => match[1]));
  for (const table of referencedTables) assert.ok(finalTables.has(table), `cleanup references non-current table public.${table}`);

  const finalTriggers = new Set();
  const triggerChanges = /(?:create\s+trigger|drop\s+trigger(?:\s+if\s+exists)?)\s+([a-z0-9_]+)/gi;
  for (const match of migrations.matchAll(triggerChanges)) {
    if (/^create/i.test(match[0])) finalTriggers.add(match[1]);
    else finalTriggers.delete(match[1]);
  }
  // Operations and observation migrations create their per-table no-delete
  // triggers through a PL/pgSQL foreach array rather than literal DDL.
  for (const block of migrations.matchAll(/foreach\s+\w+\s+in\s+array\s+array\[([^\]]+)\][\s\S]{0,300}?create\s+trigger\s+%I_no_delete/gi)) {
    for (const item of block[1].matchAll(/'([a-z0-9_]+)'/gi)) finalTriggers.add(`${item[1]}_no_delete`);
  }
  const referencedTriggers = new Set([...sql.matchAll(/(?:disable|enable)\s+trigger\s+([a-z0-9_]+)/gi)].map(match => match[1]));
  for (const trigger of referencedTriggers) assert.ok(finalTriggers.has(trigger), `cleanup references non-current trigger ${trigger}`);

  for (const retired of ['weekly_teacher_checkins', 'mission_bank_comparability_reviews', 'research_classroom_observation_records', 'research_classroom_ioa_results']) {
    assert.doesNotMatch(sql, new RegExp(`public[.]${retired}\\b`, 'i'));
  }
});
