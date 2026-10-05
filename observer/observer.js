import { REAL_SESSION, calculateFidelity, calculateStudentBehavior, formatClock } from "/observe/observation-model.mjs";

const SUPABASE_URL = "https://vyiwwwmcoahwkgiictmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mp2ASOgrx0Yx8Bp-Fz3AAg_V5Gl0I4W";
const DENVER_TODAY = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Denver",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const SESSION_HANDOFF_KEY = "mr-observer-auth-handoff-v1";
const CANONICAL_ORIGIN = "https://www.missionreinforceable.com";

const $ = (id) => document.getElementById(id);
const views = ["loading-view","login-view","unauthorized-view","portal-view","session-view"].map($);
let client = null;
let observerId = null;
let clearanceStatus = "pending";
let observerType = null;
let onlineTrainingComplete = false;
let currentPacket = null;
let collection = null;
let timer = null;
let audioContext = null;
let cueAudio = null;
let saveTimer = null;

function show(viewId) {
  views.forEach((el) => { el.hidden = el.id !== viewId; });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function dateLabel(value) {
  const date = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat(undefined,{weekday:"long",month:"short",day:"numeric"}).format(date);
}
function timeLabel(value) {
  if (!value) return "—";
  const [h,m]=String(value).slice(0,5).split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`;
}
function roleLabel(slot,id) {
  if (slot.secondary_observer_id === id) {
    if (slot.secondary_role === "formal_ioa") return "Formal IOA";
    if (slot.secondary_role === "supported_calibration") return "Supported calibration";
    if (slot.secondary_role === "calibration_and_ioa") return "Calibration + IOA";
    return "Secondary observer";
  }
  return "Primary observer";
}
function humanStatus(status) {
  return String(status||"").replaceAll("_"," ").replace(/\b\w/g,(x)=>x.toUpperCase());
}
function canOpenSlot(slot) {
  return ["scheduled","confirmed","completed"].includes(slot.status);
}
function canStartSlot(slot) {
  const activeToday=slot.observation_date===DENVER_TODAY()
    && ["scheduled","confirmed"].includes(slot.status);
  if(!activeToday) return false;
  if(clearanceStatus==="revoked") return false;
  if(observerType==="primary_researcher") return true;
  if(clearanceStatus==="cleared") return true;
  if(slot.secondary_role!=="supported_calibration") return false;
  if(slot.primary_observer_id===observerId) return onlineTrainingComplete;
  return slot.secondary_observer_id===observerId;
}
function renderAssignments(slots) {
  if (!slots.length) {
    $("assignment-list").innerHTML = '<p class="empty-state">Nothing is currently assigned to you.</p>';
    return;
  }
  $("assignment-list").innerHTML = slots.map((slot) => {
    const role=roleLabel(slot,observerId);
    const open=canOpenSlot(slot);
    const today=slot.observation_date===DENVER_TODAY();
    const action=slot.status==="completed"?"View Completed":today&&canStartSlot(slot)?"Open Session":"View Session";
    return `<article class="assignment-card ${escapeHtml(slot.status)}">
      <div class="assignment-main">
        <strong>${escapeHtml(dateLabel(slot.observation_date))} · ${escapeHtml(slot.case_code_snapshot||"Case")}</strong>
        <span>${escapeHtml(slot.routine_label_snapshot||"Routine")} · ${escapeHtml(timeLabel(slot.planned_start_time))}–${escapeHtml(timeLabel(slot.planned_end_time))}</span>
        <small>${escapeHtml(humanStatus(slot.status))}</small>
      </div>
      <div class="assignment-actions">
        <span class="assignment-role">${escapeHtml(role)}</span>
        ${open?`<button class="primary-button open-session" data-slot="${escapeHtml(slot.id)}" type="button">${escapeHtml(action)}</button>`:""}
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll(".open-session").forEach((button)=>button.addEventListener("click",()=>openSession(button.dataset.slot)));
}

async function loadPortal() {
  stopTimer();
  show("loading-view");
  const session=(await client.auth.getSession()).data.session;
  if (!session) { show("login-view"); return; }

  const account=await client.from("research_observer_accounts")
    .select("observer_id,active")
    .eq("auth_user_id",session.user.id)
    .eq("active",true)
    .maybeSingle();
  if (account.error || !account.data) { show("unauthorized-view"); return; }

  observerId=account.data.observer_id;
  const [observer,clearance,slots,attempts,feedback,questions]=await Promise.all([
    client.from("research_observers").select("display_name,observer_code,observer_type").eq("id",observerId).maybeSingle(),
    client.from("research_observer_clearance").select("clearance_status,clearance_note").eq("observer_id",observerId).maybeSingle(),
    client.from("research_observation_schedule_slots")
      .select("*")
      .gte("observation_date",new Date(Date.now()-7*86400000).toISOString().slice(0,10))
      .order("observation_date",{ascending:true}),
    client.from("observer_training_attempts").select("case_id,qualified,submitted_at").order("submitted_at",{ascending:false}),
    client.from("observer_training_feedback").select("id,submitted_at").order("submitted_at",{ascending:false}).limit(1),
    client.from("observer_training_questions").select("id,submitted_at").order("submitted_at",{ascending:false}).limit(1)
  ]);
  if (observer.error || clearance.error || slots.error || attempts.error || feedback.error || questions.error) {
    show("unauthorized-view");
    return;
  }

  $("observer-name").textContent=observer.data?.display_name||"Observer";
  observerType=observer.data?.observer_type||null;
  clearanceStatus=clearance.data?.clearance_status||"pending";

  const latestByCase={};
  for(const row of attempts.data||[]) if(!latestByCase[row.case_id]) latestByCase[row.case_id]=row;
  const nora=latestByCase.nora, kai=latestByCase.kai;
  const onlineComplete=Boolean(nora?.qualified===true&&kai?.qualified===true&&(feedback.data||[]).length&&(questions.data||[]).length);
  onlineTrainingComplete=onlineComplete;
  const anyTraining=Boolean((attempts.data||[]).length||(feedback.data||[]).length||(questions.data||[]).length);
  if(observerType==="primary_researcher"){
    $("training-status-label").textContent="Researcher access";
    $("training-status-help").textContent="Observer training is not required for your primary researcher role.";
  }else if(clearanceStatus==="cleared"){
    $("training-status-label").textContent="Training complete";
    $("training-status-help").textContent="You are cleared for independent observations.";
  }else if(kai&&kai.qualified===false){
    $("training-status-label").textContent="Qualification needs review";
    $("training-status-help").textContent="Jess will review your qualification attempt and next steps with you.";
  }else if(onlineComplete){
    $("training-status-label").textContent="Online qualification complete";
    $("training-status-help").textContent="Field calibration is still required before independent collection.";
  }else if(anyTraining){
    $("training-status-label").textContent="Training in progress";
    $("training-status-help").textContent="Continue your asynchronous observer training.";
  }else{
    $("training-status-label").textContent="Training not started";
    $("training-status-help").textContent="Complete the asynchronous training before live data collection.";
  }

  const calibrationAssignment=(slots.data||[]).some((slot)=>
    slot.secondary_role==="supported_calibration"
    && ["scheduled","confirmed"].includes(slot.status)
    && (slot.primary_observer_id===observerId||slot.secondary_observer_id===observerId)
  );
  if (observerType==="primary_researcher" && clearanceStatus!=="revoked") {
    $("readiness-status").textContent="Researcher collection access ready";
    $("readiness-help").textContent="You may be assigned as a backup primary observer or as the paired calibration / IOA observer.";
  } else if (clearanceStatus==="cleared") {
    $("readiness-status").textContent="Cleared for independent observations";
    $("readiness-help").textContent="Open an assigned session on its scheduled date to collect data.";
  } else if (clearanceStatus==="revoked") {
    $("readiness-status").textContent="Recalibration required";
    $("readiness-help").textContent="Do not collect independently until Jess clears you again.";
  } else if (calibrationAssignment && (onlineComplete || (slots.data||[]).some((slot)=>slot.secondary_role==="supported_calibration"&&slot.secondary_observer_id===observerId))) {
    $("readiness-status").textContent="Field calibration ready";
    $("readiness-help").textContent="Your supported calibration session can be collected before independent clearance.";
  } else {
    $("readiness-status").textContent="Live collection locked";
    $("readiness-help").textContent=onlineComplete
      ?"Online qualification is complete; a supported field-calibration session is the next step."
      :"Complete training and calibration before independent collection.";
  }

  renderAssignments(slots.data||[]);
  show("portal-view");

  const next=new URL(window.location.href).searchParams.get("next");
  if(next==="/observe/"||next==="/observe") window.location.replace(CANONICAL_ORIGIN+"/observe/");
}

async function openSession(slotId) {
  $("start-error").textContent="";
  show("loading-view");
  const result=await client.rpc("research_observer_observation_packet",{target_slot_id:slotId});
  if (result.error) {
    show("portal-view");
    window.alert(result.error.message);
    return;
  }
  currentPacket=result.data;
  renderSession();
  show("session-view");
}

function renderSession() {
  const packet=currentPacket;
  const slot=packet.slot;
  $("session-title").textContent=`${slot.case_code||"Case"} · ${dateLabel(slot.observation_date)}`;
  $("session-meta").textContent=`${slot.routine_label||"Routine"} · ${timeLabel(slot.planned_start_time)}–${timeLabel(slot.planned_end_time)} · ${humanStatus(packet.phase)}`;
  $("session-role").textContent=packet.observer.role==="primary"
    ?(slot.secondary_role==="supported_calibration"?"Primary observer · Supported calibration":"Primary observer")
    :roleLabel({
    secondary_observer_id:packet.observer.id,
    secondary_role:slot.secondary_role
  },packet.observer.id);
  $("session-routine").textContent=packet.setup?.target_routine||slot.routine_label||"Routine";
  $("session-behavior").textContent=packet.setup?.target_behavior_definition||"Target behavior definition unavailable.";
  $("collector-case").textContent=slot.case_code||"Case";
  $("collector-behavior-definition").textContent=packet.setup?.target_behavior_definition||"";
  $("collector-behavior-name").textContent="Student target behavior";
  $("preflight-targets").innerHTML=(packet.fidelity_targets||[]).map((target)=>`
    <article><span>${escapeHtml(target.domain||"Fidelity")}</span><strong>${escapeHtml(target.description)}</strong></article>
  `).join("")||'<p class="message">No active fidelity targets are available.</p>';

  ["session-preflight","collection-view","review-view","submitted-view"].forEach((id)=>$(id).hidden=true);
  const record=packet.record;

  if (slot.status==="completed" || slot.observation_id) {
    $("session-status").textContent="Completed";
    $("session-status-help").textContent="This scheduled session is linked to a finalized dissertation observation.";
    $("submitted-title").textContent="Observation completed";
    $("submitted-help").textContent="The session has been finalized and linked automatically.";
    $("submitted-view").hidden=false;
    return;
  }
  if (record?.status==="submitted") {
    $("session-status").textContent="Submitted";
    $("session-status-help").textContent=slot.secondary_role
      ?"Your independent record is locked while the paired observer finishes."
      :"Your record has been submitted.";
    $("submitted-title").textContent="Your observation is submitted";
    $("submitted-help").textContent=slot.secondary_role
      ?"No comparison is shown here. The system will pair the records after both observers submit."
      :"The observation is waiting for finalization.";
    $("submitted-view").hidden=false;
    return;
  }

  $("session-status").textContent=packet.ready_to_start?"Ready for collection":"Not ready";
  $("session-status-help").textContent=packet.ready_to_start
    ?"Review the case information, test the audible cue, then start."
    :"This session cannot start yet. Check clearance, date, phase, setup, and checklist status.";
  $("session-preflight").hidden=false;
  $("start-live-observation").disabled=!packet.ready_to_start;
  if (record?.status==="draft") {
    $("start-live-observation").disabled=false;
    $("start-live-observation").textContent="Resume Observation";
  } else {
    $("start-live-observation").textContent="Start Observation";
  }
}

async function ensureAudio() {
  if (!cueAudio) {
    cueAudio=new Audio("/assets/game/audio/magic-click.mp3");
    cueAudio.preload="auto";
    cueAudio.volume=1;
  }
  if (!audioContext) {
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if (AudioCtx) audioContext=new AudioCtx();
  }
  if (audioContext?.state!=="running") {
    try { await audioContext.resume(); } catch {}
  }
  return cueAudio;
}
async function beep() {
  const audio=await ensureAudio();

  if (audio) {
    try {
      audio.pause();
      audio.currentTime=0;
      audio.volume=1;
      await audio.play();
      return true;
    } catch {}
  }

  // Fallback if media playback is unavailable.
  const ctx=audioContext;
  if (!ctx || ctx.state!=="running") return false;
  const now=ctx.currentTime;
  const gain=ctx.createGain();
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.exponentialRampToValueAtTime(.18,now+.01);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.35);
  gain.connect(ctx.destination);
  for (const [offset,freq] of [[0,660],[.09,880],[.18,1175]]) {
    const osc=ctx.createOscillator();
    osc.type="triangle";
    osc.frequency.setValueAtTime(freq,now+offset);
    osc.connect(gain);
    osc.start(now+offset);
    osc.stop(now+offset+.16);
  }
  return true;
}

