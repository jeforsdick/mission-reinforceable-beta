import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readinessForCase } from './admin-model.mjs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260818010000_prepared_case_signoffs.sql', import.meta.url), 'utf8');
const adminJs = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');

// Only active research admins can write; direct table mutation is unavailable.
assert.match(migration, /if not public\.is_research_admin\(\) then[\s\S]*research admin required/);
assert.match(migration, /revoke all on table public\.case_protected_content_signoffs from anon, authenticated/);
assert.doesNotMatch(migration, /grant (?:insert|update|delete|all) on table public\.case_protected_content_signoffs/i);
assert.match(migration, /reviewed_by uuid not null references public\.profiles/);

// Evidence is append-only, version-bound, and checked against the current row.
assert.match(migration, /protected_content_version integer not null/);
assert.match(migration, /target_protected_content_version is distinct from current_version/);
assert.doesNotMatch(migration, /(?:update|delete from) public\.case_protected_content_signoffs/i);

// Resource readiness requires schema v1, all nine keys, and each human review.
assert.match(migration, /gc\.resources->'schemaVersion' = '1'::jsonb/);
for (const key of ['bip','functionForest','prevention','replacement','reinforcement','errorCorrection','library','coaching','fidelity']) assert.match(migration, new RegExp(`'${key}'`));
for (const type of ['resource_behavior_review','resource_privacy_review','resource_qa_preview']) assert.match(migration, new RegExp(`review_type = '${type}'`));
assert.ok(migration.indexOf("'Needs behavioral review'") < migration.indexOf("'Needs privacy review'"));
assert.ok(migration.indexOf("'Needs privacy review'") < migration.indexOf("'Needs QA'"));

// Comparability is solely an explicit human signoff, never structural metrics.
const comparison = migration.slice(migration.indexOf("'mission_bank_comparability', jsonb_build_object"));
assert.match(comparison, /review_type = 'mission_bank_comparability'/);
assert.doesNotMatch(comparison, /(?:count|quota|target|mission|route|fidelity)_count/i);

// RPC emits only status booleans/metadata, never Resource Map prose or reviewer identity.
const readiness = migration.slice(migration.indexOf('create or replace function public.research_admin_case_readiness'));
assert.doesNotMatch(readiness, /reviewed_(?:by|at)|blocks|studentAlias|resources->'sections'->/);
assert.doesNotMatch(readiness, /gc\.resources\s*[,)]/);

// The existing activation/reminder states remain untouched, and UI makes version explicit.
assert.doesNotMatch(migration, /update public\.(?:cases|participants|teacher_reminder_settings)/i);
assert.match(adminJs, /Resource Map/);
assert.match(adminJs, /Mission review/);
assert.match(adminJs, /Approving protected content <strong>version/);
assert.match(adminJs, /research_admin_record_case_signoff/);

const states = readinessForCase({ case: { active: false }, participant: { active: false }, resource_map: { status: 'Needs QA' }, mission_bank_comparability: { status: 'Needs review' } });
assert.equal(states.resourceMap, 'Needs QA');
assert.equal(states.comparability, 'Needs review');
assert.equal(states.game, 'Off intentionally');
assert.equal(states.reminders, 'Off intentionally');

console.log('Version-bound research-admin signoff and readiness privacy checks passed.');
