import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const migrationName='20260827030000_weekly_qualtrics_operations_tasks.sql';
const migration=fs.readFileSync(new URL(`../supabase/migrations/${migrationName}`,import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const study=migration.slice(migration.indexOf('create or replace function public.research_admin_ensure_weekly_qualtrics_study_task'),migration.indexOf('create or replace function public.research_admin_ensure_weekly_qualtrics_case_task'));
const caseTask=migration.slice(migration.indexOf('create or replace function public.research_admin_ensure_weekly_qualtrics_case_task'),migration.indexOf('revoke all on function'));
test('migration is fresh-replay safe and contains no data-dependent seed block',()=>{assert.equal(migrationName,'20260827030000_weekly_qualtrics_operations_tasks.sql');assert.doesNotMatch(migration,/do \$\$|select id into seed_admin|active Research Admin is required to seed/i);const beforeFunctions=migration.slice(0,migration.indexOf('create or replace function'));assert.doesNotMatch(beforeFunctions,/insert into public\.research_tasks|public\.profiles|public\.cases/);});
test('required study-wide ensure is authenticated, idempotent, and manual',()=>{assert.match(study,/if not public\.is_research_admin\(\)/);assert.match(study,/auth\.uid\(\)/);assert.match(study,/Finalize Weekly Teacher Report in Qualtrics/);assert.match(study,/true,'pending'/);assert.match(study,/on conflict do nothing/);assert.match(study,/select \* into result/);assert.doesNotMatch(study,/completed_at|set status/);});
test('required case ensure is idempotent and rejects archived or demo fixtures',()=>{assert.match(caseTask,/if not public\.is_research_admin\(\)/);assert.match(caseTask,/c\.archived_at is null/);assert.match(caseTask,/participant_code not like 'MR-DEMO-%'/);assert.match(caseTask,/auth\.uid\(\)/);assert.match(caseTask,/true,'pending'/);assert.match(caseTask,/on conflict do nothing/);assert.match(caseTask,/select \* into result/);});
test('provisioning remains successful when a later task ensure fails',()=>{const provision=admin.slice(admin.indexOf('async function provisionCase'),admin.indexOf('async function ensureWeeklyQualtricsTasks'));assert.ok(provision.indexOf("state.selected.status = 'converted'")<provision.indexOf('ensureWeeklyQualtricsTasks(caseId)'));assert.doesNotMatch(provision,/taskError[\s\S]*return/);assert.match(admin,/Promise\.allSettled/);assert.match(admin,/will be retried on the next Research Operations load/);});
test('Research Operations load self-heals both tasks before loading dashboard data',()=>{const load=admin.slice(admin.indexOf('async function loadReadiness'),admin.indexOf('function readinessPanel'));assert.match(load,/ensureWeeklyQualtricsTasks\(data\.case\.id\)/);assert.match(admin,/research_admin_ensure_weekly_qualtrics_study_task/);assert.match(admin,/research_admin_ensure_weekly_qualtrics_case_task/);assert.ok(load.indexOf('ensureWeeklyQualtricsTasks')<load.indexOf('research_admin_operations_dashboard'));});
test('task creation has no lifecycle, access, reminder, measure, or observation mutations',()=>{assert.doesNotMatch(migration,/update public\.(cases|participants|teacher_reminder_settings|research_case_phase_events|research_measure_events|research_observations)/i);assert.doesNotMatch(migration,/net\.http|cron/i);});

test('Weekly Teacher Report expectations are bounded to Intervention only',()=>{
 const lifecycle=fs.readFileSync(new URL('../supabase/migrations/20260824070000_external_weekly_qualtrics_checkins.sql',import.meta.url),'utf8');
 const fn=lifecycle.slice(lifecycle.indexOf('create function public.research_admin_weekly_checkins'),lifecycle.indexOf('revoke all on function public.research_admin_weekly_checkins'));
 assert.match(fn,/where r\.phase='intervention'/);
 assert.match(fn,/r\.effective_date>intervention_start and r\.phase<>'intervention'/);
 assert.match(fn,/select r\.effective_date-1 into intervention_end/);
 assert.doesNotMatch(fn,/phase='maintenance'|phase in \('intervention','maintenance'\)/);
});
