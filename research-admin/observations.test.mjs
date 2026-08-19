import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fidelitySummary,intervalSummary,teacherIoa,studentIoa,qualification,coverage,defaultIntervals,mayAssignPrimary,mayAssignSecondary,ioaDisplay} from './observations-model.mjs';
import {newObservationForm,renderObservations} from './observations-ui.mjs';
const migration=fs.readFileSync(new URL('../supabase/migrations/20260819010000_classroom_observation_summaries.sql',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../supabase/migrations/20260818070000_classroom_observations_ioa.sql',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const e=x=>String(x??'');

// Constructs remain defined exactly as before; paper summaries replace only duplicate entry.
assert.equal(fidelitySummary([{status:'implemented_as_written'},{status:'not_implemented_as_written'},{status:'no_opportunity'}]).percent,50);
const intervals=defaultIntervals();intervals[0].status='occurrence';intervals[1].status='not_observed';assert.equal(intervalSummary(intervals).percent,100/119);
assert.equal(teacherIoa([{target_key:'a',status:'implemented_as_written'}],[{target_key:'a',status:'implemented_as_written'}]).percent,100);
assert.equal(studentIoa([{interval_number:1,status:'occurrence'}],[{interval_number:1,status:'occurrence'}]).percent,100);
assert.deepEqual(coverage(10,2),{completed:10,paired:2,percent:20,required:2,additional:0,meets:true});
assert.equal(qualification({teacher_fidelity_agreement:85,student_behavior_agreement:85}),true);
assert.equal(mayAssignPrimary({active:true,observer_type:'primary_researcher'}),true);assert.equal(mayAssignSecondary({active:true,observer_type:'trained_observer',status:'qualified'}),true);
assert.equal(ioaDisplay({overall_ioa_attention:true,teacher_fidelity_ioa_percent:80,student_behavior_ioa_percent:90}),'Needs recalibration');

const form=newObservationForm({},true,[{id:'p',observer_code:'JO'}],[{id:'s',observer_code:'JM'}],e);
assert.match(form,/Record Observation[\s\S]*Observation Details[\s\S]*Observation Results[\s\S]*Teacher fidelity %[\s\S]*Student target behavior %[\s\S]*Was IOA collected\?/);
for(const name of ['teacher_fidelity_percent','student_target_behavior_percent','teacher_fidelity_ioa_percent','student_behavior_ioa_percent'])assert.match(form,new RegExp(`name="${name}"[^>]*min="0" max="100" step="any"`));
assert.match(form,/class="summary-form-grid ioa-fields" hidden/);assert.match(form,/value="no" checked/);assert.match(form,/IOA observer[\s\S]*Teacher fidelity IOA %[\s\S]*Student behavior IOA %/);
assert.doesNotMatch(form,/interval-cell|fidelity-entry|implemented_as_written|120 intervals|I checked the fidelity/);

const legacyRow={id:'legacy',observation_date:'2026-08-18',phase:'baseline',session_number:1,primary_observer_code:'JO',primary_record_id:'raw-record',teacher_fidelity_percent:75,student_target_behavior_percent:10,context_note:'Paper form filed'};
const summaryRow={...legacyRow,id:'summary',session_number:2,summary_revision_id:'rev-2',summary_revision_number:2,secondary_observer_id:'s',secondary_observer_code:'JM',teacher_fidelity_percent:76.5,ioa:{teacher_fidelity_ioa_percent:80,student_behavior_ioa_percent:79,overall_ioa_attention:true}};
const rendered=renderObservations({current_phase:'baseline',protocol:{planned_baseline_observations:6},observation_data:{coverage:{completed:2,ioa:1,percent:50},setups:[{target_routine:'Arrival',target_behavior_definition:'Calls out'}],observers:[],observations:[summaryRow,legacyRow]}},e);
assert.match(rendered,/Baseline[\s\S]*2 \/ 6[\s\S]*Latest Teacher Fidelity[\s\S]*76\.5%[\s\S]*IOA Coverage[\s\S]*1 \/ 2 · 50%/);
assert.match(rendered,/Routine:<\/strong> Arrival[\s\S]*Target behavior:[\s\S]*Calls out[\s\S]*>Edit</);
assert.match(rendered,/Aug 18, 2026 · Baseline · Observation #1[\s\S]*Teacher fidelity: <strong>75%[\s\S]*Student target behavior: <strong>10%[\s\S]*IOA: Not collected/);
assert.match(rendered,/Edit Summary[\s\S]*Correction reason/);assert.match(rendered,/Teacher fidelity IOA is 80%\. Recalibration required/);assert.match(rendered,/Student behavior IOA is below criterion\. Recalibration required/);
assert.doesNotMatch(rendered,/interval-cell|fidelity-entry|IOA Summary|Coverage target:|View Data \/ Correct/);

// Additive schema: legacy raw tables persist; newest summary revision is authoritative.
assert.match(legacy,/create table public\.research_classroom_observation_records/);assert.match(legacy,/fidelity_scores jsonb not null, student_intervals jsonb not null/);
assert.match(migration,/create table public\.research_classroom_observation_summary_revisions/);for(const field of ['teacher_fidelity_percent','student_target_behavior_percent','teacher_fidelity_ioa_percent','student_behavior_ioa_percent'])assert.match(migration,new RegExp(field));
assert.match(migration,/unique\(observation_id, revision_number\)/);assert.match(migration,/correction reason is required for a summary revision/);assert.match(migration,/select max\(revision_number\)\+1/);assert.match(migration,/current_summaries as \(select distinct on\(observation_id\).*revision_number desc/);
assert.match(migration,/coalesce\(cs\.teacher_fidelity_percent,pr\.teacher_fidelity_percent\)/);assert.match(migration,/coalesce\(cs\.student_target_behavior_percent,pr\.student_target_behavior_percent\)/);
assert.match(migration,/IOA observer and both IOA percentages are required together/);assert.match(migration,/teacher_fidelity_ioa_percent<=80 or cs\.student_behavior_ioa_percent<=80/);assert.match(migration,/ceil\(totals\.n\*\.20\)/);
assert.match(migration,/research_admin_create_classroom_observation/);assert.match(migration,/public\.research_observer_status/);assert.match(js,/research_admin_record_classroom_observation_summary/);assert.match(js,/research_admin_revise_classroom_observation_summary/);
assert.doesNotMatch(fs.readFileSync(new URL('../coach-dashboard/dashboard.js',import.meta.url),'utf8'),/observation_summary_revisions/);
console.log('Compact paper-summary observation workflow, legacy compatibility, IOA, and append-only correction checks passed.');
