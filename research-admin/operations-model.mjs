export const CHECKLIST = [
  ['teacher_consent','Teacher consent obtained'],['parent_permission','Parent/guardian permission obtained'],['student_assent','Student assent obtained'],
  ['bsp_technical_review','BSP technical-adequacy review completed'],['safety_screen','Safety / delayed-intervention appropriateness reviewed'],
  ['target_routine_finalized','Target classroom routine finalized'],['target_behavior_definition','Student target behavior operational definition finalized'],
  ['fidelity_checklist_finalized','Individualized teacher BSP fidelity checklist finalized'],['fidelity_checklist_second_review','Second behavior-support reviewer approved fidelity checklist'],
  ['baseline_orientation','Baseline study orientation completed'],['intervention_orientation','Mission: Reinforceable intervention orientation completed']
];
export const MEASURES = [['tses_pre','TSES — Pre-Baseline'],['tses_post','TSES — Post-Intervention'],['urp_ir','URP-IR — Post-Intervention'],['teacher_interview','Teacher Interview — Post-Intervention']];
export const PHASES = ['prebaseline','baseline','intervention','maintenance','complete','withdrawn'];
export const COACHING_FOCUSES = ['observation','consultation','performance_feedback','modeling','data_review','problem_solving','responsive_support','other'];
export const TASK_CATEGORIES = ['meeting','follow_up','scheduling','research_admin','observation_planning','measure_follow_up','closeout','other'];
export const requiredBaselineKeys = CHECKLIST.slice(0,10).map(([key])=>key);
export function denverToday(now=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function checklistStatuses(itemKey){return itemKey==='student_assent'?['pending','complete','not_applicable']:['pending','complete'];}
export function currentByKey(rows,key='item_key'){ return Object.fromEntries((rows||[]).map(row=>[row[key],row])); }
export function baselineReadiness(item){
  const checklist=currentByKey(item.checklist), measures=currentByKey(item.measures,'measure_key'), missing=[];
  if(!item.protocol) missing.push('Protocol stagger plan');
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
  if(['maintenance','complete'].includes(phase)) for(const key of ['tses_post','urp_ir','teacher_interview']) if(current[key]?.status!=='complete') keys.push(key);
  return keys;
}
export function interventionReadiness(item){
  if(item.current_phase!=='intervention') return {ready:true,missing:[]};
  const checklist=currentByKey(item.checklist), missing=[];
  if(checklist.intervention_orientation?.status!=='complete') missing.push('Intervention orientation');
  if(!item.prepared_content?.protected_content_present) missing.push('Protected content');
  if(!item.prepared_content?.resource_map_ready) missing.push('Resource Map');
  if(!item.prepared_content?.comparability_ready) missing.push('Mission Bank Comparability');
  if(!(item.case_active&&item.participant_active)) missing.push('Game access ON');
  if(!item.prepared_content?.reminders_enabled) missing.push('Reminders ON');
  return {ready:missing.length===0,missing};
}
export function attentionForCase(item,today=new Date().toISOString().slice(0,10)) {
  const phase=item.current_phase||'prebaseline', attention=[], baseline=baselineReadiness(item);
  if(phase==='prebaseline'&&!baseline.ready) attention.push(`${baseline.remaining} baseline requirement${baseline.remaining===1?'':'s'} remaining`);
  for(const key of measureNeeds(item)) attention.push(`${MEASURES.find(x=>x[0]===key)[1]} is due`);
  if((item.tasks||[]).some(task=>task.status==='pending'&&task.due_date&&task.due_date<today)) attention.push('Operational task overdue');
  for(const event of (item.study_events||[]).filter(event=>!event.resolved_at)) attention.push(`${event.event_type.replaceAll('_',' ')} unresolved`);
  for(const missing of interventionReadiness(item).missing) attention.push(`Intervention mismatch: ${missing}`);
  return attention;
}
export function studyWideAttention(tasks,today=new Date().toISOString().slice(0,10)){return (tasks||[]).filter(t=>t.status==='pending'&&t.due_date&&t.due_date<today).map(t=>`Study-wide task overdue: ${t.title}`);}
export function timelineForCase(item){
  const rows=[];
  for(const x of item.checklist_history||[]) rows.push({date:x.status_date,category:'Protocol',label:`${x.item_key.replaceAll('_',' ')} — ${x.status}`});
  for(const x of item.phase_history||[]) rows.push({date:x.effective_date,category:'Phase',label:x.phase});
  for(const x of item.measure_history||[]) rows.push({date:x.recorded_at,category:'Measure',label:`${x.measure_key.replaceAll('_',' ')} — ${x.status}`});
  for(const x of item.tasks||[]) if(x.completed_at) rows.push({date:x.completed_at,category:'Task',label:`${x.title} — ${x.status}`});
  for(const x of item.coaching_contacts||[]) rows.push({date:x.contact_date,category:'Coaching as usual',label:`${x.format.replaceAll('_',' ')} · ${x.provider_role}`});
  for(const x of item.study_events||[]){rows.push({date:x.event_date,category:'Study event',label:x.event_type.replaceAll('_',' ')});if(x.resolved_at)rows.push({date:x.resolved_at,category:'Study event',label:`${x.event_type.replaceAll('_',' ')} resolved`});}
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
