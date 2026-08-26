import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.ok(sql.search(/select-only preview/i) < sql.search(/begin\s*;/i));
  assert.match(sql, /begin\s*;[\s\S]*rollback\s*;\s*$/i);
  assert.match(sql, /protected_mr_998_exists/);
  assert.match(sql, /protected_mr_demo_2_exists/);
  assert.match(sql, /targeted_obsolete_cases_gone/);
  assert.match(sql, /orphan_participant_case_references/);
});

test('cleanup never deletes Auth users or profiles and is not a migration', () => {
  assert.doesNotMatch(sql, /delete\s+from\s+(?:auth[.]users|public[.]profiles|profiles)\b/i);
  assert.match(sql, /never deletes profiles or auth[.]users/i);
  assert.doesNotMatch(path.pathname, /supabase\/migrations/);
});
