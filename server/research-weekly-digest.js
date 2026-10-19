'use strict';
const crypto=require('node:crypto');
const {supabaseFetch}=require('../api/research-admin-server');
const {currentStudyWeek,loadWeeklySummary}=require('./weekly-recap-service');
const RECIPIENT='jess.olson@utah.edu';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function authorized(req){const secret=process.env.CRON_SECRET||'',supplied=String(req.headers?.authorization||'').replace(/^Bearer /,'');const a=Buffer.from(secret),b=Buffer.from(supplied);return Boolean(secret)&&a.length===b.length&&crypto.timingSafeEqual(a,b);}
async function api(path,opts={}){const r=await supabaseFetch(path,opts);if(!r.ok)throw Error('Research digest data request failed ('+r.status+')');return r.json();}
async function rowsForCase(caseId,caseCode,now){const v=await loadWeeklySummary(caseId,supabaseFetch,now);return {case_code:caseCode,missions:Number(v.missions_completed)||0,days:Number(v.days_practiced)||0,daily:Number(v.mission_mix?.daily)||0,mystery:Number(v.mission_mix?.mystery)||0,crisis:Number(v.mission_mix?.crisis)||0};}
async function digest(now=new Date(),testCase=null){
 const week=currentStudyWeek(now);
 let cases=[];
 if(testCase){
  if(!['CASE-069','CASE-100'].includes(testCase))throw Error('Test case not permitted');
  const records=await api('/rest/v1/cases?case_code=eq.'+encodeURIComponent(testCase)+'&select=id,case_code&limit=1');
  if(!records.length)throw Error('QA case not found');
  cases=records;
 }else{
  const candidates=await api('/rest/v1/rpc/eligible_weekly_teacher_recaps',{method:'POST',body:'{}'});
  const ids=new Map((candidates||[]).filter(c=>c.case_id&&c.participant_id).map(c=>[c.case_id,c.participant_code]));
  cases=[...ids].map(([id,code])=>({id,case_code:code}));
 }
 const rows=[];
 for(const c of cases){try{rows.push(await rowsForCase(c.id,c.case_code,now));}catch(e){rows.push({case_code:c.case_code,error:'Summary unavailable'});}}
 return {week,rows,is_test:Boolean(testCase)};
}
function compose(data){
 const {week,rows,is_test}=data;
 const total=rows.reduce((n,r)=>n+(r.missions||0),0);
 const title='Mission: Reinforceable — '+(is_test?'QA Preview · ':'')+'Weekly Research Digest';
 const intro='Week of '+week.week_start+' to '+week.week_end+' (Mountain Time)';
 const items=rows.length?rows.map(r=>r.error? r.case_code+': summary unavailable':r.case_code+': '+r.missions+' missions, '+r.days+' days practiced (Daily '+r.daily+', Mystery '+r.mystery+', Crisis '+r.crisis+')'):[ 'No eligible intervention dyads this week.' ];
 const text=[title,intro,'',rows.length+' dyad(s) · '+total+' missions recorded','',...items,'','Research follow-up: review participation and check-in completion in Research Admin.','This email contains no student name, individual responses, fidelity observations or personalized weekly survey links.'].join('\n');
 const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#28334c"><h2>'+esc(title)+'</h2><p>'+esc(intro)+'</p><p><strong>'+rows.length+' dyad(s) · '+total+' missions</strong></p><ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><p>Research follow-up: review participation and check-in completion in Research Admin.</p><p style="font-size:12px;color:#677">No identifiable student information or personalized survey links.</p></div>';
 return {subject:title,html,text};
}
async function send(data){
 const message=compose(data);
 const key='research-weekly-digest/'+data.week.week_start+(data.is_test?'/test':'');
 const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:process.env.RESEARCH_DIGEST_SENDER||process.env.WEEKLY_RECAP_FROM||'Mission: Reinforceable <noreply@missionreinforceable.com>',to:[RECIPIENT],...message})});
 const response=await resp.json().catch(()=>null);if(!resp.ok||!response?.id)throw Error('Digest email send failed');return {sent:true,provider_message_id:response.id};
}
module.exports={RECIPIENT,authorized,digest,compose,send};
