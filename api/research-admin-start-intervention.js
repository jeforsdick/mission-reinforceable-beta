'use strict';

const { authorize, json, methodGuard, supabaseFetch } = require('./research-admin-server');
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;

module.exports=async function handler(request,response){
  if(methodGuard(request,response))return;
  try{
    const actor=await authorize(request);
    const body=request.body||{};
    if(!UUID_PATTERN.test(body.case_id||''))return json(response,400,{error:'Invalid case.'});
    if(!DATE_PATTERN.test(body.effective_date||''))return json(response,400,{error:'Valid intervention start date is required.'});
    if(typeof body.baseline_pattern_reviewed!=='boolean'||typeof body.recent_series_reviewed!=='boolean')
      return json(response,400,{error:'Baseline review confirmations are required.'});
    const note=String(body.decision_note||'').trim();
    if(!note||note.length>1000)return json(response,400,{error:'A brief visual-analysis decision note is required (1000 characters maximum).'});
    if(process.env.TEACHER_REMINDER_SYSTEM_ENABLED!=='true')
      return json(response,503,{error:'Production daily reminder delivery has not been enabled. Intervention cannot start until prompts can be delivered.'});

    const rpcResponse=await supabaseFetch('/rest/v1/rpc/research_admin_start_intervention',{
      method:'POST',
      body:JSON.stringify({
        target_case_id:body.case_id,
        target_effective_date:body.effective_date,
        target_baseline_pattern_reviewed:body.baseline_pattern_reviewed,
        target_recent_series_reviewed:body.recent_series_reviewed,
        target_decision_note:note,
        target_actor_id:actor.id
      })
    });
    const result=await rpcResponse.json().catch(()=>null);
    if(!rpcResponse.ok)return json(response,rpcResponse.status||400,{error:result?.message||'Intervention start failed'});
    return json(response,200,result);
  }catch(error){
    return json(response,error.status||500,{error:error.message||'Request failed'});
  }
};
