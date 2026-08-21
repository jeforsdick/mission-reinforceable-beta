import assert from 'node:assert/strict';
import fs from 'node:fs';
import { intakeChanges, missingRequired } from './edit-intake.mjs';

const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/migrations/20260821010000_research_admin_edit_intake.sql', import.meta.url), 'utf8');
const functionSql = sql.slice(sql.indexOf('create function public.research_admin_update_intake'));

assert.match(functionSql, /intake\.status not in \('submitted', 'approved'\)/);
assert.match(functionSql, /status='submitted'/);
assert.match(functionSql, /intake\.converted_case_id is not null[\s\S]*Intake is locked after study case setup\./);
assert.match(js, /canEditIntake \? '<button id="edit-intake"/);
assert.match(js, /Intake is locked after study case setup\./);
assert.match(functionSql, /revoke all on function public\.research_admin_update_intake\(uuid, jsonb\) from public/);
assert.match(functionSql, /if not public\.is_research_admin\(\)/);
assert.doesNotMatch(functionSql, /(?:update|insert into|delete from)\s+(?:auth\.|public\.profiles)/i);
assert.doesNotMatch(functionSql, /public\.(?:cases|participants|reminders|game_|observations|research_operations)/i);
assert.match(functionSql, /An account already exists for this email\./);
assert.match(js, /disabled:teacher\.ready/);
assert.match(js, /await loadIntakes\(\);[\s\S]*await openDetail\(requestId/);
assert.match(functionSql, /teacher_email=teacher_email_value/);

const base = Object.fromEntries([
  'teacher_name','teacher_email','coach_name','coach_email','grade_level','student_initials','target_behavior','behavior_topography','primary_function',
  'replacement_behavior','desired_behavior','typical_settings','typical_consequences','current_staff_responses'
].map(key => [key, key.includes('email') ? `${key}@example.org` : key]));
const form = new FormData();
for (const [key, value] of Object.entries(base)) form.set(key, value);
form.set('antecedent_answer', 'A difficult task');
form.set('has_crisis_plan', 'false');
const modern = intakeChanges(form, { common_triggers: 'old', typical_antecedents: 'old' });
assert.equal(modern.common_triggers, 'A difficult task');
assert.equal(modern.typical_antecedents, 'A difficult task');
assert.deepEqual(missingRequired(modern), []);

const historical = intakeChanges(form, { common_triggers: 'A transition', typical_antecedents: 'A demand' });
assert.equal(historical.common_triggers, 'A transition');
assert.equal(historical.typical_antecedents, 'A demand');
form.set('consolidate_antecedents', 'on');
const consolidated = intakeChanges(form, { common_triggers: 'A transition', typical_antecedents: 'A demand' });
assert.equal(consolidated.common_triggers, 'A difficult task');
assert.equal(consolidated.typical_antecedents, 'A difficult task');
assert.ok(missingRequired({ ...modern, teacher_name: '' }).includes('teacher_name'));

assert.doesNotMatch(functionSql, /preference_assessment_notes\s*=/);
assert.match(functionSql, /'intake_edited'/);
assert.match(functionSql, /research_onboarding_actions\(actor_user_id, action_type, request_id\)/);
assert.doesNotMatch(functionSql.slice(functionSql.indexOf('insert into public.research_onboarding_actions')), /target_behavior|crisis_plan|additional_context/);
assert.doesNotMatch(js.slice(js.indexOf('function editIntakeForm'), js.indexOf('async function openDetail')), /preference_assessment_notes/i);

// The existing authoritative target review and provisioning call remain in place.
assert.match(js, /function reviewedTargets\(\)/);
assert.match(js, /state\.client\.rpc\('provision_intake_case'/);
assert.doesNotMatch(functionSql, /fidelity_targets|target_key|provision_intake_case/);
console.log('Research Admin Edit Intake security, status, account, compatibility, audit, privacy, and provisioning regression checks passed.');
