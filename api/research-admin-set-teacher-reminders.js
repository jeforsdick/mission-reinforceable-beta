'use strict';

const { authorize, json, methodGuard, supabaseFetch } = require('./research-admin-server');
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports=async function handler(request,response){
  if(methodGuard(request,response))return;
  try{
    const actor=await authorize(request);
    const body=request.body||{}, keys=Object.keys(body).sort();
    if(keys.length!==2||keys[0]!=='case_id'||keys[1]!=='enabled'||!UUID_PATTERN.test(body.case_id)||typeof body.enabled!=='boolean')
      return json(response,400,{error:'Exactly case_id and enabled are required.'});
    if(body.enabled&&process.env.TEACHER_REMINDER_SYSTEM_ENABLED!=='true')
      return json(response,503,{error:'Production email delivery has not been enabled.'});
    const rpcResponse=await supabaseFetch('/rest/v1/rpc/research_admin_set_teacher_reminders',{
      method:'POST',body:JSON.stringify({target_case_id:body.case_id,target_enabled:body.enabled,target_actor_id:actor.id})
    });
    const result=await rpcResponse.json().catch(()=>null);
    if(!rpcResponse.ok)return json(response,rpcResponse.status||400,{error:result?.message||'Reminder setting update failed'});
    return json(response,200,result);
  }catch(error){return json(response,error.status||500,{error:error.message||'Request failed'});}
};
