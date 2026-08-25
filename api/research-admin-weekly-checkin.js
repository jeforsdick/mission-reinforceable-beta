'use strict';
const server=require('./research-admin-server');
const weekly=require('../server/weekly-checkin-service');
async function handler(request,response){
 if(server.methodGuard(request,response))return;
 try{
  await server.authorize(request);
  const {participant_id,case_id,week_start}=request.body||{};
  if(!server.UUID_PATTERN?.test?.(participant_id)||!server.UUID_PATTERN?.test?.(case_id)||!/^\d{4}-\d{2}-\d{2}$/.test(week_start||'')) return server.json(response,400,{error:'Invalid request'});
  const raw=weekly.createRawToken(), token_hash=weekly.hashToken(raw);
  const rpc=await server.supabaseFetch('/rest/v1/rpc/research_admin_generate_weekly_checkin',{method:'POST',body:JSON.stringify({target_participant_id:participant_id,target_case_id:case_id,target_week_start:week_start,target_token_hash:token_hash})});
  if(!rpc.ok) return server.json(response,409,{error:'Weekly check-in could not be generated'});
  const origin=`${request.headers['x-forwarded-proto']||'https'}://${request.headers.host}`;
  return server.json(response,200,{qualtrics_url:weekly.buildQualtricsUrl(raw),completion_test_url:weekly.completionUrl(raw,origin),qualtrics_configured:Boolean(process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL),email_sent:false,message:'No email sent.'});
 }catch(error){return server.json(response,error.status||500,{error:error.status?error.message:'Weekly check-in generation failed'});}
}
module.exports=handler;
