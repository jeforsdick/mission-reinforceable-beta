import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fidelitySummary,intervalSummary,teacherIoa,studentIoa,qualification,coverage,defaultIntervals,observationAttention,recalibrationState,ioaDisplay,denverWeek,mayAssignPrimary,mayAssignSecondary,ioaNeedsReview,correctionEvent} from './observations-model.mjs';
import {intervalGrid,recordForm,renderObservations,renderObserverTeam,renderStudyIoaSummary} from './observations-ui.mjs';
const sql=fs.readFileSync(new URL('../supabase/migrations/20260818070000_classroom_observations_ioa.sql',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
for(const table of ['research_observation_setup','research_observation_setup_events','research_observers','research_observer_training_events','research_classroom_observations','research_classroom_observation_records','research_classroom_ioa_results'])assert.match(sql,new RegExp(`create table public\\.${table}`));
for(const rpc of ['save_observation_setup','save_observer','record_observer_training','create_classroom_observation','submit_classroom_observation_record','observation_dashboard'])assert.match(sql,new RegExp(`research_admin_${rpc}`));
assert.match(sql,/security definer set search_path=''/g);assert.match(sql,/enable row level security/g);assert.match(sql,/Research admins read/);assert.match(sql,/revoke all on table public\.%I from anon,authenticated/);
assert.match(sql,/observation date cannot be in the future \(America\/Denver\)/);assert.match(sql,/effective_date<=target_observation_date/);assert.match(sql,/not in\('baseline','intervention','maintenance'\)/);assert.match(sql,/duration_minutes=30/);assert.match(sql,/interval_seconds=15/);assert.match(sql,/interval_count=120/);
assert.match(sql,/fidelity_items_snapshot/);assert.match(sql,/public\.fidelity_targets/);assert.match(sql,/every active fidelity target requires a stable target_key/);assert.doesNotMatch(sql,/game_sessions|weekly_teacher|procedural_fidelity/);
assert.match(sql,/fidelity target keys must exactly match snapshot without duplicates/);assert.match(sql,/exactly 120 student intervals are required/);assert.match(sql,/interval numbers must be unique 1 through 120/);assert.match(sql,/implemented_as_written','not_implemented_as_written','no_opportunity/);assert.match(sql,/occurrence','no_occurrence','not_observed/);
assert.deepEqual(fidelitySummary([{status:'implemented_as_written'},{status:'not_implemented_as_written'},{status:'no_opportunity'}]),{implemented:1,notImplemented:1,noOpportunity:1,scoreable:2,percent:50});assert.equal(fidelitySummary([{status:'no_opportunity'}]).percent,null);
const intervals=defaultIntervals();intervals[0].status='occurrence';intervals[1].status='not_observed';assert.deepEqual(intervalSummary(intervals),{occurrence:1,noOccurrence:118,notObserved:1,observed:119,percent:100/119});
const fi=[0,1,2,3,4].map(i=>({target_key:`t${i}`,status:'no_opportunity'})),fi2=structuredClone(fi);fi2[0].status='implemented_as_written';assert.equal(teacherIoa(fi,fi2).percent,80);assert.equal(teacherIoa(fi,fi2).meets,false);fi2[0].status='no_opportunity';assert.equal(teacherIoa(fi,fi2).percent,100);assert.equal(teacherIoa(fi,fi2).meets,true);
const a=defaultIntervals(),b=defaultIntervals();a[0].status='not_observed';b[1].status='not_observed';b[2].status='occurrence';const sioa=studentIoa(a,b);assert.equal(sioa.excluded,2);assert.equal(sioa.disagreements,1);assert.equal(sioa.agreements,117);
assert.equal(qualification({teacher_fidelity_agreement:85,student_behavior_agreement:85}),true);assert.equal(qualification({teacher_fidelity_agreement:84.99,student_behavior_agreement:99}),false);assert.deepEqual(coverage(11,2),{completed:11,paired:2,percent:200/11,required:3,additional:1,meets:false});
assert.match(sql,/>=85/g);assert.match(sql,/>80/g);assert.match(sql,/ceil\(totals\.n\*\.20\)/);assert.match(sql,/correction reason is required for a revision/);assert.match(sql,/order by revision_number desc limit 1/);assert.match(sql,/unique\(primary_record_id,secondary_record_id\)/);
const grid=intervalGrid('primary');assert.equal((grid.match(/class="interval-cell"/g)||[]).length,120);assert.match(grid,/30/);assert.match(renderObserverTeam({observers:[]},x=>x),/Observer Team/);const obs={id:'o',fidelity_items_snapshot:[{target_key:'P-01',domain:'proactive',description:'Do it'}]};assert.match(recordForm(obs,'secondary',x=>x),/SECONDARY OBSERVER \/ IOA DATA/);assert.match(recordForm(obs,'primary',x=>x),/Unmarked intervals will be saved as observed with no target behavior/);
assert.match(renderObservations({protocol:{planned_baseline_observations:6},observation_data:{coverage:{completed:0},observations:[],observers:[],setups:[]}},x=>x),/Observations &amp; IOA/);assert.match(html,/id="observer-team"/);assert.match(js,/research_admin_observation_dashboard/);assert.match(js,/submitted_student_intervals:payload\.intervals/);assert.doesNotMatch(fs.readFileSync(new URL('../coach-dashboard/dashboard.js',import.meta.url),'utf8'),/classroom_observation|student_intervals|fidelity_scores/);
assert.deepEqual(observationAttention({current_phase:'baseline',protocol:{planned_baseline_observations:6},observation_data:{setups:[],observations:[],coverage:{completed:0},observers:[]}}),['Observation setup missing after baseline begins','Baseline observation count below assigned planned minimum']);
console.log('Classroom observation setup, snapshots, scoring, IOA, coverage, revisions, UI, and security checks passed.');

// Hardened observer assignment is authoritative on the server.
assert.match(sql,/primary observer must be an active primary researcher or qualified trained observer/);
assert.match(sql,/o\.observer_type='primary_researcher' or \(o\.observer_type='trained_observer' and public\.research_observer_status/);
assert.match(sql,/secondary observer must be an active qualified trained observer/);
assert.match(sql,/o\.observer_type='trained_observer' and o\.active/);
assert.match(sql,/primary and secondary observers must differ/);
assert.match(sql,/cannot deactivate or change the type of the only active primary researcher/);
assert.match(renderObserverTeam({observers:[{id:'1',observer_code:'OBS-02',display_name:'Observer',observer_type:'trained_observer',active:false,status:'inactive'}]},x=>x),/observer-edit-form[\s\S]*Active[\s\S]*inactive/);


const primaryResearcher={active:true,observer_type:'primary_researcher',status:'qualified'},qualifiedTrained={active:true,observer_type:'trained_observer',status:'qualified'};
assert.equal(mayAssignPrimary(primaryResearcher),true);assert.equal(mayAssignPrimary(qualifiedTrained),true);
assert.equal(mayAssignPrimary({...qualifiedTrained,status:'training_needed'}),false);assert.equal(mayAssignPrimary({...qualifiedTrained,status:'recalibration_required'}),false);assert.equal(mayAssignPrimary({...qualifiedTrained,active:false}),false);
assert.equal(mayAssignSecondary(primaryResearcher),false);assert.equal(mayAssignSecondary(qualifiedTrained),true);assert.equal(mayAssignSecondary({...qualifiedTrained,active:false}),false);assert.equal(mayAssignSecondary({...qualifiedTrained,status:'training_needed'}),false);
// Audit timestamp breaks same-day ties deterministically.
const low={date:'2026-09-03',recorded_at:'2026-09-03T15:00:00Z'};
assert.equal(recalibrationState(low,null),'recalibration_required');
assert.equal(recalibrationState(low,{date:'2026-09-04',recorded_at:'2026-09-04T09:00:00Z'}),'qualified');
assert.equal(recalibrationState(low,{date:'2026-09-03',recorded_at:'2026-09-03T16:00:00Z'}),'qualified');
assert.equal(recalibrationState(low,{date:'2026-09-03',recorded_at:'2026-09-03T14:00:00Z'}),'recalibration_required');
assert.match(sql,/\(good\.good_date,good\.good_recorded_at\)<=\(low\.low_date,low\.low_recorded_at\)/);

// Corrections preload only the current record for the requested role.
const primaryRecord={revision_number:2,fidelity_scores:[{target_key:'P-01',status:'implemented_as_written'}],student_intervals:defaultIntervals().map((x,i)=>i===0?{...x,status:'occurrence'}:x),observer_note:'Primary note'};
const secondaryRecord={revision_number:1,fidelity_scores:[{target_key:'P-01',status:'no_opportunity'}],student_intervals:defaultIntervals().map((x,i)=>i===0?{...x,status:'not_observed'}:x),observer_note:'Secondary note'};
const correctionObs={...obs,primary_record:primaryRecord,secondary_record:secondaryRecord};
const primaryCorrection=recordForm(correctionObs,'primary',x=>x),secondaryCorrection=recordForm(correctionObs,'secondary',x=>x);
assert.match(primaryCorrection,/Correction to Primary Record/);assert.match(primaryCorrection,/value="implemented_as_written" checked/);assert.doesNotMatch(primaryCorrection,/value="no_opportunity" checked/);assert.match(primaryCorrection,/data-interval="1" data-status="occurrence"/);
assert.match(secondaryCorrection,/Correction to Secondary Record/);assert.match(secondaryCorrection,/value="no_opportunity" checked/);assert.doesNotMatch(secondaryCorrection,/value="implemented_as_written" checked/);assert.match(secondaryCorrection,/data-interval="1" data-status="not_observed"/);assert.match(secondaryCorrection,/name="correction_reason" maxlength="1000" required/);
assert.match(sql,/correction reason is required for a revision/);assert.match(sql,/prevent_research_operations_delete/);assert.match(sql,/unique\(primary_record_id,secondary_record_id\)/);

// Null agreement is reviewable, neither pass nor automatic recalibration.
assert.equal(ioaDisplay({overall_ioa_attention:false,teacher_fidelity_ioa_percent:100,student_behavior_ioa_percent:null}),'IOA not calculable / review');
assert.equal(ioaDisplay({overall_ioa_attention:true,teacher_fidelity_ioa_percent:80,student_behavior_ioa_percent:null}),'Needs recalibration');
assert.equal(ioaDisplay({overall_ioa_attention:false,teacher_fidelity_ioa_percent:81,student_behavior_ioa_percent:81}),'Meets criterion');
assert.match(sql,/coalesce\(\(case when sa\+sd=0 then null else 100\.0\*sa\/\(sa\+sd\) end\)<=80,false\)/);

const summary=renderStudyIoaSummary({coverage:{completed:10,ioa:2,percent:20,required_minimum:2,additional_needed:0,teacher_alerts:1,student_alerts:2,not_calculable:1},by_dyad:[{study_id:'MR-001',ioa:1,completed:5,percent:20}],by_phase:[{phase:'baseline',ioa:2,completed:10,percent:20}]},x=>x);
assert.match(summary,/Study IOA Summary/);assert.match(summary,/MR-001: 1 \/ 5, 20\.0%/);assert.match(summary,/Baseline: 2 \/ 10/);assert.match(summary,/Teacher 1 · Student 2 · Not calculable 1/);
const interventionUi=renderObservations({current_phase:'intervention',protocol:{planned_baseline_observations:6},observation_data:{coverage:{completed:0},observations:[],observers:[],setups:[]}},x=>x);assert.match(interventionUi,/This intervention week/);assert.match(interventionUi,/approximately 3\/week/);assert.deepEqual(denverWeek(new Date('2026-08-19T05:30:00Z')),{monday:'2026-08-17',sunday:'2026-08-23'});
assert.match(renderObservations({current_phase:'baseline',protocol:{planned_baseline_observations:6},observation_data:{coverage:{},observers:[],setups:[],observations:[{id:'o',observation_date:'2026-01-01',phase:'baseline',session_number:1,primary_observer_code:'JO',secondary_observer_code:'OBS-02',secondary_observer_id:'2',secondary_record_id:'sr',fidelity_items_snapshot:[],ioa:{teacher_fidelity_ioa_percent:100,student_behavior_ioa_percent:null,overall_ioa_attention:false}}]}},x=>String(x??'')),/Primary: JO · Secondary\/IOA: OBS-02[\s\S]*IOA not calculable \/ review/);
for(const pattern of [/length\(target_routine\)<=1000/,/length\(target_behavior_definition\)<=2000/,/length\(change_note\)<=1000/,/length\(context_note\)<=1000/,/length\(observer_note\)<=1000/,/length\(brief_note\)<=1000/,/length\(correction_reason\)<=1000/])assert.match(sql,pattern);

// Observer status reads only the IOA row tied to both highest-revision records.
const statusSql=sql.slice(sql.indexOf('create function public.research_observer_status'),sql.indexOf('create function public.research_admin_save_observation_setup'));
assert.match(statusSql,/current_records as \(select distinct on\(r\.observation_id,r\.observer_role\)/);
assert.match(statusSql,/p\.id=i\.primary_record_id/);assert.match(statusSql,/secondary\.id=i\.secondary_record_id/);
assert.match(statusSql,/from current_ioa i/);assert.doesNotMatch(statusSql,/from public\.research_classroom_ioa_results r[\s\S]*r\.overall_ioa_attention/);
assert.match(sql,/create table public\.research_classroom_ioa_results/);assert.match(sql,/unique\(primary_record_id,secondary_record_id\)/);assert.doesNotMatch(sql,/delete from public\.research_classroom_ioa_results/);
// A corrected acceptable current pair excludes the superseded low pair; a corrected low pair remains eligible through current_ioa.
const ioaRows=[{primary:'p1',secondary:'s1',attention:true},{primary:'p2',secondary:'s2',attention:false}];
assert.equal(ioaRows.find(x=>x.primary==='p2'&&x.secondary==='s2').attention,false);
assert.equal([{primary:'p1',secondary:'s1',attention:true},{primary:'p2',secondary:'s2',attention:true}].find(x=>x.primary==='p2'&&x.secondary==='s2').attention,true);
assert.equal(recalibrationState(low,{date:'2026-09-04',recorded_at:'2026-09-04T09:00:00Z'}),'qualified');

// The sole active primary cannot be removed by state or type; another active primary permits conversion.
assert.match(sql,/\(target_active=false or target_observer_type<>'primary_researcher'\)/);
assert.match(sql,/not exists\(select 1 from public\.research_observers where observer_type='primary_researcher' and active and id<>target_observer_id\)/);
assert.match(sql,/create index research_observers_primary_active_idx/);assert.doesNotMatch(sql,/unique index research_observers_one_primary/);

const corrected={observation_date:'2026-08-28',primary_record:{revision_number:2,submitted_at:'2026-09-02T16:30:00Z'},secondary_record:{revision_number:2,submitted_at:'2026-09-01T12:00:00Z'}};
assert.equal(correctionEvent(corrected),'2026-09-02T16:30:00Z');assert.notEqual(correctionEvent(corrected),corrected.observation_date);
assert.equal(ioaNeedsReview({overall_ioa_attention:false,teacher_fidelity_ioa_percent:100,student_behavior_ioa_percent:null}),true);
assert.equal(ioaNeedsReview({overall_ioa_attention:true,teacher_fidelity_ioa_percent:75,student_behavior_ioa_percent:90}),true);
assert.equal(ioaNeedsReview({overall_ioa_attention:false,teacher_fidelity_ioa_percent:94,student_behavior_ioa_percent:94}),false);
assert.match(js,/IOA Review/);assert.match(js,/ioaNeedsReview\(x\.ioa\)/);assert.doesNotMatch(js,/<dt>IOA Alerts<\/dt>/);
