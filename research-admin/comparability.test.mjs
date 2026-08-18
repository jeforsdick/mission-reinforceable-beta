import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20260818030000_mission_bank_comparability_reviews.sql', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('admin.css', import.meta.url), 'utf8');
const keys = ['consistent_structure', 'same_instructional_purpose', 'comparable_decision_difficulty', 'comparable_feedback_support', 'bip_alignment', 'target_representation', 'context_not_dose', 'crisis_safety_boundaries', 'overall_comparability'];

// Attempts are private, append-only, attributable, and version-bound.
assert.match(sql, /create table public\.mission_bank_comparability_reviews/);
assert.match(sql, /reviewed_by uuid not null references public\.profiles/);
assert.match(sql, /protected_content_version integer not null/);
assert.match(sql, /revoke all on table public\.mission_bank_comparability_reviews from anon, authenticated/);
assert.match(sql, /Research admins read comparability reviews/);
assert.doesNotMatch(sql, /grant (?:insert|update|delete|all) on table public\.mission_bank_comparability_reviews/i);
assert.doesNotMatch(sql, /(?:update|delete from) public\.mission_bank_comparability_reviews/i);
assert.match(sql, /if not public\.is_research_admin\(\)/);
assert.match(sql, /target_protected_content_version is distinct from current_version/);

// The exact criterion object is validated rather than accepted as arbitrary JSON.
for (const key of keys) assert.match(sql, new RegExp(`'${key}'`));
assert.match(sql, /exactly all nine comparability criterion keys are required/);
assert.match(sql, /criterion - array\['status', 'note'\]/);
assert.match(sql, /criterion->>'status' not in \('pass', 'revise'\)/);
assert.match(sql, /char_length\(coalesce\(criterion->>'note', ''\)\) > 1000/);
assert.match(sql, /calculated_all_pass := calculated_all_pass and criterion->>'status' = 'pass'/);
assert.doesNotMatch(sql, /target_all_pass|submitted_all_pass/);

// Only confirmed all-Pass reviews of an exact 10/5/5 bank create the existing signoff.
assert.match(sql, /daily_count <> 10 or mystery_count <> 5 or crisis_count <> 5/);
assert.match(sql, /Mission bank incomplete/);
assert.match(sql, /calculated_all_pass and final_confirmation is not true/);
assert.match(sql, /if calculated_all_pass then[\s\S]*'mission_bank_comparability'/);
assert.match(sql, /'signoff_created', new_signoff_id is not null/);
assert.match(sql, /protected_content_version = gc\.version and s\.review_type = 'mission_bank_comparability'/);
assert.match(sql, /when exists \(select 1 from public\.mission_bank_comparability_reviews[\s\S]*'Revisions identified'/);
assert.match(sql, /where h\.case_id = c\.id/); // all versions remain as audit history

// Generic Resource Map checks remain valid while generic comparability is rejected.
assert.match(sql, /target_review_type = 'mission_bank_comparability'[\s\S]*structured comparability review/);
for (const type of ['resource_behavior_review', 'resource_privacy_review', 'resource_qa_preview']) assert.match(sql, new RegExp(`'${type}'`));
assert.doesNotMatch(sql, /update public\.(?:cases|participants|teacher_reminder_settings)/i);

// The admin workflow displays counts, all nine human judgments, privacy guidance, confirmation, and history.
assert.match(js, /Mission Bank Comparability Review/);
assert.match(js, /Mission modes describe scenario context, not dose or intervention strength/);
assert.match(js, /Reviewing protected content version/);
assert.match(js, /Daily:[\s\S]*\/ 10/); assert.match(js, /Mystery:[\s\S]*\/ 5/); assert.match(js, /Crisis:[\s\S]*\/ 5/);
assert.match(js, /Mission bank incomplete/);
for (const key of keys) assert.match(js, new RegExp(`'${key}'`));
assert.match(js, /I have reviewed the complete mission bank using the Mission Bank Comparability Review and all criteria meet expectations for this content version\./);
assert.match(js, /do not copy protected student\/BIP content/);
assert.match(js, /research_admin_submit_mission_bank_comparability_review/);
assert.doesNotMatch(js, /data-review-type="mission_bank_comparability"/);
assert.match(js, /Review history/);
assert.match(css, /\.comparability-criterion/);

console.log('Structured Mission Bank Comparability Review security, validation, finalization, readiness, and UI checks passed.');
