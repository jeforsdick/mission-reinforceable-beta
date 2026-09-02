import { correctionEvent, observationAttention } from './observations-model.mjs';
export const CHECKLIST = [
  ['teacher_consent','Teacher consent'],['parent_permission','Parent/guardian permission'],['student_assent','Student assent'],
  ['bsp_technical_review','BIP/BSP reviewed'],['safety_screen','Safety review'],
  ['target_routine_finalized','Observation routine finalized'],['target_behavior_definition','Target behavior definition finalized'],
  ['fidelity_checklist_finalized','Teacher fidelity checklist finalized'],['fidelity_checklist_second_review','Second fidelity review completed'],
  ['baseline_orientation','Baseline orientation'],['intervention_orientation','MR intervention orientation']
];
export const MEASURES = [['tses_pre','TSES — Pre-Baseline'],['tses_post','TSES — Post-Intervention'],['urp_ir','URP-IR — Post-Intervention'],['teacher_interview','Teacher Interview — Post-Intervention']];
export const PHASES = ['prebaseline','baseline','intervention','maintenance','complete','withdrawn'];
export const COACHING_FOCUSES = ['observation','consultation','performance_feedback','modeling','data_review','problem_solving','responsive_support','other'];
export const TASK_CATEGORIES = ['meeting','follow_up','scheduling','research_admin','observation_planning','measure_follow_up','closeout','other'];
export const LIFECYCLE_STAGES = ['Enrollment','Prebaseline','Baseline','Game Ready','Intervention','Maintenance','End Measures','Closeout'];
export const isArchivedCase = item => item?.archived_at != null;
export function partitionDashboardCases(cases=[]){
  return {
    current: cases.filter(item=>!isArchivedCase(item)),
    archived: cases.filter(isArchivedCase)
  };
}
export function visibleDashboardCases(realCases=[],testCases=[],{showArchived=false,showTest=false}={}){
  const real=partitionDashboardCases(realCases),test=partitionDashboardCases(testCases);
  return [...real.current,...(showArchived?real.archived:[]),...(showTest?test.current:[]),...(showArchived&&showTest?test.archived:[])];
}
export function dashboardCaseCounts(cases=[]){
  const {current}=partitionDashboardCases(cases);
  return {
    intervention: current.filter(item=>item.current_phase==='intervention'&&item.case_active===true&&item.participant_active===true).length
  };
}
export const requiredBaselineKeys = CHECKLIST.slice(0,10).map(([key])=>key);
export function denverToday(now=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function checklistStatuses(itemKey){return itemKey==='student_assent'?['pending','complete','not_applicable']:['pending','complete'];}
export function currentByKey(rows,key='item_key'){ return Object.fromEntries((rows||[]).map(row=>[row[key],row])); }
const complete=(row,allowNA=false)=>row?.status==='complete'||(allowNA&&row?.status==='not_applicable');
export function observationSummary(item,now=new Date()){
  const rows=(item.observation_data?.observations||[]).filter(row=>row.summary_revision_id);
  const phaseRows=phase=>rows.filter(row=>row.phase===phase);
  const latest=[...rows].sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)))[0];
  const ioa=item.observation_data?.coverage||{};
  const monday=new Date(now); monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
  const weekStart=monday.toISOString().slice(0,10);
  let consecutive90=0;
  for(const row of [...phaseRows('intervention')].sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)))){
    if(Number(row.teacher_fidelity_percent)>=90) consecutive90++; else break;
  }
  return {rows,baseline:phaseRows('baseline').length,intervention:phaseRows('intervention').length,maintenance:phaseRows('maintenance').length,
    thisWeek:phaseRows('intervention').filter(row=>row.observation_date>=weekStart).length,latest,ioa,consecutive90,
    reviewIssues:(item.observation_data?.observations||[]).filter(row=>!row.summary_revision_id||row.ioa?.overall_ioa_attention).length};
}
export function interventionElapsed(item,now=new Date()){
  const effective=(item.phase_history||[]).filter(row=>row.phase==='intervention'&&/^\d{4}-\d{2}-\d{2}$/.test(row.effective_date||'')).sort((a,b)=>a.effective_date.localeCompare(b.effective_date))[0]?.effective_date;
  if(!effective)return null;
  const current=denverToday(now),startMs=Date.parse(`${effective}T00:00:00Z`),currentMs=Date.parse(`${current}T00:00:00Z`);
  if(!Number.isFinite(startMs)||!Number.isFinite(currentMs)||currentMs<startMs)return null;
  const days=Math.floor((currentMs-startMs)/86400000);
  return {effectiveDate:effective,days,weeks:days/7,minimumMet:days>=28};
}
export function gameReadiness(item){
  const checklist=currentByKey(item.checklist),p=item.prepared_content||{};
  const missing=[];
  if(!p.protected_content_present) missing.push('protected game content');
  if(!p.resource_map_ready) missing.push('Resource Map');
  if(!complete(checklist.intervention_orientation)) missing.push('teacher orientation');
  return {ready:missing.length===0,missing};
}
export function gamePreparationReadiness(item, prepared=item.prepared_content||{}){
  const checklist=currentByKey(item.checklist),protectedContent=prepared.protected_content?.present??prepared.protected_content_present;
  const resourceMap=prepared.resource_map?.status==='Ready'||prepared.resource_map_ready===true;
  const reviews=prepared.resource_map||{};
  const teacherReady=prepared.teacher_account_ready===true;
  const missing=[];
  if(!protectedContent) missing.push('protected game content');
  if(!resourceMap) missing.push('Resource Map');
  if(!reviews.behavior_reviewed) missing.push('Behavior Review');
  if(!reviews.privacy_reviewed) missing.push('Privacy Review');
  if(!reviews.qa_previewed) missing.push('QA Preview');
  if(!complete(checklist.intervention_orientation)) missing.push('MR intervention orientation');
  if(!teacherReady) missing.push('teacher account');
  return {ready:missing.length===0,missing};
}
export function lifecycleStage(item){
  const phase=item.current_phase||'prebaseline',checklist=currentByKey(item.checklist),stats=observationSummary(item);
  if(phase==='prebaseline') return complete(checklist.teacher_consent)&&complete(checklist.parent_permission)&&complete(checklist.student_assent,true)?'Prebaseline':'Enrollment';
  if(phase==='baseline'&&item.protocol&&stats.baseline>=item.protocol.planned_baseline_observations&&!gameReadiness(item).ready) return 'Game Ready';
  if(phase==='baseline') return 'Baseline';
  if(phase==='intervention') return 'Intervention';
  if(phase==='maintenance') return 'Maintenance';
  if(phase==='complete'&&measureNeeds(item).some(key=>key!=='tses_pre')) return 'End Measures';
  return 'Closeout';
}
export function nextAction(item,now=new Date()){
  const checklist=currentByKey(item.checklist),measures=currentByKey(item.measures,'measure_key'),phase=item.current_phase||'prebaseline',stats=observationSummary(item);
  if(!complete(checklist.teacher_consent)) return 'Teacher consent is still needed.';
  if(!complete(checklist.parent_permission)) return 'Parent/guardian permission is still needed.';
  if(!complete(checklist.student_assent,true)) return 'Student assent is still needed.';
  if(phase==='prebaseline'){
    if(measures.tses_pre?.status!=='complete') return 'Complete the pre-baseline TSES.';
    const baseline=baselineReadiness(item); if(!baseline.ready) return `${baseline.remaining} prebaseline readiness item${baseline.remaining===1?' is':'s are'} still needed.`;
    return 'Baseline is ready. Record the phase change when you are ready to begin.';
  }
  if(phase==='baseline'){
    if(!item.protocol||stats.baseline<(item.protocol.planned_baseline_observations||0)) return 'Record the next baseline observation.';
    if(!gameReadiness(item).ready) return 'Finish game readiness before starting intervention.';
    return 'Baseline minimum is met. Review the data and decide whether to move to intervention.';
  }
  if(phase==='intervention'){
    const elapsed=interventionElapsed(item,now);
    if(stats.consecutive90<3) return 'Intervention is active. Keep collecting observations and weekly measures.';
    if(!elapsed?.minimumMet) return elapsed?'Fidelity criterion is met. Continue intervention until the 4-week minimum, then review the data for a phase decision.':'Fidelity criterion is met. Confirm intervention timing before reviewing the data for a phase decision.';
    return 'Objective intervention criteria are met. Review trend and make the researcher phase decision.';
  }
  if(phase==='maintenance'){
    if(stats.maintenance===0) return 'Record the first maintenance observation.';
    if(stats.maintenance===1) return 'Maintenance observation 2 is next.';
    if(stats.maintenance===2) return 'Maintenance target range met. Decide whether one more probe is needed.';
    return 'Maintenance target range met. Record a deliberate phase change when maintenance is complete.';
  }
  if(phase==='complete'&&['tses_post','urp_ir','teacher_interview'].some(key=>measures[key]?.status!=='complete')) return 'Complete the post-intervention measures.';
  return 'Case closeout is recorded.';
}
export function baselineReadiness(item){
  const checklist=currentByKey(item.checklist), measures=currentByKey(item.measures,'measure_key'), missing=[];
  if(!item.protocol) missing.push('Baseline assignment');
  for(const key of requiredBaselineKeys){
    const acceptable=key==='student_assent'?['complete','not_applicable']:['complete'];
    if(!acceptable.includes(checklist[key]?.status)) missing.push(CHECKLIST.find(x=>x[0]===key)[1]);
  }
  if(measures.tses_pre?.status!=='complete') missing.push('TSES — Pre-Baseline');
  return {ready:missing.length===0,missing,remaining:missing.length};
}
export function measureNeeds(item){
  const current=currentByKey(item.measures,'measure_key'), phase=item.current_phase||'prebaseline', keys=[];
  if(['baseline','intervention','maintenance','complete'].includes(phase)&&current.tses_pre?.status!=='complete') keys.push('tses_pre');
  if(phase==='complete') for(const key of ['tses_post','urp_ir','teacher_interview']) if(current[key]?.status!=='complete') keys.push(key);
  return keys;
}
export function interventionReadiness(item){
  if(item.current_phase!=='intervention') return {ready:true,missing:[]};
  const checklist=currentByKey(item.checklist), missing=[];
  if(checklist.intervention_orientation?.status!=='complete') missing.push('MR intervention orientation');
  if(!item.prepared_content?.protected_content_present) missing.push('Game content');
  if(!item.prepared_content?.resource_map_ready) missing.push('Resource Map');
  if(!(item.case_active&&item.participant_active)) missing.push('Game turned on');
  if(!item.prepared_content?.reminders_enabled) missing.push('Reminders turned on');
  return {ready:missing.length===0,missing};
}
export function attentionForCase(item,today=new Date().toISOString().slice(0,10)) {
  const phase=item.current_phase||'prebaseline', attention=[], baseline=baselineReadiness(item);
  if(phase==='prebaseline'&&!baseline.ready) attention.push(`${baseline.remaining} baseline requirement${baseline.remaining===1?'':'s'} remaining`);
  for(const key of measureNeeds(item)) attention.push(`${MEASURES.find(x=>x[0]===key)[1]} is due`);
  if((item.tasks||[]).some(task=>task.status==='pending'&&task.due_date&&task.due_date<today)) attention.push('Task overdue');
  for(const event of (item.study_events||[]).filter(event=>!event.resolved_at)) attention.push(`${event.event_type.replaceAll('_',' ')} unresolved`);
  for(const missing of interventionReadiness(item).missing) attention.push(`${missing} needed for intervention`);
  attention.push(...observationAttention(item));
  return attention;
}
export function studyWideAttention(tasks,today=new Date().toISOString().slice(0,10)){return (tasks||[]).filter(t=>t.status==='pending'&&t.due_date&&t.due_date<today).map(t=>`Study task overdue: ${t.title}`);}
export function timelineForCase(item){
  const rows=[];
  const display=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  for(const x of item.checklist_history||[]) rows.push({date:x.status_date,category:'Protocol',label:`${CHECKLIST.find(([key])=>key===x.item_key)?.[1]||display(x.item_key)} — ${display(x.status)}`});
  for(const x of item.phase_history||[]) rows.push({date:x.effective_date,category:'Phase',label:display(x.phase)});
  for(const x of item.measure_history||[]) rows.push({date:x.recorded_at,category:'Measure',label:`${MEASURES.find(([key])=>key===x.measure_key)?.[1]||display(x.measure_key)} — ${display(x.status)}`});
  for(const x of item.tasks||[]) if(x.completed_at) rows.push({date:x.completed_at,category:'Task',label:`${x.title} — ${display(x.status)}`});
  for(const x of item.coaching_contacts||[]) rows.push({date:x.contact_date,category:'Coaching',label:`${display(x.format)} · ${x.provider_role}`});
  for(const x of item.study_events||[]){const event=display(x.event_type);rows.push({date:x.event_date,category:'Study event',label:event});if(x.resolved_at)rows.push({date:x.resolved_at,category:'Study event',label:`${event} — Resolved`});}
  for(const x of item.observation_data?.observations||[]){if(x.summary_revision_id)rows.push({date:x.observation_date,category:'Observation',label:`${display(x.phase)} observation #${x.session_number} completed`});const correctedAt=correctionEvent(x);if(correctedAt)rows.push({date:correctedAt,category:'Observation',label:`${display(x.phase)} observation #${x.session_number} corrected`});if(x.ioa)rows.push({date:x.observation_date,category:'IOA',label:`Teacher ${x.ioa.teacher_fidelity_ioa_percent??'NC'}%, Student ${x.ioa.student_behavior_ioa_percent??'NC'}%`});}
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
