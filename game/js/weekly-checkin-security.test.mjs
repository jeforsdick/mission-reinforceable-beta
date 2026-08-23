import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const legacy = await readFile(new URL('../../supabase/migrations/20260818020000_weekly_teacher_checkins.sql', import.meta.url), 'utf8');
const report = await readFile(new URL('../../supabase/migrations/20260818050000_june29_weekly_teacher_report.sql', import.meta.url), 'utf8');
const retirement = await readFile(new URL('../../supabase/migrations/20260823000000_retire_mr_weekly_teacher_report.sql', import.meta.url), 'utf8');

test('historical weekly-report migrations remain append-only and retirement is later', () => {
  assert.match(legacy, /create table public\.weekly_teacher_checkins/);
  assert.match(report, /create function public\.submit_weekly_teacher_report/);
  assert.match(retirement, /drop function if exists public\.submit_weekly_teacher_report/);
  assert.match(retirement, /drop table if exists public\.weekly_teacher_checkins/);
});

test('procedural-fidelity evidence no longer depends on retired response storage', () => {
  assert.match(retirement, /create or replace function public\.research_admin_procedural_fidelity_evidence/);
  assert.match(retirement, /'qualtrics_weekly_report'/);
  const replacement = retirement.slice(0, retirement.indexOf('drop function if exists'));
  assert.doesNotMatch(replacement, /weekly_teacher_checkins/);
});
