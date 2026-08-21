import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accountState, antecedentContext, normalizeTargets, readinessForCase } from './admin-model.mjs';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('operations-ui.mjs', import.meta.url), 'utf8');
const gameUi = fs.readFileSync(new URL('game-creation-ui.mjs', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('admin.css', import.meta.url), 'utf8');
const baseSql = fs.readFileSync(new URL('../supabase/migrations/20260814020000_research_admin_onboarding.sql', import.meta.url), 'utf8');
const cleanupSql = fs.readFileSync(new URL('../supabase/migrations/20260814030000_intake_admin_workflow_cleanup.sql', import.meta.url), 'utf8');
const optionalGameFolderSql = fs.readFileSync(new URL('../supabase/migrations/20260814031000_cases_game_folder_optional.sql', import.meta.url), 'utf8');
const sql = baseSql + '\n' + cleanupSql;
const provision = cleanupSql.slice(cleanupSql.indexOf('create or replace function public.provision_intake_case'));

// Authorization is enforced in the browser and independently in every privileged RPC.
assert.match(js, /profile\.role !== 'research_admin' \|\| profile\.active !== true/);
assert.match(html, /id="coaching-dashboard-link"[^>]*href="\.\.\/coach-dashboard\/"[^>]*hidden>Coaching Dashboard<\/a>/);
assert.match(js, /\$\('#coaching-dashboard-link'\)\.hidden = !authenticatedAdminView/);
assert.ok((sql.match(/if not public\.is_research_admin\(\)/g) || []).length >= 5);
assert.match(sql, /revoke all on function public\.provision_intake_case[\s\S]*from public/);

// Provisioning locks and accepts only an approved, unconverted intake.
assert.match(provision, /where i\.request_id = target_request_id for update/);
assert.match(provision, /intake\.status <> 'approved' or intake\.converted_case_id is not null/);
assert.doesNotMatch(provision, /intake\.status\s*=\s*'(submitted|declined|converted)'/);

// Exact-email account resolution requires one active profile with the expected role.
assert.match(provision, /teacher_matches <> 1/); assert.match(provision, /teacher\.role <> 'teacher' or not teacher\.active/);
assert.match(provision, /coach_matches <> 1/); assert.match(provision, /coach\.role not in \('coach', 'research_admin'\) or not coach\.active/);
assert.match(provision, /p\.auth_user_id = teacher\.id/);
assert.deepEqual(accountState([{ profile_id: 'teacher', role: 'teacher', active: true }], 'teacher'), { ready: true, label: 'Ready', profileId: 'teacher' });
assert.equal(accountState([], 'teacher').ready, false);
assert.equal(accountState([{ profile_id: 'teacher', role: 'teacher', active: false }], 'teacher').ready, false);
assert.equal(accountState([{ profile_id: 'coach', role: 'teacher', active: true }], 'coach').ready, false);
assert.equal(accountState([{ profile_id: 'admin', role: 'research_admin', active: true }], 'coach').ready, true);
assert.equal(accountState([{ profile_id: 'admin', role: 'research_admin', active: true }], 'teacher').ready, false);

// Identifiers, alias, and uniqueness are validated server-side; initials never supply the alias.
assert.match(provision, /study_id !~ '\^MR-\[0-9\]\{3\}\$'/);
assert.match(provision, /new_case_code !~ '\^CASE-\[0-9\]\{3\}\$'/);
assert.match(provision, /student game alias is required/);
assert.match(provision, /participant_code = study_id/); assert.match(provision, /case_code = new_case_code/);
assert.doesNotMatch(js, /student_alias[^\n]*student_initials|student_game_alias:\s*state\.selected\.student_initials/);
assert.match(js, /Do not enter the student's full name/);
assert.match(js, /Study ID <small>— Example: MR-001<\/small>/);
assert.match(js, /Case code <small>— filled from Study ID<\/small>/);
assert.match(js, /Student game alias <small>— Example: Kai<\/small>/);
assert.doesNotMatch(js, /placeholder="(?:MR-001|CASE-001|Kai)"/);
assert.match(js, /Set up this study case\? The game and reminders will stay off\./);

// The legacy static-game folder is optional for protected-content cases.
assert.match(optionalGameFolderSql, /information_schema\.columns/);
assert.match(optionalGameFolderSql, /table_schema = 'public'/);
assert.match(optionalGameFolderSql, /table_name = 'cases'/);
assert.match(optionalGameFolderSql, /column_name = 'game_folder'/);
assert.match(optionalGameFolderSql, /alter table public\.cases\s+alter column game_folder drop not null/i);
assert.doesNotMatch(optionalGameFolderSql, /\b(?:insert|update|delete|truncate|drop table|create table)\b/i);

// Deterministic reviewed target keys and crisis exclusion.
const proposed = [{ domain: 'response', description: 'R', sort_order: 2 }, { domain: 'proactive', description: 'P', sort_order: 1 }, { domain: 'response', description: 'R2', sort_order: 1 }, { domain: 'crisis', description: 'C', sort_order: 1 }];
assert.deepEqual(normalizeTargets(proposed, false).map(row => row.target_key), ['proactive_01', 'response_01', 'response_02']);
assert.equal(new Set(normalizeTargets(proposed, true).map(row => row.target_key)).size, 4);
assert.match(provision, /row_number\(\) over \(partition by item->>'domain' order by ordinal\)/);
assert.match(provision, /'crisis' and not intake\.has_crisis_plan/);

// All preparation writes are one function transaction and are explicitly inactive.
assert.match(provision, /insert into public\.cases\(case_code, student_alias, active\)[\s\S]*values \(new_case_code, btrim\(student_game_alias\), false\)/);
assert.match(provision, /insert into public\.participants\(auth_user_id, participant_code, case_id, active\)[\s\S]*values \(teacher\.id, study_id, created_case_id, false\)/);
assert.match(provision, /insert into public\.case_intake/);
assert.match(provision, /status, submitted_by, submitted_at[\s\S]*'submitted', auth\.uid\(\), now\(\)/);
assert.match(provision, /insert into public\.fidelity_targets/); assert.match(provision, /insert into public\.case_coaches/);
assert.match(provision, /status = 'converted', converted_case_id = created_case_id, converted_at = now\(\)/);
assert.match(provision, /'case_provisioned'/);

// Provisioning cannot create reminders, protected content, telemetry, Auth users, or email.
assert.doesNotMatch(provision, /insert into public\.(teacher_reminder_settings|case_game_content|game_sessions|game_responses)/i);
assert.doesNotMatch(provision, /signInWithOtp|resetPasswordForEmail|inviteUserByEmail|resend|fetch\s*\(/i);

// Converted readiness reads only protected-content metadata and renders intentional OFF states.
assert.match(sql, /jsonb_build_object\('present', true, 'version', gc\.version, 'updated_at', gc\.updated_at\)/);
assert.doesNotMatch(sql.slice(sql.indexOf('create function public.research_admin_case_readiness')), /gc\.(config|resources|daily_missions|wildcard_missions|crisis_missions)/);
const prepared = readinessForCase({ case: { id: 'c', active: false }, participant: { auth_user_id: 't', active: false }, intake_snapshot: true, coach: { coach_user_id: 'x', active: true }, fidelity_target_count: 4, protected_content: null, reminders: null });
assert.equal(prepared.content, 'Needs action'); assert.equal(prepared.game, 'Off intentionally'); assert.equal(prepared.reminders, 'Off intentionally');
assert.match(js, /Off/); assert.match(ui, /Reminders/); assert.match(css, /\.off\{/);

// Defensive deployed-schema assertions and privacy restrictions remain explicit.
for (const column of ['request_id', 'status', 'converted_case_id', 'converted_at', 'submitted_at']) assert.match(sql, new RegExp(`\\('${column}'\\)`));
for (const contract of [
  "('cases', 'case_code')", "('cases', 'student_alias')", "('cases', 'active')",
  "('participants', 'auth_user_id')", "('participants', 'participant_code')",
  "('participants', 'case_id')", "('participants', 'active')", "('case_intake', 'status')"
]) assert.match(sql, new RegExp(contract.replace(/[()]/g, '\\$&')));
assert.match(sql, /unique cases\.case_code constraint/);
assert.match(sql, /unique participants\.auth_user_id constraint/);
assert.match(sql, /unique participants\.participant_code constraint/);
assert.match(sql, /participants\.auth_user_id to reference auth\.users\(id\)/);
assert.match(sql, /participants\.case_id to reference public\.cases\(id\)/);
assert.doesNotMatch(sql, /i\.created_at|order by i\.created_at/);
assert.doesNotMatch(html + js + sql, /student_full_name|student_id|diagnosis|disability|parent_information|medication/i);
assert.match(html, /Print \/ Save PDF/); assert.match(css, /@media print/); assert.match(css, /\.no-print/);
assert.doesNotMatch(js, /Practitioner/);
// Older intakes retain their optional preference information; blank newer values stay hidden.
assert.match(js, /field\('Preference information', row\.preference_assessment_notes, true\)/);
assert.match(js, /const field = \(label, value, wide = false\) => value \?/);
assert.deepEqual(antecedentContext({ common_triggers: 'A demand', typical_antecedents: 'A demand' }), [
  { label: 'What commonly happens before the behavior', value: 'A demand' }
]);
assert.deepEqual(antecedentContext({ common_triggers: '', typical_antecedents: 'An older answer' }), [
  { label: 'What commonly happens before the behavior', value: 'An older answer' }
]);
assert.deepEqual(antecedentContext({ common_triggers: 'A transition', typical_antecedents: 'A hard task' }), [
  { label: 'Common triggers', value: 'A transition' },
  { label: 'Typical antecedents (older intake)', value: 'A hard task' }
]);
console.log('Research-admin transactional provisioning, rollback structure, readiness, inactive safeguards, and privacy checks passed.');

// Prepared cases use accessible, source-aware primary tabs without changing routes.
assert.match(js, /role="tablist" aria-label="Case detail sections"/);
assert.match(js, /role="tab" aria-selected="false" aria-controls="intake-panel"/);
assert.match(js, />Intake Information<\/button>/);
assert.match(js, />Research Operations<\/button>/);
assert.match(js, /role="tab" aria-selected="false" aria-controls="game-creation-panel"[\s\S]*data-tab="game-creation">Game Creation<\/button>/);
assert.match(js, /openDetail\(intake\.request_id, 'operations'\)/);
assert.match(js, /openDetail\(button\.dataset\.id, 'intake'\)/);
assert.match(js, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
assert.match(js, /id="intake-panel"/);
assert.match(js, /Contact Information/);
assert.match(js, /Student &amp; Behavior/);
assert.match(js, /BIP\/BSP Strategies/);
assert.match(js, /id="operations-panel"[\s\S]*readinessPanel\(converted\)/);
assert.match(css, /\.operations-subnav \{ position:sticky/);
assert.match(gameUi, /Complete all three checks for the current protected-content version/);
assert.match(gameUi, /resource_behavior_review[\s\S]*resource_privacy_review[\s\S]*resource_qa_preview/);
assert.match(gameUi, /done\?'Complete ✓':'Needs review'/);
assert.doesNotMatch(js, /Comparability|mission_bank_comparability|comparability_ready/i);
assert.match(gameUi, /QA only\. This does not turn the game on or count as study data\./);

// Prepared-case Game Creation is a real third tab and preserves the selected tab on re-render.
assert.equal((js.match(/class="case-tab"/g) || []).length, 3);
assert.match(js, /const caseTabs = \['intake', 'operations', 'game-creation'\]/);
assert.match(js, /if \(!caseTabs\.includes\(name\)\) return/);
assert.match(js, /selectCaseTab\(preferredTab \|\| state\.selectedTab \|\| 'intake'\)/);
assert.match(js, /#open-game-creation[\s\S]*selectCaseTab\('game-creation'\)[\s\S]*#game-creation-panel[\s\S]*scrollIntoView/);
assert.match(js, /#back-to-game-ready[\s\S]*selectCaseTab\('operations'\)[\s\S]*#operations-game-ready[\s\S]*scrollIntoView/);
assert.match(js, /caseTabs\.forEach\(tab => \{ const panel = \$\(`#\$\{tab\}-panel`\)/);
assert.match(js, /\$\('#print-intake'\)\.hidden = selected !== 'intake'/);
assert.equal((gameUi.match(/id="preview-protected-game"/g) || []).length, 1);
assert.equal((gameUi.match(/id="signoff-message"/g) || []).length, 1);
assert.doesNotMatch(ui, /id="preview-protected-game"|id="signoff-message"/);
