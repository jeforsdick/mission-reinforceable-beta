'use strict';

// QA-only mail delivery: same teacher-facing templates and normal cron cadence,
// separate opt-in, events and weekly data from all dissertation participants.
const { supabaseFetch } = require('../api/research-admin-server');
const { authorized } = require('./teacher-reminder-service');
const { isEligibleStudyDay } = require('./granite-study-calendar');
const { buildMissionReminderEmail } = require('./mission-reminder-email');
const { buildWeeklyRecapEmail } = require('./weekly-recap-email');
const weeklyCheckin = require('./weekly-checkin-service');
const { denverDate, eligibleStudyDays } = require('./weekly-recap-service');

const KINDS = Object.freeze({ DAILY: 'daily', WEEKLY: 'weekly' });

function mondayFor(date) {
  const d = new Date(date + 'T12:00:00Z');
  const weekday = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - weekday + 1);
  return d.toISOString().slice(0,10);
}
function fridayFor(date) {
  const monday = new Date(mondayFor(date) + 'T12:00:00Z');
  monday.setUTCDate(monday.getUTCDate()+4);
  return monday.toISOString().slice(0,10);
}
function weekNumberSinceFirstAccess(recordedAt,date) {
  if (!recordedAt) return 1;
  const start = new Date(mondayFor(recordedAt.slice(0,10)) + 'T12:00:00Z');
  const current = new Date(mondayFor(date) + 'T12:00:00Z');
  return Math.max(1,Math.floor((current - start) / (7*24*60*60*1000)) + 1);
}
function configurationReady() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.RESEND_API_KEY && process.env.TEACHER_REMINDER_FROM_EMAIL
    && process.env.TEACHER_GAME_URL && process.env.CRON_SECRET
  ) && weeklyCheckin.qualtricsConfiguration().configured;
}
async function db(path,options={}) {
  const result = await supabaseFetch(path,options);
  const content = await result.json().catch(()=>null);
  if(!result.ok) throw new Error('QA mail database request failed');
  return content;
}
async function getCandidates() {
  return db('/rest/v1/rpc/eligible_qa_teacher_emails',{method:'POST',body:'{}'});
}
async function firstQaAccessAt(caseId) {
  const list = await db('/rest/v1/research_qa_game_access_events?case_id=eq.'+
    encodeURIComponent(caseId)+'&enabled=eq.true&select=recorded_at&order=recorded_at.asc&limit=1');
  return list?.[0]?.recorded_at || null;
}
async function claim(candidate,kind,date) {
  const result = await db('/rest/v1/rpc/claim_qa_teacher_email_event',{
    method:'POST',
    body:JSON.stringify({
      target_participant_id:candidate.participant_id,
      target_case_id:candidate.case_id,
      target_email_type:kind,
      target_study_date:date
    })
  });
  return result?.[0] || null;
}
async function updateEvent(id,values) {
  const result = await supabaseFetch('/rest/v1/qa_teacher_email_events?id=eq.'+encodeURIComponent(id),{
    method:'PATCH',headers:{Prefer:'return=minimal'},
    body:JSON.stringify({...values,updated_at:new Date().toISOString()})
  });
  if(!result.ok) throw new Error('QA email delivery could not be recorded.');
}
async function compose(candidate,kind,date) {
  if(kind===KINDS.DAILY) {
    const body=buildMissionReminderEmail(process.env.TEACHER_GAME_URL,candidate.teacher_name);
    return {...body,subject:'[QA] '+body.subject};
  }
  if(kind!==KINDS.WEEKLY) throw new Error('Unknown QA email kind');
  const monday=mondayFor(date), friday=fridayFor(date);
  const recap=await db('/rest/v1/rpc/research_admin_qa_weekly_game_summary',{
    method:'POST',body:JSON.stringify({target_case_id:candidate.case_id,target_week_start:monday})
  });
  const rawToken=weeklyCheckin.createRawToken();
  await db('/rest/v1/rpc/generate_qa_teacher_weekly_checkin',{
    method:'POST',
    body:JSON.stringify({
      target_participant_id:candidate.participant_id,
      target_case_id:candidate.case_id,
      target_week_start:monday,
      target_token_hash:weeklyCheckin.hashToken(rawToken)
    })
  });
  const start=await firstQaAccessAt(candidate.case_id);
  const weekNumber=weekNumberSinceFirstAccess(start,date);
  const secureUrl=weeklyCheckin.buildQualtricsUrl(rawToken,candidate.participant_code,weekNumber);
  if(!secureUrl) throw new Error('Weekly QA check-in URL could not be built.');
  const summary={...recap,eligible_study_days:eligibleStudyDays({week_start:monday,week_end:friday})};
  const body=buildWeeklyRecapEmail({
    summary,weeklyQualtricsUrl:secureUrl,
    teacherName:candidate.teacher_name,assetOrigin:process.env.TEACHER_GAME_URL
  });
  return {...body,subject:'[QA] '+body.subject};
}
async function sendToCandidate(candidate,kind,date) {
  const claimed=await claim(candidate,kind,kind===KINDS.WEEKLY?fridayFor(date):date);
  if(!claimed?.claimed || !claimed.event_id) return {outcome:'already_sent_or_claimed'};
  const id=claimed.event_id;
  try {
    const email=await compose(candidate,kind,date);
    const sent=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+process.env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':'qa-teacher-email/'+candidate.participant_id+'/'+kind+'/'+(kind===KINDS.WEEKLY?fridayFor(date):date)
      },
      body:JSON.stringify({
        from:process.env.TEACHER_REMINDER_FROM_EMAIL,
        to:[candidate.teacher_email],
        subject:email.subject,html:email.html,text:email.text
      })
    });
    const provider=await sent.json().catch(()=>null);
    if(!sent.ok || !provider?.id) throw new Error('Resend rejected QA email');
    await updateEvent(id,{status:'sent',provider_message_id:provider.id});
    return {outcome:'sent',message_id:provider.id};
  } catch(error){
    try {await updateEvent(id,{status:'failed'});}catch(updateError){
      console.error('QA mail event update failed:',updateError.message);
    }
    console.error('QA email delivery failed:',{type:kind,case_id:candidate.case_id,error:error.message});
    return {outcome:'failed'};
  }
}
async function deliver(kind,{caseId=null,manual=false,now=new Date()}={}) {
  if(!Object.values(KINDS).includes(kind)) throw new Error('Unknown QA email type.');
  if(!configurationReady()) throw new Error('QA email provider and survey configuration incomplete.');
  const date=denverDate(now);
  const friday=new Date(date+'T12:00:00Z').getUTCDay()===5;
  if(!manual && (kind===KINDS.DAILY && !isEligibleStudyDay(date) || kind===KINDS.WEEKLY && !friday)) {
    return {eligible:false,study_date:date,sent:0,skipped:0,failed:0};
  }
  const eligible=await getCandidates();
  const candidates=caseId?eligible.filter(c=>c.case_id===caseId):eligible;
  if(caseId && candidates.length!==1) throw new Error('QA email requires an opted-in, reviewed test teacher with QA game access.');
  const result={eligible:true,study_date:date,sent:0,skipped:0,failed:0};
  for(const candidate of candidates){
    const delivery=await sendToCandidate(candidate,kind,date);
    if(delivery.outcome==='sent') result.sent++;
    else if(delivery.outcome==='failed')result.failed++;
    else result.skipped++;
  }
  return result;
}
function createQaCronHandler(kind) {
  return async (request,response)=>{
    if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({error:'Method not allowed'});}
    if(!authorized(request.headers?.authorization,process.env.CRON_SECRET))return response.status(401).json({error:'Unauthorized'});
    try {
      const result=await deliver(kind);
      return response.status(result.failed?502:200).json(result);
    } catch(error){
      console.error('QA cron email delivery unavailable:',error.message);
      return response.status(502).json({error:'QA email job unavailable'});
    }
  };
}
module.exports={KINDS,mondayFor,fridayFor,weekNumberSinceFirstAccess,configurationReady,deliver,createQaCronHandler};
