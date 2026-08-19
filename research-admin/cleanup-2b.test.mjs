import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const migration=read('../supabase/migrations/20260819030000_research_admin_cleanup_2b.sql');
const active=['admin.js','observations-model.mjs','observations-ui.mjs','operations-model.mjs','case-report.mjs'].map(read).join('\n');
test('Cleanup 2B removes raw database storage and entry functions without cascade',()=>{
 for(const table of ['research_classroom_observation_records','research_classroom_ioa_results'])assert.match(migration,new RegExp(`drop table if exists public\\.${table}`));
 for(const fn of ['research_admin_submit_classroom_observation_record','research_admin_compute_classroom_ioa','research_generate_classroom_ioa','research_admin_create_legacy_observation_summary'])assert.match(migration,new RegExp(`drop function if exists public\\.${fn}`));
 assert.doesNotMatch(migration,/cascade/i);
});
test('dashboard and observer status are summary-only',()=>{
 const replacements=migration.slice(0,migration.indexOf('-- Retired RPCs'));
 assert.match(replacements,/research_admin_observation_dashboard[\s\S]*join current_summaries/);
 assert.match(replacements,/research_observer_status[\s\S]*research_classroom_observation_summary_revisions/);
 for(const retired of ['research_classroom_observation_records','research_classroom_ioa_results','primary_record_id','secondary_record_id'])assert.doesNotMatch(replacements,new RegExp(retired));
});
test('active client has no raw workflow or legacy correction bridge',()=>{
 for(const retired of ['primary_record_id','secondary_record_id','student_intervals','fidelity_scores','research_admin_submit_classroom_observation_record','research_admin_compute_classroom_ioa','research_admin_create_legacy_observation_summary','Correct Summary'])assert.doesNotMatch(active,new RegExp(retired));
 assert.match(active,/Edit Summary/);
});