function blankIntervals() { return Array(REAL_SESSION.intervalCount).fill(null); }
function normalizeIntervals(values=[]) {
  const result=blankIntervals();
  values.slice(0,REAL_SESSION.intervalCount).forEach((value,index)=>{ result[index]=value||null; });
  return result;
}
function startCollectionState(record,fidelityOutcomes={}) {
  const savedElapsed=Math.min(REAL_SESSION.durationSeconds,Math.max(0,Number(record?.elapsed_seconds||0)));
  return {
    savedElapsed,
    runStartedAt:Date.now(),
    endedAt:null,
    fidelityScores:{...(record?.fidelity_scores||{})},
    fidelityOutcomes:{...(fidelityOutcomes||{})},
    intervals:normalizeIntervals(record?.interval_scores||[]),
    continuing:false,
    notObserved:false,
    lastInterval:Math.max(-1,Math.floor(savedElapsed/REAL_SESSION.intervalSeconds))
  };
}
async function beginCollection() {
  $("start-error").textContent="";
  await ensureAudio();
  let record=currentPacket.record;
  if (!record) {
    const result=await client.rpc("research_observer_start_observation",{target_slot_id:currentPacket.slot.id});
    if (result.error) { $("start-error").textContent=result.error.message; return; }
    record=result.data;
    currentPacket.record=record;
  }
  const outcomeResult=await client.rpc("research_observer_get_fidelity_outcomes",{target_slot_id:currentPacket.slot.id});
  if (outcomeResult.error) { $("start-error").textContent="Could not load saved desired-outcome ratings. Please try again."; return; }
  collection=startCollectionState(record,outcomeResult.data||{});
  $("session-preflight").hidden=true;
  $("review-view").hidden=true;
  $("submitted-view").hidden=true;
  $("collection-view").hidden=false;
  $("finish-collection").disabled=true;
  renderFidelity();
  tick();
  if (elapsedSeconds()<REAL_SESSION.durationSeconds) timer=setInterval(tick,250);
}

