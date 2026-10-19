'use strict';
const crypto=require('node:crypto');
const {supabaseFetch}=require('../api/research-admin-server');
const {SENDER}=require('./mission-reminder-email');
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
  const sessions=await api('/rest/v1/game_sessions?case_id=eq.'+encodeURIComponent(records[0].id)+'&qa_mode=eq.true&status=eq.completed&select=mode,ended_at');
  const mix={daily:0,mystery:0,crisis:0};
  sessions.forEach(row=>{const m=row.mode==='wild'?'mystery':row.mode;if(Object.hasOwn(mix,m))mix[m]++;});
  const dates=new Set(sessions.filter(row=>row.ended_at).map(row=>String(row.ended_at).slice(0,10)));
  return {week,rows:[{case_code:testCase,missions:sessions.length,days:dates.size,daily:mix.daily,mystery:mix.mystery,crisis:mix.crisis}],is_test:true,note:'QA sessions across available case history; not study-week eligible activity'};
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
 const title='Mission: Reinforceable — Weekly Coaching & Research Digest';
 const label=is_test?'Illustrative coaching scenario · CASE-069 activity is simulated for preview':'Week of '+week.week_start+' – '+week.week_end;
 const total=rows.reduce((n,r)=>n+(r.missions||0),0);
 const card=(r)=>{
  const mix=[['Daily',r.daily,'#7654ac'],['Mystery',r.mystery,'#d59a40'],['Crisis',r.crisis,'#bf706b']];
  const max=Math.max(1,...mix.map(m=>m[1]));
  const bars=mix.map(([name,count,color])=>'<tr><td style="width:90px;padding:8px 5px;font-size:13px">'+name+'</td><td style="padding:8px 5px;width:100%"><div style="background:#eee8f2;border-radius:7px;height:16px"><div style="height:16px;width:'+Math.round(100*count/max)+'%;background:'+color+';border-radius:7px"></div></div></td><td style="padding:8px 5px;text-align:right;font-weight:bold">'+count+'</td></tr>').join('');
  return '<section style="border:1px solid #d9d0e4;border-radius:15px;padding:20px;margin:18px 0;background:#fffdf8"><h2 style="margin:0 0 14px;color:#55317c">'+esc(r.case_code)+'</h2>'+
   '<table role="presentation" style="width:100%;text-align:center"><tr><td style="padding:12px;background:#f0e9f6"><strong style="font-size:28px">'+r.missions+'</strong><br><small>Missions completed</small></td><td style="padding:12px;background:#fff1d6"><strong style="font-size:28px">'+r.days+'</strong><br><small>Days practiced</small></td></tr></table>'+
   '<h3 style="font-size:15px;margin-top:20px">Mission activity by type</h3><table role="presentation" style="width:100%">'+bars+'</table>'+
   '<h3 style="font-size:15px">Coaching conversation starters</h3><ul style="padding-left:23px;line-height:1.6"><li>Which plan component has felt easiest to put into practice this week?</li><li>Is there a strategy you would like to rehearse, model, or troubleshoot together?</li><li>What would make the next opportunity to use the plan easier during instruction?</li></ul>'+
   '<p style="background:#f5f1fa;padding:12px;border-radius:9px"><strong>Coaching move:</strong> Ask the teacher to identify one realistic situation coming up next week. Review the relevant BSP step together, then offer specific feedback after the next natural opportunity.</p>'+
   '<p style="font-size:12px;color:#716c79">Mission completions represent game participation—not observed classroom implementation, mastery, or improved student outcomes.</p></section>';
 };
 const safeRows=rows.filter(r=>!r.error);
 const html='<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:auto;padding:20px;color:#332c40;background:#f8f5fb"><div style="background:#60388c;padding:17px;color:#fff;text-align:center;font-size:19px;font-weight:bold">MISSION: REINFORCEABLE</div><div style="padding:22px;background:white"><h1 style="font-size:25px;margin:0 0 6px">Weekly Coaching & Research Digest</h1><p style="color:#686173;margin:0">'+esc(label)+'</p><p style="margin-top:20px">Here is recent mission engagement, along with discussion prompts you can use during an existing coaching contact.</p><p><strong>'+safeRows.length+' dyad(s) · '+total+' missions completed</strong></p>'+safeRows.map(card).join('')+(safeRows.length?'':'<p>No eligible intervention dyads this week.</p>')+'<p style="font-size:13px"><strong>Research check:</strong> Review observation trends and weekly check-ins separately in Research Admin. Do not infer classroom fidelity from gameplay volume.</p><p style="font-size:12px;color:#716c79">Researcher-only. No teacher survey links or confidential student details are included.'+(is_test?' This scenario is for visual review, not a real teacher coaching record.':'')+'</p></div></div>';
 const body=[title,label,'',safeRows.length+' dyads · '+total+' missions',...safeRows.flatMap(r=>['',r.case_code+': '+r.missions+' missions on '+r.days+' days','Daily '+r.daily+' · Mystery '+r.mystery+' · Crisis '+r.crisis,'Coaching prompts:','- Which BSP step felt easiest?','- Which step could benefit from modeling?','- What instructional routine should we plan for next week?','Coaching move: review one upcoming opportunity, rehearse the plan step, and offer feedback.']),'','Mission participation is not evidence of classroom implementation.'].join('\n');
 return {subject:title+(is_test?' [Illustrative Example]':''),html,text:body};
}
async function send(data){
 const message=compose(data);
 const key='research-weekly-digest/'+data.week.week_start+(data.is_test?'/test':'');
 const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:SENDER,to:[RECIPIENT],...message})});
 const response=await resp.json().catch(()=>null);if(!resp.ok||!response?.id)throw Error('Digest email send failed');return {sent:true,provider_message_id:response.id};
}
module.exports={RECIPIENT,authorized,digest,compose,send};
