import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accountState, normalizeTargets, readinessForCase } from './admin-model.mjs';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('admin.css', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/migrations/20260814020000_research_admin_onboarding.sql', import.meta.url), 'utf8');

// 1–2. Both the browser gate and every privileged RPC require an active admin.
assert.match(js, /profile\.role !== 'research_admin' \|\| profile\.active !== true/);
assert.equal((sql.match(/if not public\.is_research_admin\(\)/g) || []).length, 3);

// 3–5. Only submitted requests can become approved/declined; converted/declined cannot provision.
assert.match(sql, /target_status not in \('approved', 'declined'\)/);
assert.match(sql, /current_status <> 'submitted'/);
assert.doesNotMatch(sql + js, /provision_case|insert into public\.cases|insert into public\.participants/i);

// 6–7. Exact submitted email and expected role are mandatory.
assert.deepEqual(accountState([{ profile_id: 'teacher', role: 'teacher', active: true }], 'teacher'), { ready: true, label: 'Ready', profileId: 'teacher' });
assert.equal(accountState([], 'teacher').ready, false);
assert.equal(accountState([{ profile_id: 'coach', role: 'teacher', active: true }], 'coach').ready, false);
assert.match(sql, /lower\(btrim\(p\.email\)\) = lower\(btrim\(target_email\)\)/);

// 8–9. Keys are deterministic by domain/order, and crisis is omitted when inapplicable.
const proposed = [{ domain: 'response', description: 'R', sort_order: 2 }, { domain: 'proactive', description: 'P', sort_order: 1 }, { domain: 'response', description: 'R2', sort_order: 1 }, { domain: 'crisis', description: 'C', sort_order: 1 }];
assert.deepEqual(normalizeTargets(proposed, false).map(row => row.target_key), ['proactive_01', 'response_01', 'response_02']);
assert.equal(new Set(normalizeTargets(proposed, true).map(row => row.target_key)).size, 4);

// 10–12. Review/provisioning code cannot enable reminders, send email, or create sessions.
assert.doesNotMatch(sql + js, /insert into public\.teacher_reminder_settings|enabled\s*=\s*true|fetch\s*\(|signInWithOtp|resetPasswordForEmail|insert into public\.game_sessions/i);
assert.match(js, /Daily reminders:<\/strong> OFF/);

// 13–14. Readiness distinguishes protected content and intentional intervention inactivity.
const prepared = readinessForCase({ case: { id: 'c', active: false }, participant: { auth_user_id: 't', active: false }, intake: { case_id: 'c' }, coach: { coach_user_id: 'x', active: true }, targets: [{}], content: null, reminder: null });
assert.equal(prepared.content, 'Needs action'); assert.equal(prepared.game, 'Off intentionally'); assert.equal(prepared.reminders, 'Off intentionally');
assert.match(html + js, /Prepared ≠ Intervention active/); assert.match(css, /\.off\{/);

// 15. No prohibited student-identification or clinical fields were introduced.
assert.doesNotMatch(html + js + sql, /student_full_name|student_id|diagnosis|disability|parent_information|medication/i);
assert.match(js, /student_initials/);

assert.match(sql, /security definer set search_path = ''/);
assert.match(sql, /revoke execute on function public\.research_admin_intakes\(\) from anon/);
assert.match(html + js, /Provisioning is intentionally unavailable/);
console.log('Research-admin authorization, intake review, account matching, target keys, inactive safeguards, readiness, and privacy checks passed.');
