import assert from 'node:assert/strict';
import fs from 'node:fs';

const historicalMigration = fs.readFileSync(new URL('../supabase/migrations/20260818030000_mission_bank_comparability_reviews.sql', import.meta.url), 'utf8');
const cleanupMigration = fs.readFileSync(new URL('../supabase/migrations/20260819020000_research_admin_cleanup_2a.sql', import.meta.url), 'utf8');
const activeClient = ['admin.js','admin-model.mjs','operations-model.mjs','operations-ui.mjs','case-report.mjs']
  .map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const activeUi = ['admin.js','operations-ui.mjs','case-report.mjs']
  .map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');

// Audit-compatible database history stays intact; retirement occurs only in the additive cleanup migration.
assert.match(historicalMigration, /create table public\.mission_bank_comparability_reviews/);
assert.match(historicalMigration, /research_admin_submit_mission_bank_comparability_review/);
assert.doesNotMatch(historicalMigration, /drop table public\.mission_bank_comparability_reviews/i);
assert.match(cleanupMigration, /drop table if exists public\.mission_bank_comparability_reviews/i);
assert.doesNotMatch(cleanupMigration.slice(cleanupMigration.indexOf('create or replace function public.research_admin_case_readiness'), cleanupMigration.indexOf('-- Remove retired RPCs')), /comparability_ready|mission_bank_comparability/i);

// The current Research Admin workflow neither consumes nor displays the retired feature.
assert.doesNotMatch(activeClient, /comparability_ready|mission_bank_comparability|research_admin_submit_mission_bank_comparability_review/i);
assert.doesNotMatch(activeUi, /Mission Bank Comparability|Mission Review|Comparability|comparability/i);
console.log('Comparability is absent from the active client and its database objects are retired by an additive migration.');
