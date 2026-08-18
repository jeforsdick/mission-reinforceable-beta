export const CHECKLIST = [
  ['teacher_consent','Teacher consent obtained'],['parent_permission','Parent/guardian permission obtained'],['student_assent','Student assent obtained'],
  ['bsp_technical_review','BSP technical-adequacy review completed'],['safety_screen','Safety / delayed-intervention appropriateness reviewed'],
  ['target_routine_finalized','Target classroom routine finalized'],['target_behavior_definition','Student target behavior operational definition finalized'],
  ['fidelity_checklist_finalized','Individualized teacher BSP fidelity checklist finalized'],['fidelity_checklist_second_review','Second behavior-support reviewer approved fidelity checklist'],
  ['baseline_orientation','Baseline study orientation completed'],['intervention_orientation','Mission: Reinforceable intervention orientation completed']
];
export const MEASURES = [['tses_pre','TSES — Pre-Baseline'],['tses_post','TSES — Post-Intervention'],['urp_ir','URP-IR — Post-Intervention'],['teacher_interview','Teacher Interview — Post-Intervention']];
export const PHASES = ['prebaseline','baseline','intervention','maintenance','complete','withdrawn'];
export const requiredBaselineKeys = CHECKLIST.slice(0,10).map(([key])=>key);

export function currentByKey(rows,key='item_key'){ return Object.fromEntries((rows||[]).map(row=>[row[key],row])); }
export function attentionForCase(item,today=new Date().toISOString().slice(0,10)) {
  const checklist=currentByKey(item.checklist), measures=currentByKey(item.measures,'measure_key'), phase=item.current_phase||'prebaseline', attention=[];
  if(!item.protocol) attention.push('Protocol stagger plan not assigned');
  const missing=requiredBaselineKeys.filter(key=>key==='student_assent'?!['complete','not_applicable'].includes(checklist[key]?.status):checklist[key]?.status!=='complete');
  if(phase==='prebaseline'&&missing.length) attention.push(`${missing.length} pre-baseline requirement${missing.length===1?'':'s'} incomplete`);
  if(['baseline','intervention','maintenance','complete'].includes(phase)&&measures.tses_pre?.status!=='complete') attention.push('TSES Pre is missing after baseline start');
  if(['maintenance','complete'].includes(phase)) for(const key of ['tses_post','urp_ir','teacher_interview']) if(measures[key]?.status!=='complete') attention.push(`${MEASURES.find(x=>x[0]===key)[1]} is due`);
  if((item.tasks||[]).some(task=>task.status==='pending'&&task.due_date<today)) attention.push('Operational task overdue');
  for(const event of (item.study_events||[]).filter(event=>!event.resolved_at)) attention.push(`${event.event_type.replaceAll('_',' ')} unresolved`);
  return attention;
}
export function timelineForCase(item){
  const rows=[];
  for(const e of item.checklist_history||[]) rows.push({date:e.recorded_at,category:'Protocol',label:`${e.item_key.replaceAll('_',' ')} — ${e.status}`});
  for(const e of item.phase_history||[]) rows.push({date:e.effective_date,category:'Phase',label:e.phase});
  for(const e of item.measure_history||[]) rows.push({date:e.recorded_at,category:'Measure',label:`${e.measure_key.replaceAll('_',' ')} — ${e.status}`});
  for(const e of item.tasks||[]) if(e.completed_at) rows.push({date:e.completed_at,category:'Task',label:`${e.title} — ${e.status}`});
  for(const e of item.coaching_contacts||[]) rows.push({date:e.contact_date,category:'Coaching as usual',label:`${e.format.replaceAll('_',' ')} · ${e.provider_role}`});
  for(const e of item.study_events||[]){ rows.push({date:e.event_date,category:'Study event',label:e.event_type.replaceAll('_',' ')}); if(e.resolved_at) rows.push({date:e.resolved_at,category:'Study event',label:`${e.event_type.replaceAll('_',' ')} resolved`}); }
  return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
