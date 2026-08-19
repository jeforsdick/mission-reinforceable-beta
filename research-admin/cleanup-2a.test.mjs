import assert from 'node:assert/strict';
import fs from 'node:fs';

const cleanup = fs.readFileSync(new URL('../supabase/migrations/20260819020000_research_admin_cleanup_2a.sql', import.meta.url), 'utf8');
const operations = fs.readFileSync(new URL('../supabase/migrations/20260818060000_research_operations_foundation.sql', import.meta.url), 'utf8');
const observations = fs.readFileSync(new URL('../supabase/migrations/20260819010000_classroom_observation_summaries.sql', import.meta.url), 'utf8');
const legacy = fs.readFileSync(new URL('../supabase/migrations/20260818070000_classroom_observations_ioa.sql', import.meta.url), 'utf8');
const activeClient = ['admin.js', 'admin-model.mjs', 'operations-model.mjs', 'operations-ui.mjs', 'case-report.mjs']
  .map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');

// Readiness/dashboard replacements precede explicit comparability removal.
const readiness = cleanup.slice(cleanup.indexOf('create or replace function public.research_admin_case_readiness'), cleanup.indexOf('create or replace function public.research_admin_operations_dashboard'));
const dashboard = cleanup.slice(cleanup.indexOf('create or replace function public.research_admin_operations_dashboard'), cleanup.indexOf('-- Remove retired RPCs'));
for (const payload of [readiness, dashboard]) assert.doesNotMatch(payload, /comparability_ready|mission_bank_comparability|comparability status|comparability history/i);
assert.ok(cleanup.indexOf('create or replace function public.research_admin_case_readiness') < cleanup.indexOf('drop table if exists public.mission_bank_comparability_reviews'));
assert.match(cleanup, /drop policy if exists "Research admins read comparability reviews"/);
assert.match(cleanup, /drop index if exists public\.mission_bank_comparability_reviews_lookup/);
assert.match(cleanup, /drop table if exists public\.mission_bank_comparability_reviews/);
assert.match(cleanup, /drop function if exists public\.research_admin_submit_mission_bank_comparability_review\(uuid, integer, jsonb, text, boolean\)/);
assert.doesNotMatch(activeClient, /comparability_ready|mission_bank_comparability|research_admin_submit_mission_bank_comparability_review/i);

// Retired RPC cleanup must also work in installations where the wrappers never existed.
const retiredRpcCleanup = cleanup.slice(cleanup.indexOf('-- Remove retired RPCs'), cleanup.indexOf('-- The comparability table'));
for (const signature of [
  'research_admin_submit_mission_bank_comparability_review\\(uuid, integer, jsonb, text, boolean\\)',
  'research_admin_swap_case_protocol_positions\\(uuid, uuid\\)',
  'research_admin_record_classroom_observation\\(uuid, date, uuid, jsonb, jsonb, uuid, time, time, text, text\\)',
]) {
  assert.match(retiredRpcCleanup, new RegExp(`drop function if exists public\\.${signature}`));
}
assert.doesNotMatch(retiredRpcCleanup, /revoke\s+all\s+on\s+function/i);

// Table-local operations that require the table are guarded; final drops remain idempotent.
const comparabilityTableCleanup = cleanup.slice(cleanup.indexOf('-- The comparability table'));
assert.match(comparabilityTableCleanup, /if to_regclass\('public\.mission_bank_comparability_reviews'\) is not null then[\s\S]*drop policy if exists[\s\S]*revoke all on table[\s\S]*end if;/i);
assert.doesNotMatch(cleanup, /\bdrop\b[^;\n]*\bcascade\b/i);

// Only the three live, version-bound protected-content signoffs remain valid.
const signoff = cleanup.slice(cleanup.indexOf('create or replace function public.research_admin_record_case_signoff'), cleanup.indexOf('-- Replace JSON-producing functions'));
for (const type of ['resource_behavior_review', 'resource_privacy_review', 'resource_qa_preview']) assert.match(signoff, new RegExp(type));
assert.doesNotMatch(signoff, /comparability/i);
assert.match(cleanup, /delete from public\.case_protected_content_signoffs[\s\S]*review_type = 'mission_bank_comparability'/);

// Swapping is retired; initial assignment and its baseline freeze remain unchanged.
assert.match(cleanup, /drop function if exists public\.research_admin_swap_case_protocol_positions\(uuid, uuid\)/);
const assignment = operations.slice(operations.indexOf('create function public.research_admin_set_case_protocol'), operations.indexOf('create function public.research_admin_swap_case_protocol_positions'));
assert.match(assignment, /insert into public\.research_case_protocol/);
assert.match(assignment, /planned_baseline_observations/);
assert.match(assignment, /phase='baseline'[\s\S]*cannot be corrected after baseline has begun/);

// The unused unified wrapper is removed, while the summary path and its creator stay.
assert.match(cleanup, /drop function if exists public\.research_admin_record_classroom_observation\(uuid, date, uuid, jsonb, jsonb, uuid, time, time, text, text\)/);
assert.match(observations, /create function public\.research_admin_record_classroom_observation_summary/);
assert.match(observations, /research_admin_create_classroom_observation/);
assert.match(observations, /create function public\.research_admin_create_legacy_observation_summary/);
assert.match(observations, /create function public\.research_admin_revise_classroom_observation_summary/);

// Cleanup 2A preserves raw schema, legacy correction, dashboard fallback, and IOA status.
for (const table of ['research_classroom_observations', 'research_classroom_observation_records', 'research_classroom_ioa_results']) {
  assert.match(legacy, new RegExp(`create table public\\.${table}`));
  assert.doesNotMatch(cleanup, new RegExp(`drop table(?: if exists)? public\\.${table}`));
}
assert.match(legacy, /fidelity_scores jsonb not null, student_intervals jsonb not null/);
assert.match(observations, /coalesce\(cs\.teacher_fidelity_percent,pr\.teacher_fidelity_percent\)/);
assert.match(observations, /current_ioa[\s\S]*research_classroom_ioa_results/);
assert.match(observations, /create or replace function public\.research_observer_status/);
assert.match(observations, /current_ioa[\s\S]*current_summaries[\s\S]*recalibration_required/);

console.log('Cleanup 2A database retirement and legacy-preservation checks passed.');
