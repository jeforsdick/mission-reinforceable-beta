import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accountState, normalizeTargets, readinessForCase } from './admin-model.mjs';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('admin.css', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/migrations/20260814020000_research_admin_onboarding.sql', import.meta.url), 'utf8');
const provision = sql.slice(sql.indexOf('create function public.provision_intake_case'), sql.indexOf('create function public.research_admin_case_readiness'));

// Authorization is enforced in the browser and independently in every privileged RPC.
assert.match(js, /profile\.role !== 'research_admin' \|\| profile\.active !== true/);
assert.equal((sql.match(/if not public\.is_research_admin\(\)/g) || []).length, 5);
assert.match(sql, /revoke all on function public\.provision_intake_case[\s\S]*from public/);

// Provisioning locks and accepts only an approved, unconverted intake.
assert.match(provision, /where i\.request_id = target_request_id for update/);
assert.match(provision, /intake\.status <> 'approved' or intake\.converted_case_id is not null/);
assert.doesNotMatch(provision, /intake\.status\s*=\s*'(submitted|declined|converted)'/);

// Exact-email account resolution requires one active profile with the expected role.
assert.match(provision, /teacher_matches <> 1/); assert.match(provision, /teacher\.role <> 'teacher' or not teacher\.active/);
assert.match(provision, /coach_matches <> 1/); assert.match(provision, /coach\.role <> 'coach' or not coach\.active/);
assert.match(provision, /p\.auth_user_id = teacher\.id/);
assert.deepEqual(accountState([{ profile_id: 'teacher', role: 'teacher', active: true }], 'teacher'), { ready: true, label: 'Ready', profileId: 'teacher' });
assert.equal(accountState([], 'teacher').ready, false);
assert.equal(accountState([{ profile_id: 'teacher', role: 'teacher', active: false }], 'teacher').ready, false);
assert.equal(accountState([{ profile_id: 'coach', role: 'teacher', active: true }], 'coach').ready, false);

// Identifiers, alias, and uniqueness are validated server-side; initials never supply the alias.
assert.match(provision, /study_id !~ '\^MR-\[0-9\]\{3\}\$'/);
assert.match(provision, /new_case_code !~ '\^CASE-\[0-9\]\{3\}\$'/);
assert.match(provision, /student game alias is required/);
assert.match(provision, /participant_code = study_id/); assert.match(provision, /case_code = new_case_code/);
assert.doesNotMatch(js, /student_alias[^\n]*student_initials|student_game_alias:\s*state\.selected\.student_initials/);
assert.match(js, /Do not enter the student's full name/);

// Deterministic reviewed target keys and crisis exclusion.
const proposed = [{ domain: 'response', description: 'R', sort_order: 2 }, { domain: 'proactive', description: 'P', sort_order: 1 }, { domain: 'response', description: 'R2', sort_order: 1 }, { domain: 'crisis', description: 'C', sort_order: 1 }];
assert.deepEqual(normalizeTargets(proposed, false).map(row => row.target_key), ['proactive_01', 'response_01', 'response_02']);
assert.equal(new Set(normalizeTargets(proposed, true).map(row => row.target_key)).size, 4);
assert.match(provision, /row_number\(\) over \(partition by item->>'domain' order by ordinal\)/);
assert.match(provision, /'crisis' and not intake\.has_crisis_plan/);

// All preparation writes are one function transaction and are explicitly inactive.
assert.match(provision, /insert into public\.cases\(case_code, student_alias, active\)[\s\S]*values \(new_case_code, btrim\(student_game_alias\), false\)/);
assert.match(provision, /insert into public\.participants\(auth_user_id, participant_code, case_id, active\)[\s\S]*values \(teacher\.id, study_id, created_case_id, false\)/);
assert.match(provision, /insert into public\.case_intake/); assert.match(provision, /insert into public\.fidelity_targets/); assert.match(provision, /insert into public\.case_coaches/);
assert.match(provision, /status = 'converted', converted_case_id = created_case_id, converted_at = now\(\)/);
assert.match(provision, /'case_provisioned'/);

// Provisioning cannot create reminders, protected content, telemetry, Auth users, or email.
assert.doesNotMatch(provision, /insert into public\.(teacher_reminder_settings|case_game_content|game_sessions|game_responses)/i);
assert.doesNotMatch(sql + js, /signInWithOtp|resetPasswordForEmail|inviteUserByEmail|resend|fetch\s*\(/i);

// Converted readiness reads only protected-content metadata and renders intentional OFF states.
assert.match(sql, /jsonb_build_object\('present', true, 'version', gc\.version, 'updated_at', gc\.updated_at\)/);
assert.doesNotMatch(sql.slice(sql.indexOf('create function public.research_admin_case_readiness')), /gc\.(config|resources|daily_missions|wildcard_missions|crisis_missions)/);
const prepared = readinessForCase({ case: { id: 'c', active: false }, participant: { auth_user_id: 't', active: false }, intake_snapshot: true, coach: { coach_user_id: 'x', active: true }, fidelity_target_count: 4, protected_content: null, reminders: null });
assert.equal(prepared.content, 'Needs action'); assert.equal(prepared.game, 'Off intentionally'); assert.equal(prepared.reminders, 'Off intentionally');
assert.match(js, /OFF intentionally — intervention not activated/); assert.match(js, /Daily reminders/); assert.match(css, /\.off\{/);

// Defensive deployed-schema assertions and privacy restrictions remain explicit.
for (const column of ['request_id', 'status', 'converted_case_id', 'converted_at', 'submitted_at']) assert.match(sql, new RegExp(`\\('${column}'\\)`));
assert.doesNotMatch(sql, /i\.created_at|order by i\.created_at/);
assert.doesNotMatch(html + js + sql, /student_full_name|student_id|diagnosis|disability|parent_information|medication/i);
console.log('Research-admin transactional provisioning, rollback structure, readiness, inactive safeguards, and privacy checks passed.');
