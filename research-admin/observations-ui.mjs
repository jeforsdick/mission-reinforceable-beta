import { denverWeek } from './observations-model.mjs';
const pct=value=>value===null||value===undefined?'Not enough data':`${Number(value).toFixed(1).replace(/\.0$/,'')}%`;
const checked=condition=>condition?' checked':'';
const dateLabel=value=>{const date=new Date(`${value}T12:00:00Z`);return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);};
const timeLabel=value=>{if(!value)return '';const [hour,minute]=value.slice(0,5).split(':').map(Number);return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`;};

export function renderObserverTeam(data,e){
 const plannedRole = observer => {
   const name = String(observer.display_name || "").toLowerCase();
   if (name.startsWith("austen") || name.startsWith("casey") || name.startsWith("melissa")) return {label:"Main collector",order:1};
   if (name.startsWith("jess")) return {label:"IOA lead",order:2};
   if (name.startsWith("kathleen") || name.startsWith("jakob")) return {label:"Back-up observer",order:3};
   return {label:"Observer",order:4};
 };
 const observers=[...(data.observers||[])].sort((a,b)=>{
   const roleDiff=plannedRole(a).order-plannedRole(b).order;
   return roleDiff || String(a.display_name||"").localeCompare(String(b.display_name||""));
 });
 const rows=observers.map(observer=>`
   <article class="observer-roster-card">
     <div class="observer-roster-head">
       <div>
         <strong>${e(observer.display_name)}</strong>
         <span class="planned-role">${e(plannedRole(observer).label)}</span>
         <span>${e(observer.observer_code)} · ${e(observer.observer_type.replaceAll('_',' '))}</span>
       </div>
       <div class="roster-status-group">
         <span class="roster-status roster">${observer.active?'On roster':'Inactive'}</span>
         <span class="roster-status ${observer.status==='qualified'?'qualified':observer.status==='recalibration_required'?'needs':'pending'}">${observer.status==='qualified'?'Cleared for live observations':observer.status==='recalibration_required'?'Recalibration required':'Training pending'}</span>
       </div>
     </div>
     <details class="observer-edit-details">
       <summary>Edit observer</summary>
       <form class="observer-edit-form compact-form" data-id="${observer.id}">
         <label>Code<input name="code" maxlength="16" value="${e(observer.observer_code)}" required></label>
         <label>Display name<input name="name" maxlength="160" value="${e(observer.display_name)}" required></label>
         <input type="hidden" name="type" value="${observer.observer_type}">
         <label class="check-option"><input type="checkbox" name="active"${checked(observer.active)}> Active</label>
         <button class="quiet">Save observer</button>
       </form>
       <form class="observer-login-form compact-form" data-id="${observer.id}">
         <label>Observer login email<input name="email" type="email" autocomplete="off" value="${e(observer.login_email||'')}" placeholder="name@utah.edu" required></label>
         <div class="observer-login-actions">
           <button class="quiet" type="submit">Save login email</button>
           <button class="primary provision-observer-account" data-id="${observer.id}" type="button">Create / Link Secure Account</button>
         </div>
         <small>Used for secure Observer Training and the live Observer Portal. Account setup does not send an email.</small>
       </form>
       ${observer.training_history?.length?`<details class="legacy-training-details"><summary>Legacy training history</summary><ol>${observer.training_history.map(x=>`<li>${e(x.event_date)} · ${e(x.event_type)} · Teacher ${pct(x.teacher_fidelity_agreement)} · Student ${pct(x.student_behavior_agreement)}</li>`).join('')}</ol></details>`:''}
     </details>
   </article>
 `).join('')||'<p class="empty-admin-state">No live observers registered yet.</p>';

 return `
   <section class="panel observer-team observer-roster-panel">
     <div class="section-heading">
       <div><p class="eyebrow">Observers</p><h2>Live Observation Roster</h2></div>
       <p>Observer IDs used for classroom observations and IOA.</p>
     </div>
     <p id="observer-message" class="success-message" role="status" aria-live="polite"></p>
     <div class="observer-roster-grid">${rows}</div>
     <details class="observer-roster-manager">
       <summary>Manage observer roster</summary>
       <form id="observer-form" class="compact-form observer-add-form">
         <label>Observer code<input name="code" maxlength="16" required></label>
         <label>Display name<input name="name" maxlength="160" required></label>
         <label>Observer type<select name="type"><option value="trained_observer">Trained observer</option><option value="primary_researcher">Primary researcher</option></select></label>
         <button class="primary">Add observer</button>
       </form>
     </details>
   </section>`;
}

export function renderStudyIoaSummary(data,e,allowedStudyIds=null){
 const rows=(data.by_dyad||[]).filter(row=>!allowedStudyIds||allowedStudyIds.has(row.study_id));
 const completed=rows.reduce((sum,row)=>sum+Number(row.completed||0),0);
 const ioa=rows.reduce((sum,row)=>sum+Number(row.ioa||0),0);
 const percent=completed?(ioa/completed)*100:0;
 return `
   <section class="panel study-ioa-summary">
     <div class="section-heading">
       <div><p class="eyebrow">IOA</p><h2>Study IOA</h2></div>
       <p>Finalized dissertation observations only. Test-case data are excluded.</p>
     </div>
     <div class="observation-stats">
       <div><span>Completed observations</span><strong>${completed}</strong></div>
       <div><span>IOA coverage</span><strong>${pct(percent)}</strong></div>
     </div>
     ${rows.length?`<div class="ioa-case-list">${rows.map(x=>`<div><strong>${e(x.study_id)}</strong><span>${x.ioa} of ${x.completed} with IOA · ${pct(x.percent)}</span></div>`).join('')}</div>`:'<p class="empty-admin-state">No finalized dissertation observations yet.</p>'}
   </section>`;
}

export function newObservationForm(item,setup,primaryOptions,secondaryOptions,e,{id,heading}){
 return `<form id="${id}" class="observation-summary-form record-observation-form"><h3>${e(heading)}</h3>${setup?'':'<p class="attention">Save Observation Setup before recording an observation.</p>'}<h4>Observation Details</h4><div class="summary-form-grid"><label>Date<input name="date" type="date" required></label><label>Primary observer<select name="primary" required><option value="">Select</option>${primaryOptions.map(x=>`<option value="${x.id}">${e(x.observer_code)}</option>`).join('')}</select></label><label>Start time — optional<input name="start" type="time"></label><label>End time — optional<input name="end" type="time"></label><p class="phase-helper">Phase: <strong>Choose a date</strong></p><label class="wide">Observation note — optional<textarea name="note" maxlength="1000"></textarea></label></div><h4>Observation Results</h4><div class="summary-form-grid"><label>Teacher fidelity %<input name="teacher_fidelity_percent" type="number" min="0" max="100" step="any" required></label><label>Student target behavior %<input name="student_target_behavior_percent" type="number" min="0" max="100" step="any" required></label></div><h4>IOA</h4><fieldset class="ioa-choice"><legend>Was IOA collected?</legend><label><input type="radio" name="ioa_collected" value="no" checked> No</label><label><input type="radio" name="ioa_collected" value="yes"> Yes</label></fieldset><div class="summary-form-grid ioa-fields" hidden><label>IOA observer<select name="secondary"><option value="">Select</option>${secondaryOptions.map(x=>`<option value="${x.id}">${e(x.observer_code)}</option>`).join('')}</select></label><label>Teacher fidelity IOA %<input name="teacher_fidelity_ioa_percent" type="number" min="0" max="100" step="any"></label><label>Student behavior IOA %<input name="student_behavior_ioa_percent" type="number" min="0" max="100" step="any"></label><label>IOA note — optional<textarea name="ioa_note" maxlength="1000"></textarea></label></div><button class="primary"${setup?'':' disabled'}>Save Observation</button></form>`;
}

function editSummaryForm(x,e){return `<form class="edit-summary-form summary-form-grid" data-observation="${x.id}" hidden><label>Teacher fidelity %<input name="teacher_fidelity_percent" type="number" min="0" max="100" step="any" value="${x.teacher_fidelity_percent}" required></label><label>Student target behavior %<input name="student_target_behavior_percent" type="number" min="0" max="100" step="any" value="${x.student_target_behavior_percent}" required></label>${x.ioa?`<label>Teacher fidelity IOA %<input name="teacher_fidelity_ioa_percent" type="number" min="0" max="100" step="any" value="${x.ioa?.teacher_fidelity_ioa_percent??''}" required></label><label>Student behavior IOA %<input name="student_behavior_ioa_percent" type="number" min="0" max="100" step="any" value="${x.ioa?.student_behavior_ioa_percent??''}" required></label><label>IOA note — optional<textarea name="ioa_note" maxlength="1000">${e(x.ioa_note||'')}</textarea></label>`:''}<label class="wide">Observation note — optional<textarea name="observation_note" maxlength="1000">${e(x.summary_observation_note||x.context_note||'')}</textarea></label><label class="wide">Correction reason<input name="correction_reason" maxlength="1000" required></label><button class="primary">Save Correction</button></form>`;}
function observerDisplay(observers,id){
 const observer=(observers||[]).find(x=>x.id===id);
 return observer?.display_name||observer?.observer_code||'Unassigned';
}
function scheduleStatusLabel(status){
 return String(status||'scheduled').replaceAll('_',' ').replace(/\b\w/g,ch=>ch.toUpperCase());
}
function secondaryRoleLabel(role){
 if(role==='formal_ioa')return 'Formal IOA';
 if(role==='supported_calibration')return 'Supported calibration';
 if(role==='calibration_and_ioa')return 'Calibration + IOA';
 return role?String(role).replaceAll('_',' '):'';
}
function compactObservationHistory(rows,phase,e){
 const title=phase[0].toUpperCase()+phase.slice(1);
 const completed=[...rows].filter(x=>x.summary_revision_id).sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)));
 if(!completed.length)return `<p class="empty-admin-state">No completed ${e(title.toLowerCase())} observations yet.</p>`;
 return `<div class="compact-observation-history">${completed.map(x=>{
   const note=x.summary_observation_note||x.context_note;
   const ioaAlert=x.ioa?.overall_ioa_attention===true;
   return `<article class="compact-observation-record" id="observation-${x.id}">
     <div class="compact-observation-main">
       <div><strong>${e(dateLabel(x.observation_date))}</strong><span>Observation #${e(x.session_number)} · ${e(x.primary_observer_code||'Observer')}</span></div>
       <div class="compact-observation-values"><span>Fidelity <strong>${pct(x.teacher_fidelity_percent)}</strong></span><span>Student behavior <strong>${pct(x.student_target_behavior_percent)}</strong></span></div>
       <span class="compact-ioa-badge ${x.ioa?'has-ioa':'no-ioa'}">${x.ioa?'IOA collected':'No IOA'}</span>
     </div>
     ${ioaAlert?'<p class="attention">IOA needs researcher review / recalibration follow-up.</p>':''}
     <details class="observation-record-details">
       <summary>Details / correct record</summary>
       ${x.start_time||x.end_time?`<p><strong>Time:</strong> ${e(timeLabel(x.start_time)||'—')}–${e(timeLabel(x.end_time)||'—')}</p>`:''}
       ${x.ioa?`<p><strong>IOA observer:</strong> ${e(x.secondary_observer_code||'—')}<br>Teacher fidelity IOA: ${pct(x.ioa?.teacher_fidelity_ioa_percent)}<br>Student behavior IOA: ${pct(x.ioa?.student_behavior_ioa_percent)}</p>`:''}
       ${note?`<p><strong>Notes:</strong> ${e(note)}</p>`:''}
       <button type="button" class="quiet edit-summary-toggle" data-observation="${x.id}">Correct summary</button>
       ${editSummaryForm(x,e)}
     </details>
   </article>`;
 }).join('')}</div>`;
}
function renderInterventionObservationWorkspace(item,e){
 const data=item.observation_data||{},setup=(data.setups||[])[0],schedule=data.schedule||null,observers=data.observers||[];
 const rows=(data.observations||[]).filter(x=>x.phase==='intervention');
 const completed=[...rows].filter(x=>x.summary_revision_id).sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)));
 const latest=completed[0];
 const week=denverWeek();
 const slots=(data.schedule_slots||[]).filter(slot=>slot.observation_date>=week.monday&&slot.observation_date<=week.sunday).sort((a,b)=>String(a.observation_date).localeCompare(String(b.observation_date)));
 const target=Number(schedule?.weekly_target_days||3);
 const assigned=slots.filter(slot=>slot.primary_observer_id&&!['cancelled','needs_reschedule'].includes(slot.status)).length;
 const completeSlots=slots.filter(slot=>slot.status==='completed').length;
 const completedThisWeek=completed.filter(x=>x.observation_date>=week.monday&&x.observation_date<=week.sunday).length;
 const completedCount=Math.max(completeSlots,completedThisWeek);
 const reschedules=slots.filter(slot=>slot.status==='needs_reschedule').length;
 const plannedIoa=slots.filter(slot=>['formal_ioa','calibration_and_ioa'].includes(slot.secondary_role)&&slot.status!=='cancelled').length;
 const ioaThisWeek=completed.filter(x=>x.observation_date>=week.monday&&x.observation_date<=week.sunday&&x.ioa).length;
 let consecutive90=0;
 for(const row of completed){if(Number(row.teacher_fidelity_percent)>=90)consecutive90++;else break;}
 const scheduleRoutine=schedule?.routine_label||setup?.target_routine||'Routine not configured';
 const scheduleTime=schedule?`${timeLabel(schedule.routine_start_time)}–${timeLabel(schedule.routine_end_time)}`:'Time not set';
 const slotCards=slots.length?slots.map(slot=>{
   const secondary=slot.secondary_observer_id?`<span>${e(secondaryRoleLabel(slot.secondary_role))}: <strong>${e(observerDisplay(observers,slot.secondary_observer_id))}</strong></span>`:'';
   return `<article class="case-observation-slot ${e(slot.status)}">
     <div><strong>${e(dateLabel(slot.observation_date))}</strong><span>${e(scheduleStatusLabel(slot.status))}</span></div>
     <p>Primary: <strong>${e(observerDisplay(observers,slot.primary_observer_id))}</strong></p>
     ${secondary}
     ${slot.status==='needs_reschedule'?`<small>${e(slot.reschedule_reason||'Needs reschedule')}</small>`:''}
   </article>`;
 }).join(''):`<p class="empty-admin-state">No observation days are assigned for this week yet.</p>`;
 const primaryOptions=observers.filter(x=>x.active&&x.observer_type==='trained_observer'&&x.status==='qualified');
 const secondaryOptions=observers.filter(x=>x.active&&x.status==='qualified');
 const manualForm=item.current_phase==='intervention'?newObservationForm(item,setup,primaryOptions,secondaryOptions,e,{id:'record-intervention-observation-form',heading:'Administrative Manual Entry'}):'';
 return `<section class="intervention-observation-hub">
   <div class="intervention-observation-heading">
     <div><p class="eyebrow">Classroom Observations</p><h3>Observation Status</h3><p>30-minute sessions in the identified routine · target approximately 3 different school days per week.</p></div>
     <button id="open-weekly-observation-schedule" class="quiet" type="button">Manage Weekly Schedule</button>
   </div>
   <div class="routine-strip"><div><span>Routine</span><strong>${e(scheduleRoutine)}</strong></div><div><span>Observation time</span><strong>${e(scheduleTime)}</strong></div></div>
   <div class="intervention-observation-kpis">
     <div><span>This week</span><strong>${completedCount}/${target}</strong><small>completed</small></div>
     <div><span>Assigned</span><strong>${assigned}/${target}</strong><small>different days</small></div>
     <div><span>Reschedule</span><strong>${reschedules}</strong><small>owed this week</small></div>
     <div><span>IOA planned</span><strong>${plannedIoa}</strong><small>${ioaThisWeek} completed this week</small></div>
     <div><span>Cumulative IOA</span><strong>${pct(data.coverage?.percent||0)}</strong><small>${data.coverage?.ioa||0} of ${data.coverage?.completed||0}</small></div>
   </div>
   <div class="case-weekly-observation-schedule"><h4>This Week's Sessions</h4><div class="case-observation-slot-grid">${slotCards}</div></div>
   <div class="intervention-latest-data">
     <h4>Latest Data</h4>
     <div class="latest-data-grid">
       <div><span>Teacher fidelity</span><strong>${pct(latest?.teacher_fidelity_percent)}</strong></div>
       <div><span>Student target behavior</span><strong>${pct(latest?.student_target_behavior_percent)}</strong></div>
       <div><span>Maintenance criterion progress</span><strong>${Math.min(consecutive90,3)}/3</strong><small>consecutive sessions ≥90%</small></div>
       <div><span>Total intervention observations</span><strong>${completed.length}</strong></div>
     </div>
   </div>
   <details class="intervention-observation-history">
     <summary>Observation History (${completed.length})</summary>
     ${compactObservationHistory(rows,'intervention',e)}
   </details>
   ${manualForm?`<details class="admin-observation-fallback"><summary>Administrative fallback: enter a completed observation manually</summary><p class="neutral-note">Use only if a completed observation cannot be submitted or linked through the observer workflow.</p>${manualForm}</details>`:''}
 </section>`;
}

function renderBaselineObservationWorkspace(item,e){
 const data=item.observation_data||{},setup=(data.setups||[])[0],observers=data.observers||[];
 const rows=(data.observations||[]).filter(x=>x.phase==='baseline');
 const completed=[...rows].filter(x=>x.summary_revision_id).sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)));
 const latest=completed[0];
 const ioaCount=completed.filter(x=>x.ioa).length;
 const ioaPercent=completed.length?Math.round(1000*ioaCount/completed.length)/10:0;
 const planned=Number(item.protocol?.planned_baseline_observations||0);
 const position=Number(item.protocol?.stagger_position||0);
 const remaining=planned?Math.max(planned-completed.length,0):null;
 const planText=position===1
   ? 'First dyad: schedule a 30-minute baseline observation each school day when the routine occurs and the teacher/student are present, until the minimum baseline requirement is met.'
   : position>1
     ? 'Later dyad: collect intermittent baseline probes at least weekly while waiting, then collect at least 3 consecutive observation sessions immediately before Intervention.'
     : 'Assign the baseline stagger position in Setup to display the planned probe pattern.';
 const nextText=!planned
   ? 'Assign the baseline stagger position before data collection begins.'
   : completed.length<planned
     ? `Continue baseline probes. ${remaining} observation${remaining===1?'':'s'} remain before the planned minimum is met.`
     : position>1
       ? 'Planned minimum met. Review data stability and confirm the required final consecutive pre-intervention observations before making the phase decision.'
       : 'Planned minimum met. Review data stability before making the phase decision.';
 const primaryOptions=observers.filter(x=>x.active&&x.observer_type==='trained_observer'&&x.status==='qualified');
 const secondaryOptions=observers.filter(x=>x.active&&x.status==='qualified');
 const manualForm=item.current_phase==='baseline'
   ? newObservationForm(item,setup,primaryOptions,secondaryOptions,e,{id:'record-baseline-observation-form',heading:'Administrative Manual Entry'})
   : '';
 return `<section class="baseline-observation-hub">
   <div class="baseline-observation-heading">
     <div><p class="eyebrow">Baseline</p><h2>Baseline Progress</h2><p>30-minute observations in the identified classroom routine before Mission: Reinforceable is introduced.</p></div>
     <span class="phase-chip">${planned?`${completed.length}/${planned} minimum`:'Not assigned'}</span>
   </div>
   <div class="baseline-progress-grid">
     <div><span>Planned minimum</span><strong>${planned||'—'}</strong><small>${position?`Stagger position ${position}`:'Assign in Setup'}</small></div>
     <div><span>Completed</span><strong>${completed.length}</strong><small>${remaining===null?'—':remaining===0?'Minimum met':`${remaining} remaining`}</small></div>
     <div><span>Baseline IOA</span><strong>${ioaPercent.toFixed(1)}%</strong><small>${ioaCount} of ${completed.length} observations</small></div>
     <div><span>Latest fidelity</span><strong>${pct(latest?.teacher_fidelity_percent)}</strong></div>
     <div><span>Latest student behavior</span><strong>${pct(latest?.student_target_behavior_percent)}</strong></div>
   </div>
   <div class="baseline-collection-plan">
     <div><span>Collection Plan</span><p>${e(planText)}</p></div>
     <div class="baseline-next-action"><span>Next</span><strong>${e(nextText)}</strong></div>
   </div>
   <details class="baseline-observation-history">
     <summary>Observation History (${completed.length})</summary>
     ${compactObservationHistory(rows,'baseline',e)}
   </details>
   ${manualForm?`<details class="admin-observation-fallback"><summary>Administrative fallback: enter a completed observation manually</summary><p class="neutral-note">Use only if a completed observation cannot be submitted or linked through the observer workflow.</p>${manualForm}</details>`:''}
 </section>`;
}


function renderMaintenanceObservationWorkspace(item,e){
 const data=item.observation_data||{},setup=(data.setups||[])[0],observers=data.observers||[];
 const rows=(data.observations||[]).filter(x=>x.phase==="maintenance");
 const completed=[...rows].filter(x=>x.summary_revision_id).sort((a,b)=>String(b.observation_date).localeCompare(String(a.observation_date)));
 const latest=completed[0];
 const ioaCount=completed.filter(x=>x.ioa).length;
 const ioaPercent=completed.length?Math.round(1000*ioaCount/completed.length)/10:0;
 const remainingToMinimum=Math.max(2-completed.length,0);
 const nextText=completed.length===0
   ? "Schedule the first maintenance probe."
   : completed.length===1
     ? "Schedule maintenance probe 2."
     : completed.length===2
       ? "Minimum maintenance target met. Decide whether a third probe is needed before closeout."
       : "Maintenance probe target complete. Review the pattern and proceed to closeout when appropriate.";
 const primaryOptions=observers.filter(x=>x.active&&x.observer_type==="trained_observer"&&x.status==="qualified");
 const secondaryOptions=observers.filter(x=>x.active&&x.status==="qualified");
 const manualForm=item.current_phase==="maintenance"
   ? newObservationForm(item,setup,primaryOptions,secondaryOptions,e,{id:"record-maintenance-observation-form",heading:"Administrative Manual Entry"})
   : "";
 return `<section class="maintenance-observation-hub">
   <div class="maintenance-observation-heading">
     <div><p class="eyebrow">Maintenance Probes</p><h2>Maintenance Progress</h2><p>Follow-up observations after Mission: Reinforceable is withdrawn · target 2–3 probes across approximately 3–5 weeks.</p></div>
     <span class="phase-chip">${completed.length}/2–3 probes</span>
   </div>
   <div class="maintenance-progress-grid">
     <div><span>Completed probes</span><strong>${completed.length}</strong><small>${remainingToMinimum?`${remainingToMinimum} to minimum`:"Minimum met"}</small></div>
     <div><span>Maintenance IOA</span><strong>${ioaPercent.toFixed(1)}%</strong><small>${ioaCount} of ${completed.length} probes</small></div>
     <div><span>Latest fidelity</span><strong>${pct(latest?.teacher_fidelity_percent)}</strong></div>
     <div><span>Latest student behavior</span><strong>${pct(latest?.student_target_behavior_percent)}</strong></div>
   </div>
   <div class="maintenance-plan-card">
     <div><span>Probe Plan</span><p>Use the same classroom routine from prior phases when feasible. Distribute 2–3 follow-up probes across approximately 3–5 weeks.</p></div>
     <div class="maintenance-next-action"><span>Next</span><strong>${e(nextText)}</strong></div>
   </div>
   <details class="maintenance-observation-history">
     <summary>Observation History (${completed.length})</summary>
     ${compactObservationHistory(rows,"maintenance",e)}
   </details>
   ${manualForm?`<details class="admin-observation-fallback"><summary>Administrative fallback: enter a completed probe manually</summary><p class="neutral-note">Use only if a completed maintenance probe cannot be submitted or linked through the observer workflow.</p>${manualForm}</details>`:""}
 </section>`;
}
export function renderObservationSetup(item,e){
 const setup=(item.observation_data?.setups||[])[0];
 const setupBanner=setup?`<div class="setup-banner"><p class="eyebrow">Observation Setup</p><p><strong>Routine:</strong> ${e(setup.target_routine)}<br><strong>Target behavior:</strong><br>${e(setup.target_behavior_definition)}</p><button type="button" id="edit-observation-setup" class="quiet">Edit</button></div>`:'';
 const setupForm=`<form id="observation-setup-form" class="compact-form"${setup?' hidden':''}><h3>Observation Setup</h3><label>Routine<input name="routine" maxlength="1000" value="${e(setup?.target_routine||'')}" required></label><label>Target behavior definition<textarea name="definition" maxlength="2000" required>${e(setup?.target_behavior_definition||'')}</textarea></label><label>Change note — optional<input name="change_note" maxlength="1000"></label><button class="primary">Save Observation Setup</button></form>`;
 return `<div class="observation-setup">${setupBanner}${setupForm}</div>`;
}

export function renderPhaseObservationWorkspace(item,phase,e){
 if(phase==='intervention')return renderInterventionObservationWorkspace(item,e);
 if(phase==='baseline')return renderBaselineObservationWorkspace(item,e);
 if(phase==='maintenance')return renderMaintenanceObservationWorkspace(item,e);
 const data=item.observation_data||{},setup=(data.setups||[])[0],observers=data.observers||[];
 const rows=(data.observations||[]).filter(x=>x.phase===phase),completed=rows.filter(x=>x.summary_revision_id),latest=completed[0],ioa=completed.filter(x=>x.ioa).length;
 const title=phase[0].toUpperCase()+phase.slice(1);
 const history=rows.map(x=>{const note=x.summary_observation_note||x.context_note;const time=x.start_time||x.end_time?`${timeLabel(x.start_time)||'—'}–${timeLabel(x.end_time)||'—'} · `:'';const alerts=[];if(x.ioa?.teacher_fidelity_ioa_percent!=null&&Number(x.ioa.teacher_fidelity_ioa_percent)<=80)alerts.push(`Needs review — Teacher fidelity IOA is ${pct(x.ioa.teacher_fidelity_ioa_percent)}. Recalibration required.`);if(x.ioa?.student_behavior_ioa_percent!=null&&Number(x.ioa.student_behavior_ioa_percent)<=80)alerts.push(`Needs review — Student behavior IOA is ${Number(x.ioa.student_behavior_ioa_percent)===80?'80%':'below criterion'}. Recalibration required.`);return `<li id="observation-${x.id}"><strong>${e(dateLabel(x.observation_date))} · ${e(title)} · Observation #${x.session_number}</strong><p>${time}${e(x.primary_observer_code)}</p><p>Teacher fidelity: <strong>${pct(x.teacher_fidelity_percent)}</strong><br>Student target behavior: <strong>${pct(x.student_target_behavior_percent)}</strong></p>${x.ioa?`<p>IOA: ${e(x.secondary_observer_code)}<br>Teacher fidelity IOA: ${pct(x.ioa?.teacher_fidelity_ioa_percent)}<br>Student behavior IOA: ${pct(x.ioa?.student_behavior_ioa_percent)}</p>`:'<p>IOA: Not collected</p>'}${alerts.map(a=>`<p class="attention">${a}</p>`).join('')}${note?`<p>Notes: ${e(note)}</p>`:''}<button type="button" class="quiet edit-summary-toggle" data-observation="${x.id}">Edit Summary</button>${editSummaryForm(x,e)}</li>`;}).join('')||`<li>No ${e(title.toLowerCase())} classroom observations.</li>`;
 const primaryOptions=observers.filter(x=>x.active&&x.observer_type==='trained_observer'&&x.status==='qualified'),secondaryOptions=observers.filter(x=>x.active&&x.status==='qualified');
 const extra=phase==='baseline'?`<div><span>Planned minimum</span><strong>${item.protocol?.planned_baseline_observations||'Not assigned'}</strong></div>`:phase==='maintenance'?'<div><span>Target</span><strong>2–3 probes</strong></div>':'';
 const stats=`<div class="observation-stats phase-observation-summary"><div><span>Completed observations in this phase</span><strong>${completed.length}</strong></div><div><span>Latest teacher fidelity in this phase</span><strong>${pct(latest?.teacher_fidelity_percent)}</strong></div><div><span>Latest student target behavior in this phase</span><strong>${pct(latest?.student_target_behavior_percent)}</strong></div><div><span>IOA collected in this phase</span><strong>${ioa} / ${completed.length}</strong></div>${extra}</div>`;
 const form=item.current_phase===phase?newObservationForm(item,setup,primaryOptions,secondaryOptions,e,{id:`record-${phase}-observation-form`,heading:`Record ${title} Observation`}):'';
 return `<div class="phase-observation-workspace" data-phase="${phase}"><h3>Classroom Observations</h3>${stats}${form}<h3>${title} Observation History</h3><ol class="observation-history" data-phase="${phase}">${history}</ol></div>`;
}

export function recordPayload(form){const f=new FormData(form);return {teacher_fidelity_percent:Number(f.get('teacher_fidelity_percent')),student_target_behavior_percent:Number(f.get('student_target_behavior_percent')),teacher_fidelity_ioa_percent:f.get('teacher_fidelity_ioa_percent')===''?null:Number(f.get('teacher_fidelity_ioa_percent')),student_behavior_ioa_percent:f.get('student_behavior_ioa_percent')===''?null:Number(f.get('student_behavior_ioa_percent'))};}