function elapsedSeconds() {
  const running=Math.max(0,Math.floor((Date.now()-collection.runStartedAt)/1000));
  return Math.min(REAL_SESSION.durationSeconds,collection.savedElapsed+running);
}
function currentIntervalIndex() {
  return Math.min(REAL_SESSION.intervalCount-1,Math.floor(elapsedSeconds()/REAL_SESSION.intervalSeconds));
}
function finalizeBoundaryThrough(activeIndex) {
  if (collection.lastInterval<0) collection.lastInterval=activeIndex;
  while (collection.lastInterval<activeIndex) {
    const index=collection.lastInterval;
    if (!collection.intervals[index]) {
      collection.intervals[index]=collection.notObserved?"not_observed":collection.continuing?"occurred":"did_not_occur";
    }
    collection.lastInterval+=1;
    if (collection.notObserved) collection.intervals[collection.lastInterval]="not_observed";
    else if (collection.continuing) collection.intervals[collection.lastInterval]="occurred";
    beep();
    queueSave();
  }
}
function tick() {
  if (!collection) return;
  const elapsed=elapsedSeconds();
  const index=currentIntervalIndex();
  finalizeBoundaryThrough(index);
  $("elapsed-clock").textContent=formatClock(elapsed);
  $("interval-number").textContent=String(index+1);
  $("target-occurred").classList.toggle("marked",collection.intervals[index]==="occurred");
  const within=elapsed%REAL_SESSION.intervalSeconds;
  $("interval-clock").textContent=elapsed>=REAL_SESSION.durationSeconds?"00:00":formatClock(within===0?REAL_SESSION.intervalSeconds:REAL_SESSION.intervalSeconds-within);
  $("finish-collection").disabled=elapsed<REAL_SESSION.durationSeconds;
  $("finish-collection").textContent=elapsed<REAL_SESSION.durationSeconds
    ? `End & Review at 30:00 (${formatClock(REAL_SESSION.durationSeconds-elapsed)} left)`
    : "End & Review Observation";
  if (elapsed>=REAL_SESSION.durationSeconds) finishCollection();
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer=null;
}
function renderFidelity() {
  const targets=currentPacket.fidelity_targets||[];
  const scored=targets.filter((t)=>collection.fidelityScores[t.id]).length;
  $("fidelity-progress").textContent=`${scored}/${targets.length} scored`;
  $("fidelity-list").innerHTML=targets.map((target)=> {
    const score=collection.fidelityScores[target.id];
    const outcome=collection.fidelityOutcomes[target.id]||"";
    return `<article class="fidelity-item">
      <div><span>${escapeHtml(target.domain||"Fidelity")}</span><strong>${escapeHtml(target.description)}</strong></div>
      <div class="fidelity-response">
        <div class="fidelity-buttons">
          <button type="button" data-target="${target.id}" data-score="implemented" class="${score==="implemented"?"selected":""}">Implemented as Written</button>
          <button type="button" data-target="${target.id}" data-score="not_implemented" class="${score==="not_implemented"?"selected":""}">Not Implemented as Written</button>
        </div>
        ${score==="implemented" ? `<div class="fidelity-outcome-prompt">
          <strong>Did it have the desired outcome on behavior?</strong>
          <div class="fidelity-outcome-actions">
            <button type="button" data-outcome-target="${target.id}" data-outcome="yes" class="${outcome==="yes"?"selected":""}">Yes</button>
            <button type="button" data-outcome-target="${target.id}" data-outcome="no" class="${outcome==="no"?"selected":""}">No</button>
            <button type="button" data-outcome-target="${target.id}" data-outcome="unclear" class="${outcome==="unclear"?"selected":""}">Not clear</button>
          </div>
        </div>` : ""}
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll(".fidelity-buttons button").forEach((button)=>button.addEventListener("click",()=>{
    collection.fidelityScores[button.dataset.target]=button.dataset.score;
    if (button.dataset.score!=="implemented") delete collection.fidelityOutcomes[button.dataset.target];
    renderFidelity();
    queueSave();
  }));
  document.querySelectorAll("[data-outcome-target]").forEach((button)=>button.addEventListener("click",()=>{
    collection.fidelityOutcomes[button.dataset.outcomeTarget]=button.dataset.outcome;
    renderFidelity();
    queueSave();
  }));
}
function setMode(which) {
  if (which==="continuing") {
    collection.continuing=!collection.continuing;
    if (collection.continuing) collection.notObserved=false;
  } else {
    collection.notObserved=!collection.notObserved;
    if (collection.notObserved) collection.continuing=false;
  }
  $("continuing-toggle").setAttribute("aria-pressed",String(collection.continuing));
  $("not-observed-toggle").setAttribute("aria-pressed",String(collection.notObserved));
  const index=currentIntervalIndex();
  if (collection.notObserved) collection.intervals[index]="not_observed";
  else if (collection.continuing) collection.intervals[index]="occurred";
  queueSave();
}
function markOccurred() {
  const index=currentIntervalIndex();
  collection.intervals[index]="occurred";
  collection.notObserved=false;
  $("not-observed-toggle").setAttribute("aria-pressed","false");
  $("target-occurred").classList.add("marked");
  queueSave();
}
function compactDraftIntervals() {
  const last=collection.intervals.reduce((idx,value,i)=>value?i:idx,-1);
  return last<0?[]:collection.intervals.slice(0,last+1);
}
function queueSave() {
  $("autosave-status").textContent="Saving…";
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer=setTimeout(saveDraft,450);
}
async function saveDraft() {
  if (!collection || currentPacket.record?.status==="submitted") return true;
  const [result,outcomeResult]=await Promise.all([
    client.rpc("research_observer_save_observation_draft",{
      target_slot_id:currentPacket.slot.id,
      target_fidelity_scores:collection.fidelityScores,
      target_interval_scores:compactDraftIntervals(),
      target_elapsed_seconds:elapsedSeconds()
    }),
    client.rpc("research_observer_save_fidelity_outcomes",{
      target_slot_id:currentPacket.slot.id,
      target_fidelity_outcomes:collection.fidelityOutcomes
    })
  ]);
  const hasError=Boolean(result.error||outcomeResult.error);
  $("autosave-status").textContent=hasError?"Autosave problem — keep this screen open":"Saved";
  return !hasError;
}
function finalizeCompletedIntervals() {
  for (let i=0;i<REAL_SESSION.intervalCount;i++) {
    if (!collection.intervals[i]) collection.intervals[i]=collection.notObserved?"not_observed":collection.continuing?"occurred":"did_not_occur";
  }
}
function finishCollection() {
  if (!collection || elapsedSeconds()<REAL_SESSION.durationSeconds) return;
  stopTimer();
  collection.savedElapsed=REAL_SESSION.durationSeconds;
  collection.runStartedAt=Date.now();
  collection.endedAt=new Date().toISOString();
  finalizeCompletedIntervals();
  saveDraft();
  $("collection-view").hidden=true;
  $("review-view").hidden=false;
  renderReview();
}
function renderReview(noteOverride) {
  const targets=currentPacket.fidelity_targets||[];
  const noteValue=noteOverride===undefined ? (currentPacket.record?.observation_note||"") : noteOverride;
  $("review-fidelity-list").innerHTML=targets.map((target)=>{
    const score=collection.fidelityScores[target.id]||"";
    const outcome=collection.fidelityOutcomes[target.id]||"";
    return `<article class="review-item">
      <strong>${escapeHtml(target.description)}</strong>
      <div class="review-controls">
        <select data-review-target="${target.id}">
          <option value="">Choose score</option>
          <option value="implemented"${score==="implemented"?" selected":""}>Implemented as Written</option>
          <option value="not_implemented"${score==="not_implemented"?" selected":""}>Not Implemented as Written</option>
          <option value="no_opportunity"${score==="no_opportunity"?" selected":""}>No Opportunity</option>
        </select>
        ${score==="implemented" ? `<div class="review-outcome-prompt ${outcome?"complete":""}">
          <strong>Desired outcome on behavior?</strong>
          <div class="fidelity-outcome-actions">
            <button type="button" data-review-outcome-target="${target.id}" data-outcome="yes" class="${outcome==="yes"?"selected":""}">Yes</button>
            <button type="button" data-review-outcome-target="${target.id}" data-outcome="no" class="${outcome==="no"?"selected":""}">No</button>
            <button type="button" data-review-outcome-target="${target.id}" data-outcome="unclear" class="${outcome==="unclear"?"selected":""}">Not clear</button>
          </div>
        </div>` : ""}
      </div>
    </article>`;
  }).join("");
  document.querySelectorAll("[data-review-target]").forEach((select)=>select.addEventListener("change",()=>{
    const note=$("observation-note").value;
    if (select.value) collection.fidelityScores[select.dataset.reviewTarget]=select.value;
    else delete collection.fidelityScores[select.dataset.reviewTarget];
    if (select.value!=="implemented") delete collection.fidelityOutcomes[select.dataset.reviewTarget];
    renderReview(note);
    queueSave();
  }));
  document.querySelectorAll("[data-review-outcome-target]").forEach((button)=>button.addEventListener("click",()=>{
    const note=$("observation-note").value;
    collection.fidelityOutcomes[button.dataset.reviewOutcomeTarget]=button.dataset.outcome;
    renderReview(note);
    queueSave();
  }));
  $("observation-note").value=noteValue;
  updateReviewSummary();
}
function updateReviewSummary() {
  const fidelity=calculateFidelity(collection.fidelityScores);
  const behavior=calculateStudentBehavior(collection.intervals);
  $("review-fidelity-percent").textContent=fidelity.percent==null?"—":`${fidelity.percent.toFixed(1)}%`;
  $("review-behavior-percent").textContent=behavior.percent==null?"—":`${behavior.percent.toFixed(1)}%`;
}
async function submitObservation() {
  $("review-error").textContent="";
  const targets=currentPacket.fidelity_targets||[];
  const missing=targets.filter((target)=>!collection.fidelityScores[target.id]);
  if (missing.length) {
    $("review-error").textContent=`Resolve all fidelity items before submitting (${missing.length} remaining).`;
    return;
  }
  const missingOutcomes=targets.filter((target)=>
    collection.fidelityScores[target.id]==="implemented" && !collection.fidelityOutcomes[target.id]
  );
  if (missingOutcomes.length) {
    $("review-error").textContent=`Rate the desired outcome for every item marked Implemented (${missingOutcomes.length} remaining).`;
    return;
  }
  const fidelity=calculateFidelity(collection.fidelityScores);
  const behavior=calculateStudentBehavior(collection.intervals);
  if (fidelity.scoreable===0) { $("review-error").textContent="At least one fidelity item must have an observable opportunity."; return; }
  if (behavior.observed===0) { $("review-error").textContent="At least one student-behavior interval must be observable."; return; }

  if (saveTimer) clearTimeout(saveTimer);
  const saved=await saveDraft();
  if (!saved) {
    $("review-error").textContent="The latest scores could not be saved. Please try again before submitting.";
    return;
  }

  $("submit-observation").disabled=true;
  $("submit-observation").textContent="Submitting…";
  const result=await client.rpc("research_observer_submit_observation",{
    target_slot_id:currentPacket.slot.id,
    target_fidelity_scores:collection.fidelityScores,
    target_interval_scores:collection.intervals,
    target_elapsed_seconds:REAL_SESSION.durationSeconds,
    target_collection_ended_at:collection.endedAt||new Date().toISOString(),
    target_observation_note:$("observation-note").value.trim()||null
  });
  $("submit-observation").disabled=false;
  $("submit-observation").textContent="Submit Observation";
  if (result.error) { $("review-error").textContent=result.error.message; return; }

  $("review-view").hidden=true;
  $("submitted-view").hidden=false;
  $("submitted-title").textContent=result.data.completed?"Observation completed":"Your observation is submitted";
  $("submitted-help").textContent=result.data.waiting_for_partner
    ?"Your record is locked. The paired observer still submits independently; the system will calculate agreement and finalize automatically after both are in."
    :"The scheduled session has been finalized and linked automatically.";
}
async function openTraining(event){
  event?.preventDefault();
  const {data:{session}}=await client.auth.getSession();
  if(!session){
    show("login-view");
    return;
  }
  sessionStorage.setItem(SESSION_HANDOFF_KEY,JSON.stringify({
    access_token:session.access_token,
    refresh_token:session.refresh_token
  }));
  window.location.assign(CANONICAL_ORIGIN+"/observe/");
}

async function requestPasswordSetup(event){
  event.preventDefault();
  const form=event.currentTarget;
  const email=String(new FormData(form).get("email")||"").trim().toLowerCase();
  const status=$("password-setup-status");
  status.textContent="";
  if(!email)return;
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;
  const redirectTo=CANONICAL_ORIGIN+"/set-password/";
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
  button.disabled=false;
  status.textContent=error
    ?"We couldn’t send the setup email. Check the address and try again."
    :"If that email is connected to an observer account, a secure password setup link is on the way.";
}

async function signOut() {
  stopTimer();
  await client.auth.signOut();
  show("login-view");
}

$("login-form").addEventListener("submit",async(event)=>{
  event.preventDefault();
  $("login-error").textContent="";
  const form=new FormData(event.currentTarget);
  const result=await client.auth.signInWithPassword({
    email:String(form.get("email")||"").trim(),
    password:String(form.get("password")||"")
  });
  if (result.error) { $("login-error").textContent="Sign-in failed. Check your email and password."; return; }
  loadPortal();
});
$("password-setup-request-form").addEventListener("submit",requestPasswordSetup);
document.querySelectorAll(".open-training-link").forEach((link)=>link.addEventListener("click",openTraining));
$("sign-out").addEventListener("click",signOut);
$("unauthorized-signout").addEventListener("click",signOut);
$("back-to-schedule").addEventListener("click",loadPortal);
$("submitted-back").addEventListener("click",loadPortal);
$("test-live-cue").addEventListener("click",beep);
$("start-live-observation").addEventListener("click",beginCollection);
$("target-occurred").addEventListener("click",markOccurred);
$("continuing-toggle").addEventListener("click",()=>setMode("continuing"));
$("not-observed-toggle").addEventListener("click",()=>setMode("notObserved"));
$("finish-collection").addEventListener("click",finishCollection);
$("resume-collection").addEventListener("click",()=>{
  $("review-view").hidden=true;
  $("collection-view").hidden=false;
  collection.savedElapsed=REAL_SESSION.durationSeconds;
  collection.runStartedAt=Date.now();
  tick();
});
$("submit-observation").addEventListener("click",submitObservation);

function start() {
  if (!window.supabase) {
    $("loading-view").innerHTML="<h1>Sign-in service did not load.</h1>";
    return;
  }
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  client.auth.onAuthStateChange((_event,session)=>{ if (!session) show("login-view"); });
  loadPortal();
}
if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
